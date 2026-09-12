import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';

const STORAGE_KEY = 'mypdfnotes_r2_config';
const PDF_PREFIX = 'pdf/';
const METADATA_KEY = 'pdf-metadata.json';

// ── Configuration & Credentials ─────────────────────────────────────
export function getEnvR2Config() {
  return {
    accountId: (import.meta.env.VITE_R2_ACCOUNT_ID || '').trim(),
    accessKeyId: (import.meta.env.VITE_R2_ACCESS_KEY_ID || '').trim(),
    secretAccessKey: (import.meta.env.VITE_R2_SECRET_ACCESS_KEY || '').trim(),
    bucketName: (import.meta.env.VITE_R2_BUCKET_NAME || '').trim(),
    publicUrl: (import.meta.env.VITE_R2_PUBLIC_URL || '').trim().replace(/\/+$/, ''),
  };
}

export function getR2Config() {
  try {
    const localStr = localStorage.getItem(STORAGE_KEY);
    if (localStr) {
      const parsed = JSON.parse(localStr);
      if (parsed.accountId && parsed.accessKeyId && parsed.secretAccessKey && parsed.bucketName) {
        return {
          accountId: (parsed.accountId || '').trim(),
          accessKeyId: (parsed.accessKeyId || '').trim(),
          secretAccessKey: (parsed.secretAccessKey || '').trim(),
          bucketName: (parsed.bucketName || '').trim(),
          publicUrl: (parsed.publicUrl || '').trim().replace(/\/+$/, ''),
        };
      }
    }
  } catch {
    // ignore parse error
  }
  return getEnvR2Config();
}

export function setR2Config(config) {
  if (config && config.accountId && config.accessKeyId && config.secretAccessKey && config.bucketName) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      accountId: config.accountId.trim(),
      accessKeyId: config.accessKeyId.trim(),
      secretAccessKey: config.secretAccessKey.trim(),
      bucketName: config.bucketName.trim(),
      publicUrl: (config.publicUrl || '').trim().replace(/\/+$/, ''),
    }));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function hasR2Config() {
  const cfg = getR2Config();
  return !!(cfg.accountId && cfg.accessKeyId && cfg.secretAccessKey && cfg.bucketName);
}

export function hasEnvR2Config() {
  const env = getEnvR2Config();
  return !!(env.accountId && env.accessKeyId && env.secretAccessKey && env.bucketName);
}

export function isUsingEnvR2() {
  const local = localStorage.getItem(STORAGE_KEY);
  return !local && hasEnvR2Config();
}

// ── S3 Client Instance ──────────────────────────────────────────────
let cachedClient = null;
let cachedConfigKey = '';

function getS3Client() {
  const cfg = getR2Config();
  if (!cfg.accountId || !cfg.accessKeyId || !cfg.secretAccessKey || !cfg.bucketName) {
    throw new Error('Cloudflare R2 is not configured. Please enter your R2 credentials in Settings or .env');
  }

  const key = `${cfg.accountId}_${cfg.accessKeyId}_${cfg.bucketName}`;
  if (cachedClient && cachedConfigKey === key) {
    return { client: cachedClient, bucketName: cfg.bucketName, publicUrl: cfg.publicUrl };
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });

  cachedClient = client;
  cachedConfigKey = key;
  return { client, bucketName: cfg.bucketName, publicUrl: cfg.publicUrl };
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + ' ' + sizes[i];
}

