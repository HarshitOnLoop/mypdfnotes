import React, { useState } from 'react';

export default function DeleteModal({ pdf, onClose, onConfirm }) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!pdf) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(pdf.fileName);
    } catch (err) {
      console.error('Delete error in modal:', err);
      setIsDeleting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget && !isDeleting) onClose(); }}
    >
      <div className="bg-[#f9f9f7] rounded-2xl w-full max-w-sm shadow-2xl p-6 border border-stone-200">
        <div className="flex items-center gap-2 text-[#a13f20] mb-3 font-serif text-lg font-semibold">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </div>
          <h3>Remove PDF Note</h3>
        </div>

        <p className="text-xs text-stone-600 mb-2 leading-relaxed">
          Are you sure you want to permanently delete:
        </p>
        <div className="p-3 bg-white border border-stone-200 rounded-lg mb-5">
          <div className="font-semibold text-xs text-stone-900 truncate">
            {pdf.title || pdf.fileName}
          </div>
          <div className="font-mono text-[10px] text-stone-400 truncate mt-0.5">
            {pdf.fileName}
          </div>
        </div>

        <div className="flex justify-end items-center gap-2">
          <button 
            type="button"
            disabled={isDeleting}
            className="px-4 py-2 rounded-full text-xs font-semibold text-stone-600 hover:bg-stone-200 transition-colors disabled:opacity-40" 
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            type="button"
            disabled={isDeleting}
            onClick={handleConfirm}
            className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-wait"
          >
            {isDeleting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[15px]">delete_forever</span>
                <span>Delete Note</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
