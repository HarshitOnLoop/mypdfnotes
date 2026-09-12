/**
 * GitHub Contents API helper.
 * Uploads PDFs and updates pdf-manifest.json directly in the GitHub repo.
 * Requires a Personal Access Token (PAT) with "repo" scope.
 */

const GITHUB_API = 'https://api.github.com';

function getConfig() {
  return {
    token: localStorage.getItem('gh_token') || '',
    owner: localStorage.getItem('gh_owner') || '',
    repo: localStorage.getItem('gh_repo') || '',
    branch: localStorage.getItem('gh_branch') || 'main',
  };
}

export function saveGithubConfig({ token, owner, repo, branch = 'main' }) {
  localStorage.setItem('gh_token', token);
  localStorage.setItem('gh_owner', owner);
  localStorage.setItem('gh_repo', repo);
  localStorage.setItem('gh_branch', branch);
}

export function loadGithubConfig() {
  return getConfig();
}

export function isGithubConfigured() {
  const c = getConfig();
  return !!(c.token && c.owner && c.repo);
}

/** Convert File to base64 string */
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // result is "data:application/pdf;base64,XXXX"
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Get a file's content + sha from GitHub (returns null if not found) */
async function getGithubFile(path) {
  const { token, owner, repo, branch } = getConfig();
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || `GitHub API error: ${res.status}`);
  }
  return res.json(); // { sha, content (base64), ... }
}

/** Create or update a file in the GitHub repo */
async function putGithubFile(path, base64Content, message, sha = null) {
  const { token, owner, repo, branch } = getConfig();
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`;
  const body = {
    message,
    content: base64Content,
    branch,
    ...(sha ? { sha } : {}),
  };
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || `GitHub API error: ${res.status}`);
  }
  return res.json();
}

function formatSize(bytes) {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Upload a PDF file to GitHub and update pdf-manifest.json.
 * Returns the new PDF entry object.
 */
export async function uploadPdfToGithub(file) {
  const base64 = await fileToBase64(file);
  const fileName = file.name;
  const pdfPath = `public/pdf/${fileName}`;
  const manifestPath = 'public/pdf-manifest.json';

  // 1. Check if PDF already exists (to get sha for update)
  const existingPdf = await getGithubFile(pdfPath);

  // 2. Upload the PDF file
  await putGithubFile(
    pdfPath,
    base64,
    `feat: upload PDF note "${fileName}"`,
    existingPdf?.sha || null
  );

  // 3. Fetch current manifest
  const manifestFile = await getGithubFile(manifestPath);
  let manifest = { success: true, count: 0, pdfs: [] };
  if (manifestFile) {
    const decoded = atob(manifestFile.content.replace(/\n/g, ''));
    manifest = JSON.parse(decoded);
  }

  // 4. Build new PDF entry
  const base64Name = file.name.replace(/\.pdf$/i, '');
  const readableTitle = base64Name.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const newEntry = {
    fileName,
    title: readableTitle,
    subject: 'Uploaded Notes',
    tags: ['Uploaded'],
    isFavorite: false,
    lastReadPage: 1,
    userNotes: '',
    sizeBytes: file.size,
    sizeFormatted: formatSize(file.size),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    url: `/pdf/${encodeURIComponent(fileName)}`,
  };

  // Remove existing entry with same fileName (in case of re-upload)
  manifest.pdfs = manifest.pdfs.filter(p => p.fileName !== fileName);
  manifest.pdfs.unshift(newEntry);
  manifest.count = manifest.pdfs.length;

  // 5. Update manifest in GitHub
  const manifestBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(manifest, null, 2))));
  await putGithubFile(
    manifestPath,
    manifestBase64,
    `feat: update pdf-manifest.json — add "${fileName}"`,
    manifestFile?.sha || null
  );

  return newEntry;
}
