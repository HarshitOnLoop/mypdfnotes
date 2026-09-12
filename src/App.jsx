import React, { useState, useEffect, useCallback } from 'react';
import PdfCard from './components/PdfCard';
import UploadSlot from './components/UploadSlot';
import DeleteModal from './components/DeleteModal';
import Toast from './components/Toast';
import Footer from './components/Footer';
import SettingsModal from './components/SettingsModal';
import { savePdf, loadLocalPdfs, deleteLocalPdf } from './utils/pdfStorage';
import { uploadPdfToGithub, isGithubConfigured } from './utils/githubStorage';

export default function App() {
  const [staticPdfs, setStaticPdfs] = useState([]);
  const [localPdfs, setLocalPdfs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [deletingPdf, setDeletingPdf] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [githubConfigured, setGithubConfigured] = useState(false);

  // Merge: local IndexedDB PDFs first, then static manifest PDFs
  const pdfs = [...localPdfs, ...staticPdfs];

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 4);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3600);
  };

  // Load static PDFs from manifest
  const loadStaticPdfs = useCallback(async () => {
    try {
      const res = await fetch('/pdf-manifest.json');
      const data = await res.json();
      if (data.success) setStaticPdfs(data.pdfs);
    } catch (err) {
      console.warn('Could not load PDF manifest:', err);
    }
  }, []);

  // Load locally-uploaded PDFs from IndexedDB
  const refreshLocalPdfs = useCallback(async () => {
    try {
      const local = await loadLocalPdfs();
      setLocalPdfs(local);
    } catch (err) {
      console.warn('Could not load local PDFs:', err);
    }
  }, []);

  useEffect(() => {
    loadStaticPdfs();
    refreshLocalPdfs();
    setGithubConfigured(isGithubConfigured());
  }, [loadStaticPdfs, refreshLocalPdfs]);

  // Open PDF — local ones use blob URL, static ones use /pdf/ path
  const handleOpenPdf = (fileName) => {
    const local = localPdfs.find(p => p.fileName === fileName);
    if (local?.url) {
      window.open(local.url, '_blank');
    } else {
      window.open(`/pdf/${encodeURIComponent(fileName)}`, '_blank');
    }
  };

  // Upload handler: tries GitHub first, always saves locally too
  const handleUploadFiles = async (fileList) => {
    const validFiles = Array.from(fileList).filter(f =>
      f.name.toLowerCase().endsWith('.pdf')
    );
    if (validFiles.length === 0) {
      addToast('Please select valid .pdf files', 'error');
      return;
    }

    setUploading(true);
    const ghConfigured = isGithubConfigured();

    for (const file of validFiles) {
      // 1. Always save locally for instant display
      try {
        await savePdf(file);
      } catch (err) {
        console.warn('IndexedDB save failed:', err);
      }

      // 2. Try to push to GitHub if configured
      if (ghConfigured) {
        addToast(`📤 Uploading "${file.name}" to GitHub…`, 'info');
        try {
          await uploadPdfToGithub(file);
          addToast(`✅ "${file.name}" pushed to GitHub! Vercel will redeploy in ~1 min.`, 'success');
        } catch (err) {
          console.error('GitHub upload error:', err);
          addToast(`⚠️ GitHub upload failed: ${err.message}`, 'error');
          addToast(`"${file.name}" saved locally in your browser instead.`, 'info');
        }
      } else {
        addToast(`"${file.name}" saved locally. Connect GitHub in ⚙️ Settings to sync to your repo.`, 'info');
      }
    }

    await refreshLocalPdfs();
    setUploading(false);
  };

  // Delete — only for locally uploaded PDFs
  const handleConfirmDelete = async (fileName) => {
    try {
      await deleteLocalPdf(fileName);
      await refreshLocalPdfs();
      addToast(`Removed "${fileName}" from browser storage`, 'info');
      setDeletingPdf(null);
    } catch (err) {
      addToast('Error deleting PDF', 'error');
    }
  };

  // Filter and search
  const filteredPdfs = pdfs.filter(pdf => {
    if (activeFilter !== 'all') {
      const matchTag = pdf.tags?.includes(activeFilter);
      const matchSubj = pdf.subject?.toLowerCase().includes(activeFilter.toLowerCase());
      if (!matchTag && !matchSubj) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        (pdf.title || '').toLowerCase().includes(q) ||
        (pdf.fileName || '').toLowerCase().includes(q) ||
        (pdf.subject || '').toLowerCase().includes(q) ||
        (pdf.userNotes || '').toLowerCase().includes(q) ||
        (pdf.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const allTags = new Set();
  pdfs.forEach(p => p.tags?.forEach(t => allTags.add(t)));

  const getTagStyle = (i) => [
    { dot: 'bg-lime-400',   ring: 'ring-lime-200/80' },
    { dot: 'bg-rose-500',   ring: 'ring-rose-300/80' },
    { dot: 'bg-amber-400',  ring: 'ring-orange-300/80' },
    { dot: 'bg-teal-400',   ring: 'ring-teal-200/80' },
    { dot: 'bg-blue-500',   ring: 'ring-blue-300/80' },
    { dot: 'bg-purple-500', ring: 'ring-purple-300/80' },
    { dot: 'bg-pink-500',   ring: 'ring-pink-300/80' },
  ][i % 7];

  return (
    <div
      className="bg-[#f9f9f7] font-sans text-stone-900 min-h-screen flex flex-col antialiased"
      onDragOver={e => e.preventDefault()}
      onDrop={e => {
        e.preventDefault();
        if (e.dataTransfer.files?.length > 0) handleUploadFiles(e.dataTransfer.files);
      }}
    >
      {/* Fixed Header */}
      <header className="fixed top-0 inset-x-0 z-40 bg-[#f9f9f7]/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-stone-200">
        <div className="h-20 max-w-[1280px] mx-auto px-6 sm:px-10 flex items-center justify-between gap-4">
          <div className="flex items-center justify-between w-full gap-4">
            {/* Logo */}
            <a
              className="flex items-center gap-2 group"
              href="#"
              onClick={() => { setSearchQuery(''); setActiveFilter('all'); }}
            >
              <img src="/favicon.jpg" alt="mypdfnotes icon" className="w-7 h-7 object-contain rounded-md" />
              <span className="font-serif text-2xl tracking-tight text-primary font-semibold">mypdfnotes</span>
            </a>

            {/* Search + Settings */}
            <div className="flex items-center gap-2">
              <div className="relative w-56 sm:w-80">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-[18px] pointer-events-none">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && filteredPdfs.length > 0) handleOpenPdf(filteredPdfs[0].fileName);
                  }}
                  className="w-full pl-9 pr-8 py-1.5 bg-[#f4f4f2] rounded-full text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-black/30 transition-all"
                  placeholder="Search notes, subjects, #tags…"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-black">
                    <span className="material-symbols-outlined text-[15px]">close</span>
                  </button>
                )}
              </div>

              {/* Settings button */}
              <button
                onClick={() => { setShowSettings(true); setGithubConfigured(isGithubConfigured()); }}
                title="GitHub Settings"
                className="relative p-2 rounded-full hover:bg-stone-100 transition-colors text-stone-500 hover:text-stone-800"
              >
                <span className="material-symbols-outlined text-[20px]">settings</span>
                {/* Green dot if GitHub connected */}
                {githubConfigured && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="w-full pt-20 flex-1">
        <div className="w-full max-w-[1280px] mx-auto px-6 sm:px-10 py-8 flex flex-col gap-8">

          {/* GitHub banner if not configured */}
          {!githubConfigured && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              <span className="material-symbols-outlined text-[18px] text-amber-500 shrink-0">cloud_off</span>
              <span className="flex-1">
                <strong>GitHub not connected.</strong> Uploads are saved locally in your browser only.{' '}
                <button onClick={() => setShowSettings(true)} className="underline font-semibold hover:text-amber-900">
                  Connect GitHub →
                </button>
              </span>
            </div>
          )}

          {/* Catalog Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200">
            <div className="flex items-center gap-2 overflow-x-auto py-2">
              <button
                onClick={() => setActiveFilter('all')}
                className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl text-[15px] font-serif font-bold transition-all whitespace-nowrap border ${activeFilter === 'all' ? 'bg-white shadow-md border-slate-200 text-black' : 'bg-white/80 shadow-sm border-slate-100 text-stone-600 hover:shadow-md hover:text-black hover:bg-white'}`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-stone-300 ring-[3px] ring-stone-200/60 ml-0.5" />
                all notes
              </button>
              {Array.from(allTags).slice(0, 6).map((tag, i) => {
                const style = getTagStyle(i);
                return (
                  <button
                    key={tag}
                    onClick={() => setActiveFilter(activeFilter === tag ? 'all' : tag)}
                    className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl text-[15px] font-serif font-bold transition-all whitespace-nowrap border ${activeFilter === tag ? 'bg-white shadow-md border-slate-200 text-black' : 'bg-white/80 shadow-sm border-slate-100 text-stone-600 hover:shadow-md hover:text-black hover:bg-white'}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${style.dot} ring-[3px] ${style.ring} ml-0.5`} />
                    {tag}
                  </button>
                );
              })}
            </div>
            <span className="text-xs text-stone-400 font-mono shrink-0">
              {filteredPdfs.length} note{filteredPdfs.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-5 gap-y-10">
            <UploadSlot onUpload={handleUploadFiles} uploading={uploading} githubConfigured={githubConfigured} />
            {filteredPdfs.map((pdf, index) => (
              <PdfCard
                key={pdf.fileName}
                pdf={pdf}
                colorIndex={index}
                onOpen={handleOpenPdf}
                onDelete={pdf.isLocal ? (item) => setDeletingPdf(item) : null}
              />
            ))}
          </div>

          {/* Empty State */}
          {filteredPdfs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-[#f4f4f2] flex items-center justify-center text-[#a13f20] mb-3">
                <span className="material-symbols-outlined text-3xl">search_off</span>
              </div>
              <h3 className="font-serif text-xl text-primary font-medium">No PDF Notes Found</h3>
              <p className="text-xs text-stone-500 max-w-sm mt-1">Upload a PDF using the card above, or try a different search.</p>
              <button
                onClick={() => { setSearchQuery(''); setActiveFilter('all'); }}
                className="mt-4 px-4 py-1.5 rounded-full bg-primary text-white text-xs font-medium hover:bg-[#a13f20] transition-colors"
              >
                Show All Notes
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Modals */}
      <SettingsModal
        open={showSettings}
        onClose={() => { setShowSettings(false); setGithubConfigured(isGithubConfigured()); }}
      />
      <DeleteModal
        pdf={deletingPdf}
        onClose={() => setDeletingPdf(null)}
        onConfirm={handleConfirmDelete}
      />
      <Toast toasts={toasts} />
    </div>
  );
}
