import React from 'react';

export default function Toast({ toasts }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div 
          key={toast.id}
          className={`pointer-events-auto px-4 py-2.5 rounded-xl text-xs font-medium shadow-lg border flex items-center gap-2 transform transition-all duration-200 ${
            toast.type === 'success' ? 'bg-[#002118] text-[#bcedda] border-[#214f41]' :
            toast.type === 'error' ? 'bg-[#ffdad6] text-[#93000a] border-[#ba1a1a]/30' :
            'bg-[#1c1b1b] text-white border-stone-700'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">
            {toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info'}
          </span>
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
