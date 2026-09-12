import React, { useState, useEffect, useCallback } from 'react';
import PdfCard from './components/PdfCard';
import UploadSlot from './components/UploadSlot';
import DeleteModal from './components/DeleteModal';
import RenameModal from './components/RenameModal';
import SettingsModal from './components/SettingsModal';
import Toast from './components/Toast';
import Footer from './components/Footer';
import {
  isStorageConfigured,
  getActiveProvider,
  fetchPdfList,
  fetchMetadata,
  saveMetadata,
  uploadPdf,
  deletePdf,
  updatePdfDetails,
  fetchPdfBlobUrl,
  revokePdfBlobUrl,
  mergePdfsWithMetadata,
} from './utils/storage';

export default function App() {
  const [pdfs, setPdfs] = useState([]);
  const [metadataSha, setMetadataSha] = useState(null);
  const [metadataCache, setMetadataCache] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [deletingPdf, setDeletingPdf] = useState(null);
  const [editingPdf, setEditingPdf] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [storageReady, setStorageReady] = useState(isStorageConfigured());

  const activeProvider = getActiveProvider();
  const providerLabel = activeProvider === 'r2' ? 'Cloudflare R2' : 'GitHub';

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 4);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3400);
  };

  // Load all PDFs from Cloudflare R2 / Storage
  const loadPdfs = useCallback(async (showFullLoader = true) => {
    if (!isStorageConfigured()) {
      setLoading(false);
      return;
    }

    if (showFullLoader) {
      setLoading(true);
    }

    try {
      const [fileList, { data: metadata, sha }] = await Promise.all([
        fetchPdfList(),
        fetchMetadata(),
      ]);

      const merged = mergePdfsWithMetadata(fileList, metadata);
      merged.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      setPdfs(merged);
      setMetadataSha(sha);
      setMetadataCache(metadata);
    } catch (err) {
      console.error('Failed to load PDFs from storage:', err);
      addToast(`Failed to load PDFs from ${providerLabel} — check settings or .env`, 'error');
    } finally {
      if (showFullLoader) {
        setLoading(false);
      }
    }
  }, [providerLabel]);

  useEffect(() => {
    if (storageReady) {
      loadPdfs();
    } else {
      setLoading(false);
    }
  }, [storageReady, loadPdfs]);

  // Open PDF — fetch authenticated blob URL safely without popup blocker
  const handleOpenPdf = async (fileName) => {
    // 1. Open new tab synchronously during user gesture
    const newTab = window.open('', '_blank');
    if (newTab) {
      try {
        newTab.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${fileName} — mypdfnotes</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body {
                  margin: 0;
                  background-color: #f9f9f7;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  color: #292524;
                }
                .box {
                  text-align: center;
                  padding: 32px 40px;
                  background: white;
                  border-radius: 16px;
                  box-shadow: 0 10px 30px rgba(0,0,0,0.06);
                  border: 1px solid #e7e5e4;
                  max-width: 90%;
                }
                .spinner {
                  width: 32px;
                  height: 32px;
                  border: 3px solid #e7e5e4;
                  border-top-color: #a13f20;
                  border-radius: 50%;
                  animation: spin 0.8s linear infinite;
                  margin: 0 auto 16px auto;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                .title { font-size: 15px; font-weight: 600; margin: 0 0 6px 0; color: #1c1917; }
                .sub { font-size: 12px; color: #78716c; margin: 0; font-family: monospace; word-break: break-all; }
              </style>
            </head>
            <body>
              <div class="box">
                <div class="spinner"></div>
                <p class="title">Opening PDF Document...</p>
                <p class="sub">${fileName}</p>
              </div>
            </body>
          </html>
        `);
      } catch {
        // ignore write error
      }
    }

    try {
      addToast(`Opening ${fileName}...`, 'info');
      const blobUrl = await fetchPdfBlobUrl(fileName);
      if (newTab && !newTab.closed) {
        newTab.location.href = blobUrl;
      } else {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Failed to open PDF:', err);
      const pdf = pdfs.find(p => p.fileName === fileName);
      if (newTab && !newTab.closed && pdf?.downloadUrl) {
        newTab.location.href = pdf.downloadUrl;
      } else {
        if (newTab && !newTab.closed) newTab.close();
        addToast(`Could not open PDF: ${err.message}`, 'error');
      }
    }
  };

  // Upload PDFs to Cloudflare Storage smoothly with optimistic addition
  const handleUploadFiles = async (fileList) => {
    if (!isStorageConfigured()) {
      addToast(`Please configure ${providerLabel} storage credentials first`, 'error');
      setSettingsOpen(true);
      return;
    }

    const validFiles = Array.from(fileList).filter(f =>
      f.name.toLowerCase().endsWith('.pdf')
    );
    if (validFiles.length === 0) {
      addToast('Please select valid .pdf files', 'error');
      return;
    }

    setUploading(true);
    addToast(`Uploading ${validFiles.length} PDF(s) to ${providerLabel}...`, 'info');

    try {
      const newMetadata = { ...metadataCache };
      let currentSha = metadataSha;
      const uploadedCards = [];

      for (const file of validFiles) {
        const result = await uploadPdf(file);

        // Add metadata for the new file
        const baseName = result.fileName.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ');
        const readableTitle = baseName.replace(/\b\w/g, c => c.toUpperCase());
        const now = new Date().toISOString();

        newMetadata[result.fileName] = {
          title: readableTitle,
          subject: 'Uploaded Notes',
          tags: ['Uploaded'],
          isFavorite: false,
          lastReadPage: 1,
          userNotes: '',
          createdAt: now,
          updatedAt: now,
        };

        uploadedCards.push({
          fileName: result.fileName,
          sha: result.sha,
          title: readableTitle,
          subject: 'Uploaded Notes',
          tags: ['Uploaded'],
          isFavorite: false,
          lastReadPage: 1,
          userNotes: '',
          sizeBytes: result.sizeBytes,
          sizeFormatted: result.sizeFormatted,
          downloadUrl: result.downloadUrl,
          createdAt: now,
          updatedAt: now,
        });
      }

      // Optimistically prepend uploaded items to UI
      setPdfs(prev => {
        const updated = [...uploadedCards, ...prev.filter(p => !uploadedCards.some(u => u.fileName === p.fileName))];
        return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });

      // Save updated metadata to storage
      currentSha = await saveMetadata(newMetadata, currentSha);
      setMetadataSha(currentSha);
      setMetadataCache(newMetadata);

      addToast(`✓ ${validFiles.length} PDF(s) uploaded to ${providerLabel}!`, 'success');

      // Background silent refresh to sync
      loadPdfs(false);
    } catch (err) {
      console.error('Upload error:', err);
      addToast(`Upload failed: ${err.message}`, 'error');
      loadPdfs(false);
    } finally {
      setUploading(false);
    }
  };

  // Delete PDF smoothly with optimistic removal
  const handleConfirmDelete = async (fileName) => {
    const pdf = pdfs.find(p => p.fileName === fileName);
    if (!pdf) {
      addToast('PDF not found', 'error');
      setDeletingPdf(null);
      return;
    }

    // Optimistic removal from UI list
    setPdfs(prev => prev.filter(p => p.fileName !== fileName));
    setDeletingPdf(null);
    addToast(`Deleting "${pdf.title || fileName}"...`, 'info');

    try {
      await deletePdf(fileName, pdf.sha);
      revokePdfBlobUrl(fileName);

      // Remove from metadata and save
      const newMetadata = { ...metadataCache };
      delete newMetadata[fileName];
      const newSha = await saveMetadata(newMetadata, metadataSha);
      setMetadataSha(newSha);
      setMetadataCache(newMetadata);

      addToast(`✓ Deleted "${pdf.title || fileName}" successfully`, 'info');
    } catch (err) {
      console.error('Delete error:', err);
      addToast(`Delete failed: ${err.message}`, 'error');
      loadPdfs(false);
    }
  };

  // Edit PDF details (Title, Subject, Tags, File Name, Notes) smoothly
  const handleSaveEdit = async ({ oldName, newName, title, subject, tags, userNotes }) => {
    addToast(`Saving changes for "${title || newName}"...`, 'info');

    // Optimistic UI update
    setPdfs(prev => prev.map(item => {
      if (item.fileName === oldName) {
        return {
          ...item,
          fileName: newName,
          title: title || item.title,
          subject: subject || item.subject,
          tags: tags || item.tags,
          userNotes: userNotes ?? item.userNotes,
          updatedAt: new Date().toISOString(),
        };
      }
      return item;
    }));

    try {
      const result = await updatePdfDetails(
        oldName,
        newName,
        { title, subject, tags, userNotes },
        metadataSha
      );

      setMetadataSha(result.metadataSha);
      setMetadataCache(result.metadata);

      addToast(`✓ Changes saved successfully!`, 'success');
      loadPdfs(false);
    } catch (err) {
      console.error('Failed to update PDF details:', err);
      addToast(`Failed to save changes: ${err.message}`, 'error');
      loadPdfs(false);
      throw err;
    }
  };

  const handleConfigChange = (isValid) => {
    setStorageReady(isValid);
    if (isValid) {
      loadPdfs();
    } else {
      setPdfs([]);
    }
  };

  // Filter and search
  const filteredPdfs = pdfs.filter(pdf => {
    if (activeFilter !== 'all') {
      const matchTag = pdf.tags && pdf.tags.includes(activeFilter);
      const matchSubj = pdf.subject && pdf.subject.toLowerCase().includes(activeFilter.toLowerCase());
      if (!matchTag && !matchSubj) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = (pdf.title || '').toLowerCase().includes(q);
      const matchFile = (pdf.fileName || '').toLowerCase().includes(q);
      const matchSubj = (pdf.subject || '').toLowerCase().includes(q);
      const matchNotes = (pdf.userNotes || '').toLowerCase().includes(q);
      const matchTags = (pdf.tags || []).some(t =>
        t.toLowerCase().includes(q) || `#${t.toLowerCase()}`.includes(q)
      );
      return matchTitle || matchFile || matchSubj || matchNotes || matchTags;
    }
    return true;
  });

  // Extract all tags
  const allTags = new Set();
  pdfs.forEach(p => { if (p.tags) p.tags.forEach(t => allTags.add(t)); });

  const getTagStyle = (index) => {
    const styles = [
      { dot: 'bg-lime-400', ring: 'ring-lime-200/80' },
      { dot: 'bg-rose-500', ring: 'ring-rose-300/80' },
      { dot: 'bg-amber-400', ring: 'ring-orange-300/80' },
      { dot: 'bg-teal-400', ring: 'ring-teal-200/80' },
      { dot: 'bg-blue-500', ring: 'ring-blue-300/80' },
      { dot: 'bg-purple-500', ring: 'ring-purple-300/80' },
      { dot: 'bg-pink-500', ring: 'ring-pink-300/80' },
    ];
    return styles[index % styles.length];
  };

  return (
    <div
      className="bg-[#f9f9f7] font-sans text-stone-900 min-h-screen flex flex-col antialiased"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files?.length > 0) {
          handleUploadFiles(e.dataTransfer.files);
        }
      }}
    >
      {/* Fixed Editorial Header */}
      <header className="fixed top-0 inset-x-0 z-40 bg-[#f9f9f7]/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-stone-200">
        <div className="h-20 max-w-[1280px] mx-auto px-6 sm:px-10 flex items-center justify-between gap-4">
          <div className="flex items-center justify-between w-full gap-4">
            {/* Logo Brand */}
            <a
              className="flex items-center gap-2 group"
              href="#"
              onClick={() => { setSearchQuery(''); setActiveFilter('all'); }}
            >
              <img src="/favicon.jpg" alt="mypdfnotes icon" className="w-7 h-7 object-contain rounded-md" />
              <span className="font-serif text-2xl tracking-tight text-primary font-semibold">mypdfnotes</span>
            </a>

            {/* Header Search + Storage Indicator + Settings */}
            <div className="flex items-center gap-3">
              <div className="relative w-64 sm:w-80">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-[18px] pointer-events-none">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && filteredPdfs.length > 0) {
                      handleOpenPdf(filteredPdfs[0].fileName);
                    }
                  }}
                  className="w-full pl-9 pr-8 py-1.5 bg-[#f4f4f2] rounded-full text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-black/30 transition-all"
                  placeholder="Search notes, subjects, #tags..."
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-black"
                  >
                    <span className="material-symbols-outlined text-[15px]">close</span>
                  </button>
                )}
              </div>

              {/* Provider Badge */}
              <button
                onClick={() => setSettingsOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-stone-200 text-[11px] font-medium text-stone-600 hover:text-stone-900 shadow-xs transition-all"
                title="Configure Cloudflare R2 / Storage"
              >
                <span className="material-symbols-outlined text-[14px] text-[#a13f20]">cloud</span>
                <span>{providerLabel}</span>
              </button>

              {/* Settings gear */}
              <button
                onClick={() => setSettingsOpen(true)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  storageReady
                    ? 'text-stone-500 hover:bg-stone-200 hover:text-black'
                    : 'text-amber-600 bg-amber-100 hover:bg-amber-200 animate-pulse'
                }`}
                title="Storage Settings (Cloudflare R2)"
              >
                <span className="material-symbols-outlined text-[18px]">settings</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full pt-20 flex-1">
        <div className="w-full max-w-[1280px] mx-auto px-6 sm:px-10 py-8 flex flex-col gap-8">

          {/* Storage Not Configured Banner */}
          {!storageReady && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-4">
                <span className="material-symbols-outlined text-4xl">cloud_off</span>
              </div>
              <h2 className="font-serif text-2xl text-primary font-semibold mb-2">Connect to Cloudflare Storage</h2>
              <p className="text-sm text-stone-500 max-w-md mb-4 leading-relaxed">
                Connect your Cloudflare R2 bucket to store and read your PDFs with zero egress fees. Add your credentials in <code className="bg-stone-200 px-1.5 py-0.5 rounded text-stone-800 font-mono text-xs">.env</code> or configure below.
              </p>
              <button
                onClick={() => setSettingsOpen(true)}
                className="px-6 py-2.5 rounded-full bg-primary text-white text-sm font-medium hover:bg-[#a13f20] transition-colors flex items-center gap-2 shadow-md"
              >
                <span className="material-symbols-outlined text-[16px]">settings</span>
                Configure Cloudflare R2
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-10 h-10 border-3 border-[#a13f20] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-sm text-stone-500 font-mono">Loading notes from {providerLabel}...</p>
            </div>
          )}

          {/* Main Content — when storage is ready and loaded */}
          {storageReady && !loading && (
            <>
              {/* Catalog Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200">
                {/* Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto py-2">
                  <button
                    onClick={() => setActiveFilter('all')}
                    className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl text-[15px] font-serif font-bold transition-all whitespace-nowrap border ${activeFilter === 'all' ? 'bg-white shadow-md border-slate-200 text-black' : 'bg-white/80 shadow-sm border-slate-100 text-stone-600 hover:shadow-md hover:text-black hover:bg-white'}`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-stone-300 ring-[3px] ring-stone-200/60 ml-0.5"></div>
                    all notes
                  </button>
                  {Array.from(allTags).slice(0, 6).map((tag, index) => {
                    const style = getTagStyle(index);
                    return (
                      <button
                        key={tag}
                        onClick={() => setActiveFilter(activeFilter === tag ? 'all' : tag)}
                        className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl text-[15px] font-serif font-bold transition-all whitespace-nowrap border ${activeFilter === tag ? 'bg-white shadow-md border-slate-200 text-black' : 'bg-white/80 shadow-sm border-slate-100 text-stone-600 hover:shadow-md hover:text-black hover:bg-white'}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${style.dot} ring-[3px] ${style.ring} ml-0.5`}></div>
                        {tag}
                      </button>
                    );
                  })}
                </div>

                {/* PDF count badge */}
                <span className="text-xs text-stone-400 font-mono shrink-0">
                  {filteredPdfs.length} note{filteredPdfs.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-5 gap-y-10">
                {/* Upload Card — always first */}
                <UploadSlot onUpload={handleUploadFiles} uploading={uploading} />

                {/* PDF Cards */}
                {filteredPdfs.map((pdf, index) => (
                  <PdfCard
                    key={pdf.fileName}
                    pdf={pdf}
                    colorIndex={index}
                    onOpen={handleOpenPdf}
                    onEdit={(item) => setEditingPdf(item)}
                    onDelete={(item) => setDeletingPdf(item)}
                  />
                ))}
              </div>

              {/* Empty State */}
              {filteredPdfs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#f4f4f2] flex items-center justify-center text-[#a13f20] mb-3">
                    <span className="material-symbols-outlined text-3xl">search_off</span>
                  </div>
                  <h3 className="font-serif text-xl text-primary font-medium">No Matching PDF Notes Found</h3>
                  <p className="text-xs text-stone-500 max-w-sm mt-1">
                    Upload your first PDF note to {providerLabel} using the card above.
                  </p>
                  <button
                    onClick={() => { setSearchQuery(''); setActiveFilter('all'); }}
                    className="mt-4 px-4 py-1.5 rounded-full bg-primary text-white text-xs font-medium hover:bg-[#a13f20] transition-colors"
                  >
                    Show All Notes
                  </button>
                </div>
              )}
            </>
          )}

        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Edit PDF Modal */}
      <RenameModal
        isOpen={!!editingPdf}
        pdf={editingPdf}
        onClose={() => setEditingPdf(null)}
        onSave={handleSaveEdit}
      />

      {/* Storage Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onConfigChange={handleConfigChange}
      />

      {/* Delete Modal */}
      <DeleteModal
        pdf={deletingPdf}
        onClose={() => setDeletingPdf(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Toast System */}
      <Toast toasts={toasts} />
    </div>
  );
}
