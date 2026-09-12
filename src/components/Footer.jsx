import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full bg-[#121212] mt-auto border-t border-[#212121]">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-10 py-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-white">

        <div className="flex items-center gap-2">
          <span className="font-['Anton'] text-xl text-white tracking-wide">
            MY PDF NOTES
          </span>
        </div>

        <div className="text-xs font-['Anton'] text-white tracking-wide">
          <span>© 2026 MY PDF NOTES</span>
        </div>

      </div>
    </footer>
  );
}