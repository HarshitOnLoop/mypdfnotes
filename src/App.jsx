import React, { useState, useEffect, useCallback } from 'react';
import PdfCard from './components/PdfCard';
import UploadSlot from './components/UploadSlot';
import DeleteModal from './components/DeleteModal';
import Toast from './components/Toast';
import Footer from './components/Footer';
import { savePdf, loadLocalPdfs, deleteLocalPdf } from './utils/pdfStorage';

export default function App() {
  const [staticPdfs, setStaticPdfs] = useState([]);
  const [localPdfs, setLocalPdfs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [deletingPdf, setDeletingPdf] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Merge static + local PDFs, local ones first
  const pdfs = [...localPdfs, ...staticPdfs];

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 4);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
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
  }, [loadStaticPdfs, refreshLocalPdfs]);

  // Open PDF — local PDFs use blob URL, static ones use /pdf/ path
  const handleOpenPdf = (fileName) => {
    const local = localPdfs.find(p => p.fileName === fileName);
    if (local && local.url) {
      window.open(local.url, '_blank');
    } else {
      window.open(`/pdf/${encodeURIComponent(fileName)}`, '_blank');
    }
  };

  // Upload PDFs into IndexedDB
  const handleUploadFiles = async (fileList) => {
    const validFiles = Array.from(fileList).filter(f =>
      f.name.toLowerCase().endsWith('.pdf')
    );
    if (validFiles.length === 0) {
      addToast('Please select valid .pdf files', 'error');
      return;
    }

    setUploading(true);
    addToast(`Saving ${validFiles.length} PDF(s) to your browser...`, 'info');

    try {
      for (const file of validFiles) {
        await savePdf(file);
      }
      await refreshLocalPdfs();
      addToast(`✓ ${validFiles.length} PDF(s) added successfully!`, 'success');
    } catch (err) {
      console.error('Upload error:', err);
      addToast('Error saving PDF — check browser storage', 'error');
    } finally {
      setUploading(false);
    }
  };

  // Delete — only locally uploaded PDFs can be deleted
  const handleConfirmDelete = async (fileName) => {
    const isLocal = localPdfs.some(p => p.fileName === fileName);
    if (!isLocal) {
      addToast('Static PDFs cannot be deleted from here', 'error');
      setDeletingPdf(null);
      return;
    }
    try {
      await deleteLocalPdf(fileName);
      await refreshLocalPdfs();
      addToast(`Deleted "${fileName}" from browser storage`, 'info');
      setDeletingPdf(null);
    } catch (err) {
      addToast('Error deleting PDF', 'error');
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

            {/* Header Search */}
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
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full pt-20 flex-1">
        <div className="w-full max-w-[1280px] mx-auto px-6 sm:px-10 py-8 flex flex-col gap-8">

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

        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Delete Modal — only for locally uploaded PDFs */}
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
