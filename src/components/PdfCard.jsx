import React, { useEffect, useRef, useState } from 'react';

const thumbnailCache = new Map();

export default function PdfCard({ pdf, onOpen, onDelete, colorIndex = 0 }) {
  const canvasRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  const safeTitle = pdf.title || pdf.fileName;
  const safeFilename = pdf.fileName;
  const safeSubject = pdf.subject || 'Notes';

  const styles = [
    { leftBg: 'bg-[#2d0052]', dot: 'bg-white',    rightBg: 'bg-[#a855f7]' },
    { leftBg: 'bg-[#003300]', dot: 'bg-white',    rightBg: 'bg-[#22c55e]' },
    { leftBg: 'bg-[#001f5c]', dot: 'bg-white',    rightBg: 'bg-[#3b82f6]' },
    { leftBg: 'bg-[#5c0000]', dot: 'bg-white',    rightBg: 'bg-[#ef4444]' },
    { leftBg: 'bg-[#4a2800]', dot: 'bg-white',    rightBg: 'bg-[#f97316]' },
    { leftBg: 'bg-[#003333]', dot: 'bg-white',    rightBg: 'bg-[#06b6d4]' },
    { leftBg: 'bg-[#3d0033]', dot: 'bg-white',    rightBg: 'bg-[#ec4899]' },
    { leftBg: 'bg-[#1a1a00]', dot: 'bg-white',    rightBg: 'bg-[#eab308]' },
    { leftBg: 'bg-[#002233]', dot: 'bg-white',    rightBg: 'bg-[#0ea5e9]' },
    { leftBg: 'bg-[#1f0040]', dot: 'bg-white',    rightBg: 'bg-[#8b5cf6]' },
    { leftBg: 'bg-[#003322]', dot: 'bg-white',    rightBg: 'bg-[#10b981]' },
    { leftBg: 'bg-[#330020]', dot: 'bg-white',    rightBg: 'bg-[#f43f5e]' }
  ];

  const blockStyle = styles[colorIndex % styles.length];

  useEffect(() => {
    let isCancelled = false;

    async function renderThumbnail() {
      if (!window.pdfjsLib || !canvasRef.current) return;
      // Use downloadUrl from GitHub raw content
      const pdfUrl = pdf.downloadUrl || pdf.url || `/pdf/${encodeURIComponent(pdf.fileName)}`;


      // Check in-memory cache
      if (thumbnailCache.has(pdfUrl)) {
        const cached = thumbnailCache.get(pdfUrl);
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = cached.width;
          canvas.height = cached.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(cached, 0, 0);
          setLoaded(true);
        }
        return;
      }

      try {
        const loadingTask = window.pdfjsLib.getDocument(pdfUrl);
        const pdfDoc = await loadingTask.promise;
        if (isCancelled) return;

        const page = await pdfDoc.getPage(1);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        await page.render({
          canvasContext: ctx,
          viewport: viewport
        }).promise;

        if (!isCancelled) {
          thumbnailCache.set(pdfUrl, canvas);
          setLoaded(true);
        }
      } catch (err) {
        console.warn('Thumbnail render error for:', pdf.fileName, err);
        setLoaded(true);
      }
    }

    renderThumbnail();

    return () => {
      isCancelled = true;
    };
  }, [pdf.fileName]);

  return (
    <article className="group flex flex-col relative h-full">
      {/* Paper Sheaf Stack */}
      <div 
        onClick={() => onOpen(pdf.fileName)}
        className="relative w-full aspect-[3/4.2] rounded-r-lg rounded-l-sm bg-[#fcfbf9] paper-shadow transition-all duration-300 transform group-hover:-translate-y-1.5 overflow-hidden flex flex-col justify-between cursor-pointer border-r-2 border-b-2 border-stone-300/60"
      >
        {/* Stacked Edge Layers Behind Front Page */}
        <div className="absolute -bottom-1 -right-1 w-full h-full bg-[#f4f4f0] rounded-r-lg -z-10 border-r border-b border-stone-300/40 pointer-events-none"></div>
        <div className="absolute -bottom-2 -right-2 w-full h-full bg-[#ebe9e3] rounded-r-lg -z-20 border-r border-b border-stone-300/30 pointer-events-none"></div>

        {/* Stack Tape Spine Gradient */}
        <div className="absolute top-0 left-0 w-8 h-4 bg-amber-950/20 border-b border-amber-900/15 z-20 pointer-events-none"></div>
        <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-stone-400/25 to-transparent z-20 pointer-events-none"></div>

        {/* Real First Page Canvas */}
        <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-[#fdfdfc]">
          <canvas 
            ref={canvasRef} 
            className={`w-full h-full object-cover object-top transition-opacity duration-300 ${loaded ? 'opacity-90 group-hover:opacity-100' : 'opacity-0'}`}
          />

          {/* Loading Skeleton Spinner */}
          {!loaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#fbfbfa] text-stone-400 z-10">
              <div className="w-6 h-6 border-2 border-[#a13f20] border-t-transparent rounded-full animate-spin mb-1.5"></div>
              <span className="text-[9px] font-mono">Loading Page 1...</span>
            </div>
          )}

          {/* Top Subtle Glass Header Bar */}
          <div className="absolute top-0 inset-x-0 z-10 px-3 py-1.5 bg-gradient-to-b from-stone-900/40 via-stone-900/10 to-transparent flex items-center justify-between text-white font-mono text-[9px]">
            <span className="bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-semibold">
              {safeSubject}
            </span>
            <div className="flex items-center gap-1">
              <span className="bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px]">
                Pg. 01
              </span>
            </div>
          </div>

          {/* Bottom Glass Meta Bar */}
          <div className="absolute bottom-0 inset-x-0 z-10 px-3 py-2 bg-gradient-to-t from-stone-950/80 via-stone-900/50 to-transparent flex items-center justify-between text-white font-mono text-[9px] backdrop-blur-[2px]">
            <span className="truncate max-w-[120px] font-semibold text-[10px] drop-shadow-sm">
              {safeFilename}
            </span>
            <span className="material-symbols-outlined text-[14px] text-amber-200 drop-shadow-sm">
              open_in_new
            </span>
          </div>
        </div>
      </div>

      {/* Card Sub-Footer: Title & Open button */}
      <div className="flex flex-col mt-auto pt-3 gap-1">
        <div className="flex items-center gap-1">
          <div className="flex items-stretch overflow-hidden truncate flex-1 rounded-sm border border-stone-200 shadow-sm">
            <div className={`w-6 flex-shrink-0 flex items-center justify-center ${blockStyle.leftBg}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${blockStyle.dot}`}></div>
            </div>
            <div className={`px-2 py-1 flex items-center justify-start truncate ${blockStyle.rightBg} text-white text-[11px] font-sans font-bold`}>
              <span className="truncate" title={safeTitle}>{safeTitle}</span>
            </div>
          </div>
          {/* Delete button — only for locally uploaded PDFs */}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(pdf); }}
              className="flex-shrink-0 p-1 text-stone-400 hover:text-red-600 rounded-full transition-colors opacity-0 group-hover:opacity-100"
              title="Remove from browser"
            >
              <span className="material-symbols-outlined text-[14px]">delete</span>
            </button>
          )}
        </div>

        <button 
          onClick={() => onOpen(pdf.fileName)}
          className="mt-1 w-full py-1.5 px-3 rounded-full bg-primary text-white text-xs font-medium hover:bg-[#a13f20] transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm group-hover:shadow"
        >
          <span className="material-symbols-outlined text-[14px]">open_in_new</span> Open PDF
        </button>
      </div>
    </article>
  );
}
