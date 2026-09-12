import React, { useRef } from 'react';

export default function UploadSlot({ onUpload }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
    }
  };

  return (
    <article className="group flex flex-col relative h-full" id="upload-card">
      <input 
        type="file" 
        ref={fileInputRef} 
        multiple 
        accept="application/pdf,.pdf" 
        style={{ display: 'none' }} 
        onChange={handleFileChange}
      />

      <div 
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="relative w-full aspect-[3/4.2] rounded-r-lg rounded-l-sm bg-surface-container-low border-2 border-dashed border-outline-variant/60 hover:border-[#a13f20] transition-all duration-300 transform group-hover:-translate-y-1.5 flex flex-col items-center justify-center p-5 text-center cursor-pointer shadow-sm group-hover:shadow-md"
      >
        <div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary mb-3 group-hover:scale-110 transition-transform">
          <span className="material-symbols-outlined text-2xl">note_add</span>
        </div>
        <h3 className="text-xs font-semibold text-primary font-sans">+ Upload PDF Notes</h3>
        <p className="text-[11px] text-on-surface-variant mt-1 leading-snug">Drop PDF files here or click to browse</p>
        <span className="mt-3 px-2.5 py-1 rounded-full bg-surface text-[10px] font-mono text-outline border border-surface-container-high">PDF up to 100MB</span>
      </div>

      <div className="flex flex-col mt-auto pt-3 gap-1">
        <span className="text-xs font-semibold text-primary truncate">Import New Notes</span>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="mt-1 w-full py-1.5 px-3 rounded-full bg-primary text-white text-[11px] font-medium hover:bg-[#a13f20] transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm group-hover:shadow"
        >
          <span className="material-symbols-outlined text-[13px]">upload</span> Upload PDF
        </button>
      </div>
    </article>
  );
}
