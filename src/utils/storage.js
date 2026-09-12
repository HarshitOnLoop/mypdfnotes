import * as r2 from './cloudflareR2';
import * as github from './githubApi';

export function getActiveProvider() {
  const custom = localStorage.getItem('mypdfnotes_storage_provider');
  if (custom === 'github') return 'github';
  if (custom === 'r2') return 'r2';

  if (r2.hasR2Config()) return 'r2';
  if (github.hasToken()) return 'github';
  return 'r2';
}

export function setActiveProvider(provider) {
  localStorage.setItem('mypdfnotes_storage_provider', provider);
}

export function isStorageConfigured() {
  const provider = getActiveProvider();
  if (provider === 'r2') return r2.hasR2Config();
  if (provider === 'github') return github.hasToken();
  return false;
}

export async function fetchPdfList() {
  const provider = getActiveProvider();
  if (provider === 'r2') return r2.fetchPdfList();
  return github.fetchPdfList();
}

export async function fetchMetadata() {
  const provider = getActiveProvider();
  if (provider === 'r2') return r2.fetchMetadata();
  return github.fetchMetadata();
}

export async function saveMetadata(metadata, sha = null) {
  const provider = getActiveProvider();
  if (provider === 'r2') return r2.saveMetadata(metadata);
  return github.saveMetadata(metadata, sha);
}

export async function uploadPdf(file) {
  const provider = getActiveProvider();
  if (provider === 'r2') return r2.uploadPdf(file);
  return github.uploadPdf(file);
}

export async function deletePdf(fileName, sha = null) {
  const provider = getActiveProvider();
  if (provider === 'r2') return r2.deletePdf(fileName);
  return github.deletePdf(fileName, sha);
}

export async function updatePdfDetails(oldFileName, newFileName, details, sha = null) {
  const provider = getActiveProvider();
  if (provider === 'r2') return r2.updatePdfDetails(oldFileName, newFileName, details);
  return github.updatePdfDetails(oldFileName, newFileName, details, sha);
}

export async function fetchPdfBlobUrl(fileName) {
  const provider = getActiveProvider();
  if (provider === 'r2') return r2.fetchPdfBlobUrl(fileName);
  return github.fetchPdfBlobUrl(fileName);
}

export function revokePdfBlobUrl(fileName) {
  const provider = getActiveProvider();
  if (provider === 'r2') return r2.revokePdfBlobUrl(fileName);
  return github.revokePdfBlobUrl(fileName);
}

export function mergePdfsWithMetadata(fileList, metadata) {
  const provider = getActiveProvider();
  if (provider === 'r2') return r2.mergePdfsWithMetadata(fileList, metadata);
  return github.mergePdfsWithMetadata(fileList, metadata);
}
