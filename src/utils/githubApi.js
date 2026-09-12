// GitHub Contents API wrapper for PDF storage
// All PDFs are stored in the `pdf/` directory of the repo
// Metadata is stored in `pdf-metadata.json` at the repo root

const OWNER = 'HarshitOnLoop';
const REPO = 'mypdfnotes';
const BRANCH = 'main';
const API_BASE = 'https://api.github.com';
const PDF_DIR = 'pdf';
const METADATA_FILE = 'pdf-metadata.json';

// ── Token management ────────────────────────────────────────────────
const TOKEN_KEY = 'mypdfnotes_github_token';

export function getEnvToken() {
  return (import.meta.env.VITE_GITHUB_TOKEN || '').trim();
}

export function getToken() {
  const local = localStorage.getItem(TOKEN_KEY);
  if (local && local.trim()) return local.trim();
  return getEnvToken();
}

export function setToken(token) {
  if (token && token.trim()) {
    localStorage.setItem(TOKEN_KEY, token.trim());
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function hasToken() {
  return !!getToken();
}

export function hasEnvToken() {
  return !!getEnvToken();
}

export function isUsingEnvToken() {
  const local = localStorage.getItem(TOKEN_KEY);
  return (!local || !local.trim()) && !!getEnvToken();
}

// ── Helpers ─────────────────────────────────────────────────────────
function headers() {
  const token = getToken();
  if (!token) throw new Error('GitHub token not configured. Please add VITE_GITHUB_TOKEN to .env or settings.');
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + ' ' + sizes[i];
}

// Convert File / Blob to base64 smoothly using native FileReader
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

// ── Validate token ──────────────────────────────────────────────────
export async function validateToken() {
  try {
    const res = await fetch(`${API_BASE}/repos/${OWNER}/${REPO}`, {
      headers: headers(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Fetch list of PDFs from repo ────────────────────────────────────
export async function fetchPdfList() {
  const res = await fetch(
    `${API_BASE}/repos/${OWNER}/${REPO}/contents/${PDF_DIR}?ref=${BRANCH}&t=${Date.now()}`,
    { headers: headers() }
  );

  if (res.status === 404) {
    return [];
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API error: ${res.status}`);
  }

  const files = await res.json();

  return files
    .filter(f => f.type === 'file' && f.name.toLowerCase().endsWith('.pdf'))
    .map(f => ({
      fileName: f.name,
      sha: f.sha,
      sizeBytes: f.size,
      sizeFormatted: formatFileSize(f.size),
      downloadUrl: f.download_url,
      path: f.path,
    }));
}

// ── Fetch metadata JSON from repo ───────────────────────────────────
export async function fetchMetadata() {
  const res = await fetch(
    `${API_BASE}/repos/${OWNER}/${REPO}/contents/${METADATA_FILE}?ref=${BRANCH}&t=${Date.now()}`,
    { headers: headers() }
  );

  if (res.status === 404) {
    return { data: {}, sha: null };
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API error: ${res.status}`);
  }

  const file = await res.json();
  const content = atob(file.content.replace(/\n/g, ''));
  try {
    const data = JSON.parse(decodeURIComponent(escape(content)));
    return { data, sha: file.sha };
  } catch {
    try {
      const data = JSON.parse(content);
      return { data, sha: file.sha };
    } catch {
      return { data: {}, sha: file.sha };
    }
  }
}

// ── Save metadata JSON to repo with automatic conflict retry ────────
export async function saveMetadata(metadata, knownSha = null) {
  let currentSha = knownSha;
  if (!currentSha) {
    try {
      const existing = await fetchMetadata();
      currentSha = existing.sha;
    } catch {
      // ignore
    }
  }

  const content = btoa(unescape(encodeURIComponent(JSON.stringify(metadata, null, 2))));

  const body = {
    message: 'Update pdf-metadata.json',
    content,
    branch: BRANCH,
  };
  if (currentSha) body.sha = currentSha;

  let res = await fetch(
    `${API_BASE}/repos/${OWNER}/${REPO}/contents/${METADATA_FILE}`,
    {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(body),
    }
  );

  // If 409 conflict, retry once with latest SHA
  if (res.status === 409) {
    const latest = await fetchMetadata();
    if (latest.sha) {
      body.sha = latest.sha;
      res = await fetch(
        `${API_BASE}/repos/${OWNER}/${REPO}/contents/${METADATA_FILE}`,
        {
          method: 'PUT',
          headers: headers(),
          body: JSON.stringify(body),
        }
      );
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to save metadata: ${res.status}`);
  }

  const result = await res.json();
  return result.content.sha;
}

// ── Upload a PDF file to repo ───────────────────────────────────────
export async function uploadPdf(file) {
  const base64Content = await fileToBase64(file);

  let fileName = file.name;
  if (!fileName.toLowerCase().endsWith('.pdf')) {
    fileName += '.pdf';
  }
  fileName = fileName.replace(/[<>:"/\\|?*]/g, '_');

  // Check if file already exists
  try {
    const checkRes = await fetch(
      `${API_BASE}/repos/${OWNER}/${REPO}/contents/${PDF_DIR}/${encodeURIComponent(fileName)}?ref=${BRANCH}`,
      { headers: headers() }
    );
    if (checkRes.ok) {
      // Append timestamp to avoid overwriting existing file
      const ext = '.pdf';
      const base = fileName.slice(0, -ext.length);
      fileName = `${base}_${Date.now()}${ext}`;
    }
  } catch {
    // File doesn't exist, proceed
  }

  const body = {
    message: `Upload ${fileName}`,
    content: base64Content,
    branch: BRANCH,
  };

  const res = await fetch(
    `${API_BASE}/repos/${OWNER}/${REPO}/contents/${PDF_DIR}/${encodeURIComponent(fileName)}`,
    {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to upload ${fileName}: ${res.status}`);
  }

  const result = await res.json();
  return {
    fileName,
    sha: result.content.sha,
    sizeBytes: file.size,
    sizeFormatted: formatFileSize(file.size),
    downloadUrl: result.content.download_url,
    path: result.content.path,
  };
}

// ── Delete a PDF from repo ──────────────────────────────────────────
export async function deletePdf(fileName, sha) {
  let fileSha = sha;
  if (!fileSha) {
    const res = await fetch(
      `${API_BASE}/repos/${OWNER}/${REPO}/contents/${PDF_DIR}/${encodeURIComponent(fileName)}?ref=${BRANCH}`,
      { headers: headers() }
    );
    if (!res.ok) throw new Error(`File not found: ${fileName}`);
    const file = await res.json();
    fileSha = file.sha;
  }

  const body = {
    message: `Delete ${fileName}`,
    sha: fileSha,
    branch: BRANCH,
  };

  const res = await fetch(
    `${API_BASE}/repos/${OWNER}/${REPO}/contents/${PDF_DIR}/${encodeURIComponent(fileName)}`,
    {
      method: 'DELETE',
      headers: headers(),
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to delete ${fileName}: ${res.status}`);
  }
}

// ── Rename or update metadata of a PDF ──────────────────────────────
export async function updatePdfDetails(oldFileName, newFileName, details, currentMetaSha = null) {
  const { data: currentMetadata, sha: fetchedMetaSha } = await fetchMetadata();
  const metaShaToUse = currentMetaSha || fetchedMetaSha;

  let updatedFileName = oldFileName;
  let newSha = null;

  // If filename changed, rename on GitHub
  if (newFileName && newFileName.trim() && newFileName.trim() !== oldFileName) {
    let cleanNewName = newFileName.trim();
    if (!cleanNewName.toLowerCase().endsWith('.pdf')) {
      cleanNewName += '.pdf';
    }
    cleanNewName = cleanNewName.replace(/[<>:"/\\|?*]/g, '_');

    // 1. Fetch old file
    const oldRes = await fetch(
      `${API_BASE}/repos/${OWNER}/${REPO}/contents/${PDF_DIR}/${encodeURIComponent(oldFileName)}?ref=${BRANCH}`,
      { headers: headers() }
    );
    if (!oldRes.ok) throw new Error(`Could not find original file "${oldFileName}" on GitHub.`);
    const oldFile = await oldRes.json();

    // 2. Put file under new name
    const putRes = await fetch(
      `${API_BASE}/repos/${OWNER}/${REPO}/contents/${PDF_DIR}/${encodeURIComponent(cleanNewName)}`,
      {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({
          message: `Rename ${oldFileName} to ${cleanNewName}`,
          content: oldFile.content,
          branch: BRANCH,
        }),
      }
    );
    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}));
      throw new Error(err.message || `Failed to create renamed file ${cleanNewName}`);
    }
    const putResult = await putRes.json();
    newSha = putResult.content.sha;

    // 3. Delete old file
    await deletePdf(oldFileName, oldFile.sha);
    revokePdfBlobUrl(oldFileName);
    updatedFileName = cleanNewName;
  }

  // 4. Update metadata entry
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

  const savedSha = await saveMetadata(newMetadata, metaShaToUse);

  return {
    updatedFileName,
    newSha,
    metadata: newMetadata,
    metadataSha: savedSha,
  };
}

// ── Get raw download URL for a PDF ──────────────────────────────────
export function getPdfRawUrl(fileName) {
  return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${PDF_DIR}/${encodeURIComponent(fileName)}`;
}

// ── Blob URL cache & PDF content fetcher ────────────────────────────
const blobUrlCache = new Map();

export async function fetchPdfBlobUrl(fileName) {
  if (blobUrlCache.has(fileName)) {
    return blobUrlCache.get(fileName);
  }

  const token = getToken();
  const reqHeaders = {
    Accept: 'application/vnd.github.v3.raw',
  };
  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(
    `${API_BASE}/repos/${OWNER}/${REPO}/contents/${PDF_DIR}/${encodeURIComponent(fileName)}?ref=${BRANCH}&t=${Date.now()}`,
    { headers: reqHeaders }
  );

  if (!res.ok) {
    // Fallback: try raw.githubusercontent.com directly if API fails
    const rawRes = await fetch(getPdfRawUrl(fileName), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!rawRes.ok) {
      throw new Error(`Failed to load PDF (${res.status})`);
    }
    const blob = await rawRes.blob();
    const pdfBlob = new Blob([blob], { type: 'application/pdf' });
    const url = URL.createObjectURL(pdfBlob);
    blobUrlCache.set(fileName, url);
    return url;
  }

  const arrayBuffer = await res.arrayBuffer();
  const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
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

// ── Merge file list with metadata into unified PDF objects ──────────
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
      createdAt: meta.createdAt || new Date().toISOString(),
      updatedAt: meta.updatedAt || new Date().toISOString(),
    };
  });
}