// ── Validate Connection ─────────────────────────────────────────────
export async function validateR2Connection(customConfig = null) {
  try {
    let client;
    let bucketName;
    if (customConfig) {
      if (!customConfig.accountId || !customConfig.accessKeyId || !customConfig.secretAccessKey || !customConfig.bucketName) {
        return { valid: false, error: 'Missing required configuration fields' };
      }
      client = new S3Client({
        region: 'auto',
        endpoint: `https://${customConfig.accountId.trim()}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: customConfig.accessKeyId.trim(),
          secretAccessKey: customConfig.secretAccessKey.trim(),
        },
      });
      bucketName = customConfig.bucketName.trim();
    } else {
      const s3 = getS3Client();
      client = s3.client;
      bucketName = s3.bucketName;
    }

    // Attempt to list 1 item to check credentials and bucket permissions
    const cmd = new ListObjectsV2Command({
      Bucket: bucketName,
      MaxKeys: 1,
    });
    await client.send(cmd);
    return { valid: true };
  } catch (err) {
    console.error('R2 validation error:', err);
    return { valid: false, error: err.message || 'Failed to connect to Cloudflare R2' };
  }
}

// ── Fetch List of PDFs from R2 Bucket ───────────────────────────────
export async function fetchPdfList() {
  const { client, bucketName, publicUrl } = getS3Client();

  const cmd = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: PDF_PREFIX,
  });

  const response = await client.send(cmd);
  const contents = response.Contents || [];

  return contents
    .filter(obj => obj.Key && obj.Key.toLowerCase().endsWith('.pdf') && obj.Key !== PDF_PREFIX)
    .map(obj => {
      const fileName = obj.Key.replace(PDF_PREFIX, '');
      const downloadUrl = publicUrl ? `${publicUrl}/${PDF_PREFIX}${encodeURIComponent(fileName)}` : '';
      return {
        fileName,
        key: obj.Key,
        sha: obj.ETag?.replace(/"/g, '') || obj.Key,
        sizeBytes: obj.Size || 0,
        sizeFormatted: formatFileSize(obj.Size || 0),
        downloadUrl,
        lastModified: obj.LastModified ? new Date(obj.LastModified).toISOString() : new Date().toISOString(),
      };
    });
}

// ── Fetch metadata JSON from R2 Bucket ──────────────────────────────
export async function fetchMetadata() {
  const { client, bucketName } = getS3Client();

  try {
    const cmd = new GetObjectCommand({
      Bucket: bucketName,
      Key: METADATA_KEY,
    });
    const response = await client.send(cmd);
    const bodyString = await response.Body.transformToString();
    const data = JSON.parse(bodyString);
    return { data, sha: response.ETag?.replace(/"/g, '') || null };
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return { data: {}, sha: null };
    }
    console.warn('Metadata fetch error (fallback to empty):', err);
    return { data: {}, sha: null };
  }
}

// ── Save metadata JSON to R2 Bucket ─────────────────────────────────
export async function saveMetadata(metadata) {
  const { client, bucketName } = getS3Client();

  const body = JSON.stringify(metadata, null, 2);
  const cmd = new PutObjectCommand({
    Bucket: bucketName,
    Key: METADATA_KEY,
    Body: body,
    ContentType: 'application/json; charset=utf-8',
  });

  const res = await client.send(cmd);
  return res.ETag?.replace(/"/g, '') || null;
}

// ── Upload a PDF file to R2 ─────────────────────────────────────────
export async function uploadPdf(file) {
  const { client, bucketName, publicUrl } = getS3Client();

  let fileName = file.name;
  if (!fileName.toLowerCase().endsWith('.pdf')) {
    fileName += '.pdf';
  }
  fileName = fileName.replace(/[<>:"/\\|?*]/g, '_');

  const fileKey = `${PDF_PREFIX}${fileName}`;

  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  const cmd = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
    Body: uint8Array,
    ContentType: 'application/pdf',
  });

  const res = await client.send(cmd);
  const downloadUrl = publicUrl ? `${publicUrl}/${PDF_PREFIX}${encodeURIComponent(fileName)}` : '';

  return {
    fileName,
    key: fileKey,
    sha: res.ETag?.replace(/"/g, '') || fileName,
    sizeBytes: file.size,
    sizeFormatted: formatFileSize(file.size),
    downloadUrl,
  };
}

// ── Delete a PDF from R2 ────────────────────────────────────────────
export async function deletePdf(fileName) {
  const { client, bucketName } = getS3Client();
  const fileKey = `${PDF_PREFIX}${fileName}`;

  const cmd = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
  });

  await client.send(cmd);
}

// ── Rename / Update PDF Details in R2 ───────────────────────────────
export async function updatePdfDetails(oldFileName, newFileName, details) {
  const { client, bucketName } = getS3Client();
  let updatedFileName = oldFileName;

  // If filename changed, copy object to new key and delete old key
  if (newFileName && newFileName.trim() && newFileName.trim() !== oldFileName) {
    let cleanNewName = newFileName.trim();
    if (!cleanNewName.toLowerCase().endsWith('.pdf')) {
      cleanNewName += '.pdf';
    }
    cleanNewName = cleanNewName.replace(/[<>:"/\\|?*]/g, '_');

    const oldKey = `${PDF_PREFIX}${oldFileName}`;
    const newKey = `${PDF_PREFIX}${cleanNewName}`;

    // 1. Copy object
    const copyCmd = new CopyObjectCommand({
      Bucket: bucketName,
      CopySource: `${bucketName}/${oldKey}`,
      Key: newKey,
      ContentType: 'application/pdf',
    });
    await client.send(copyCmd);

    // 2. Delete old object
    const deleteCmd = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: oldKey,
    });
    await client.send(deleteCmd);

    revokePdfBlobUrl(oldFileName);
    updatedFileName = cleanNewName;
  }

  // 3. Update metadata
  const { data: currentMetadata } = await fetchMetadata();
  const newMetadata = { ...currentMetadata };
  const existingEntry = newMetadata[oldFileName] || {};

  if (updatedFileName !== oldFileName) {
    delete newMetadata[oldFileName];
  }

  newMetadata[updatedFileName] = {
    ...existingEntry,
    title: details.title ?? existingEntry.title ?? '',
    subject: details.subject ?? existingEntry.subject ?? 'Notes',
    tags: details.tags ?? existingEntry.tags ?? ['Notes'],
    userNotes: details.userNotes ?? existingEntry.userNotes ?? '',
    isFavorite: details.isFavorite ?? existingEntry.isFavorite ?? false,
    lastReadPage: details.lastReadPage ?? existingEntry.lastReadPage ?? 1,
    createdAt: existingEntry.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const savedSha = await saveMetadata(newMetadata);

  return {
    updatedFileName,
    metadata: newMetadata,
    metadataSha: savedSha,
  };
}

// ── Blob URL Cache & PDF Streamer ───────────────────────────────────
const blobUrlCache = new Map();

export async function fetchPdfBlobUrl(fileName) {
  if (blobUrlCache.has(fileName)) {
    return blobUrlCache.get(fileName);
  }

  const { client, bucketName, publicUrl } = getS3Client();

  // If public URL is provided, try direct blob fetch
  if (publicUrl) {
    try {
      const publicFetchUrl = `${publicUrl}/${PDF_PREFIX}${encodeURIComponent(fileName)}`;
      const res = await fetch(publicFetchUrl);
      if (res.ok) {
        const blob = await res.blob();
        const pdfBlob = new Blob([blob], { type: 'application/pdf' });
        const url = URL.createObjectURL(pdfBlob);
        blobUrlCache.set(fileName, url);
        return url;
      }
    } catch {
      // fallback to S3 GetObject
    }
  }

  // Stream via S3 GetObjectCommand
  const cmd = new GetObjectCommand({
    Bucket: bucketName,
    Key: `${PDF_PREFIX}${fileName}`,
  });

  const response = await client.send(cmd);
  const byteArray = await response.Body.transformToByteArray();
  const pdfBlob = new Blob([byteArray], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(pdfBlob);
  blobUrlCache.set(fileName, blobUrl);
  return blobUrl;
}

export function revokePdfBlobUrl(fileName) {
  if (blobUrlCache.has(fileName)) {
    URL.revokeObjectURL(blobUrlCache.get(fileName));
    blobUrlCache.delete(fileName);
  }
}

// ── Merge File List with Metadata ───────────────────────────────────
export function mergePdfsWithMetadata(fileList, metadata) {
  return fileList.map(file => {
    const meta = metadata[file.fileName] || {};
    const baseName = file.fileName.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ');
    const readableTitle = baseName.replace(/\b\w/g, c => c.toUpperCase());

    return {
      fileName: file.fileName,
      sha: file.sha,
      title: meta.title || readableTitle,
      subject: meta.subject || 'Notes',
      tags: meta.tags || ['Notes'],
      isFavorite: !!meta.isFavorite,
      lastReadPage: meta.lastReadPage || 1,
      userNotes: meta.userNotes || '',
      sizeBytes: file.sizeBytes,
      sizeFormatted: file.sizeFormatted,
      downloadUrl: file.downloadUrl,
      createdAt: meta.createdAt || file.lastModified || new Date().toISOString(),
      updatedAt: meta.updatedAt || file.lastModified || new Date().toISOString(),
    };
  });
}
