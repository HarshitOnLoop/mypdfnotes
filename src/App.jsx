import React, { useState, useEffect, useCallback } from 'react';
import PdfCard from './components/PdfCard';
import UploadSlot from './components/UploadSlot';
import DeleteModal from './components/DeleteModal';
import SettingsModal from './components/SettingsModal';
import Toast from './components/Toast';
import Footer from './components/Footer';
import {
  hasToken,
  fetchPdfList,
  fetchMetadata,
  saveMetadata,
  uploadPdf,
  deletePdf,
  mergePdfsWithMetadata,
} from './utils/githubApi';

export default function App() {
  const [pdfs, setPdfs] = useState([]);
  const [metadataSha, setMetadataSha] = useState(null);
  const [metadataCache, setMetadataCache] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [deletingPdf, setDeletingPdf] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tokenReady, setTokenReady] = useState(hasToken());

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 4);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  };

  // Load all PDFs from GitHub
  const loadPdfs = useCallback(async () => {
    if (!hasToken()) {
      setLoading(false);
      return;
    }

    setLoading(true);
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
      console.error('Failed to load PDFs from GitHub:', err);
      addToast('Failed to load PDFs from GitHub — check your token', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tokenReady) {
      loadPdfs();
    } else {
      setLoading(false);
    }
  }, [tokenReady, loadPdfs]);

  // Open PDF — use raw GitHub URL
  const handleOpenPdf = (fileName) => {
    const pdf = pdfs.find(p => p.fileName === fileName);
    if (pdf && pdf.downloadUrl) {
      window.open(pdf.downloadUrl, '_blank');
    }
  };

  // Upload PDFs to GitHub
  const handleUploadFiles = async (fileList) => {
    if (!hasToken()) {
      addToast('Please configure your GitHub token first', 'error');
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
    addToast(`Uploading ${validFiles.length} PDF(s) to GitHub...`, 'info');

    try {
      const newMetadata = { ...metadataCache };
      let currentSha = metadataSha;

      for (const file of validFiles) {
        const result = await uploadPdf(file);

        // Add metadata for the new file
        const baseName = result.fileName.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ');
        const readableTitle = baseName.replace(/\b\w/g, c => c.toUpperCase());
        newMetadata[result.fileName] = {
          title: readableTitle,
          subject: 'Uploaded Notes',
          tags: ['Uploaded'],
          isFavorite: false,
          lastReadPage: 1,
          userNotes: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      // Save updated metadata to GitHub
      currentSha = await saveMetadata(newMetadata, currentSha);
      setMetadataSha(currentSha);
      setMetadataCache(newMetadata);

      // Reload full list
      await loadPdfs();
      addToast(`✓ ${validFiles.length} PDF(s) uploaded to GitHub!`, 'success');
    } catch (err) {
      console.error('Upload error:', err);
      addToast(`Upload failed: ${err.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  // Delete PDF from GitHub
  const handleConfirmDelete = async (fileName) => {
    const pdf = pdfs.find(p => p.fileName === fileName);
    if (!pdf) {
      addToast('PDF not found', 'error');
      setDeletingPdf(null);
      return;
    }

    try {
      await deletePdf(fileName, pdf.sha);

      // Remove from metadata and save
      const newMetadata = { ...metadataCache };
      delete newMetadata[fileName];
      const newSha = await saveMetadata(newMetadata, metadataSha);
      setMetadataSha(newSha);
      setMetadataCache(newMetadata);

      // Reload
      await loadPdfs();
      addToast(`Deleted "${fileName}" from GitHub`, 'info');
      setDeletingPdf(null);
    } catch (err) {
      console.error('Delete error:', err);
      addToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  const handleTokenChange = (isValid) => {
    setTokenReady(isValid);
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
      { dot: 'bg-lime-400',   ring: 'ring-lime-200/80' },
      { dot: 'bg-rose-500',   ring: 'ring-rose-300/80' },
      { dot: 'bg-amber-400',  ring: 'ring-orange-300/80' },
      { dot: 'bg-teal-400',   ring: 'ring-teal-200/80' },
      { dot: 'bg-blue-500',   ring: 'ring-blue-300/80' },
      { dot: 'bg-purple-500', ring: 'ring-purple-300/80' },
      { dot: 'bg-pink-500',   ring: 'ring-pink-300/80' },
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

            {/* Header Search + Settings */}
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

              {/* Settings gear */}
              <button
                onClick={() => setSettingsOpen(true)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  tokenReady
                    ? 'text-stone-500 hover:bg-stone-200 hover:text-black'
                    : 'text-amber-600 bg-amber-100 hover:bg-amber-200 animate-pulse'
                }`}
                title="GitHub Settings"
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

          {/* Token Not Configured Banner */}
          {!tokenReady && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-4">
                <span className="material-symbols-outlined text-4xl">key</span>
              </div>
              <h2 className="font-serif text-2xl text-primary font-semibold mb-2">Connect to GitHub</h2>
              <p className="text-sm text-stone-500 max-w-md mb-4 leading-relaxed">
                Your PDFs are stored in your GitHub repository. Configure a Personal Access Token to get started.
              </p>
              <button
                onClick={() => setSettingsOpen(true)}
                className="px-6 py-2.5 rounded-full bg-primary text-white text-sm font-medium hover:bg-[#a13f20] transition-colors flex items-center gap-2 shadow-md"
              >
                <span className="material-symbols-outlined text-[16px]">settings</span>
                Configure Token
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-10 h-10 border-3 border-[#a13f20] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-sm text-stone-500 font-mono">Loading PDFs from GitHub...</p>
            </div>
          )}

          {/* Main Content — when token is ready and loaded */}
          {tokenReady && !loading && (
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
                  {Array.from(allTags).slice(0, 5).map((tag, index) => {
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
                    Try clearing your search or upload a PDF using the card above.
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

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onTokenChange={handleTokenChange}
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
