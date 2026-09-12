import React from 'react';

export default function DeleteModal({ pdf, onClose, onConfirm }) {
  if (!pdf) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#f9f9f7] rounded-2xl w-full max-w-sm shadow-2xl p-6 border border-stone-200">
        <div className="flex items-center gap-2 text-[#a13f20] mb-2 font-serif text-lg font-semibold">
          <span className="material-symbols-outlined">delete</span>
          <h3>Remove PDF Note?</h3>
        </div>
        <p className="text-xs text-stone-600 mb-4 leading-relaxed">
          Are you sure you want to remove <strong className="text-primary font-mono">{pdf.title || pdf.fileName}</strong> from your <code className="bg-stone-200 px-1 py-0.5 rounded text-black">/pdf</code> folder?
        </p>
        <div className="flex justify-end gap-2">
          <button 
            className="px-4 py-1.5 rounded-full text-xs font-medium text-stone-600 hover:bg-stone-200" 
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(pdf.fileName)}
            className="px-4 py-1.5 rounded-full bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
          >
            Remove Note
          </button>
        </div>
      </div>
    </div>
  );
}
