import React, { useRef } from 'react';

export default function UploadSlot({ onUpload, uploading = false, githubConfigured = false }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
      // reset so same file can be re-selected
      e.target.value = '';
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
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={`relative w-full aspect-[3/4.2] rounded-r-lg rounded-l-sm bg-surface-container-low border-2 border-dashed transition-all duration-300 transform flex flex-col items-center justify-center p-5 text-center shadow-sm
          ${uploading
            ? 'border-[#a13f20]/40 cursor-wait opacity-80'
            : 'border-outline-variant/60 hover:border-[#a13f20] group-hover:-translate-y-1.5 group-hover:shadow-md cursor-pointer'
          }`}
      >
        {/* Icon / Spinner */}
        <div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary mb-3 group-hover:scale-110 transition-transform">
          {uploading ? (
            <div className="w-6 h-6 border-2 border-[#a13f20] border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="material-symbols-outlined text-2xl">note_add</span>
          )}
        </div>

        <h3 className="text-xs font-semibold text-primary font-sans">
          {uploading ? 'Saving to browser…' : '+ Upload PDF Notes'}
        </h3>
        <p className="text-[11px] text-on-surface-variant mt-1 leading-snug">
          {uploading ? 'Please wait' : 'Drop PDF files here or click to browse'}
        </p>

        {!uploading && (
          <span className={`mt-3 px-2.5 py-1 rounded-full text-[10px] font-mono border flex items-center gap-1 ${
            githubConfigured
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-surface text-outline border-surface-container-high'
          }`}>
            <span className="material-symbols-outlined text-[11px]">
              {githubConfigured ? 'cloud_done' : 'cloud_off'}
            </span>
            {githubConfigured ? 'Syncs to GitHub' : 'Local only · Connect GitHub'}
          </span>
        )}
      </div>

      {/* Sub-footer */}
      <div className="flex flex-col mt-auto pt-3 gap-1">
        <span className="text-xs font-semibold text-primary truncate">
          {uploading ? 'Uploading…' : 'Import New Notes'}
        </span>
        <button
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="mt-1 w-full py-1.5 px-3 rounded-full bg-primary text-white text-[11px] font-medium hover:bg-[#a13f20] transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm group-hover:shadow disabled:opacity-50 disabled:cursor-wait"
        >
          {uploading ? (
            <>
              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[13px]">upload</span>
              Upload PDF
            </>
          )}
        </button>
      </div>
    </article>
  );
}
