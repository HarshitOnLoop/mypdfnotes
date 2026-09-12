import React, { useState, useEffect } from 'react';
import { getToken, setToken, validateToken } from '../utils/githubApi';

export default function SettingsModal({ isOpen, onClose, onTokenChange }) {
  const [tokenInput, setTokenInput] = useState('');
  const [status, setStatus] = useState('idle'); // idle | checking | valid | invalid
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const existing = getToken();
      setTokenInput(existing);
      if (existing) {
        checkToken(existing);
      } else {
        setStatus('idle');
      }
    }
  }, [isOpen]);

  const checkToken = async (token) => {
    if (!token) {
      setStatus('idle');
      return;
    }
    setStatus('checking');
    // Temporarily set to validate
    const prev = getToken();
    setToken(token);
    const valid = await validateToken();
    if (!valid) {
      setToken(prev); // revert
    }
    setStatus(valid ? 'valid' : 'invalid');
  };

  const handleSave = async () => {
    const trimmed = tokenInput.trim();
    if (!trimmed) return;
    setToken(trimmed);
    setStatus('checking');
    const valid = await validateToken();
    setStatus(valid ? 'valid' : 'invalid');
    if (valid) {
      onTokenChange?.(true);
      setTimeout(() => onClose(), 600);
    }
  };

  const handleClear = () => {
    setToken('');
    setTokenInput('');
    setStatus('idle');
    onTokenChange?.(false);
  };

  if (!isOpen) return null;

  const statusConfig = {
    idle: { icon: 'key', color: 'text-stone-400', text: 'Enter your GitHub PAT' },
    checking: { icon: 'sync', color: 'text-amber-500 animate-spin', text: 'Verifying...' },
    valid: { icon: 'check_circle', color: 'text-emerald-500', text: 'Connected to GitHub' },
    invalid: { icon: 'error', color: 'text-red-500', text: 'Invalid token or no repo access' },
  };

  const st = statusConfig[status];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#f9f9f7] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-stone-200 transform transition-transform duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-serif font-semibold">
            <span className="material-symbols-outlined text-[#a13f20] text-[20px]">settings</span>
            <h3>GitHub Settings</h3>
          </div>
          <button
            className="w-7 h-7 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500"
            onClick={onClose}
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4">
          {/* Status badge */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-stone-200">
            <span className={`material-symbols-outlined text-[18px] ${st.color}`}>{st.icon}</span>
            <span className="text-xs font-medium text-stone-600">{st.text}</span>
          </div>

          {/* Token input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-primary flex items-center justify-between">
              <span>Personal Access Token</span>
              <span className="text-[10px] font-mono text-stone-400">repo scope required</span>
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="w-full pl-3 pr-10 py-2.5 text-xs bg-[#f4f4f2] border border-stone-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-black/40 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {showToken ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Help text */}
          <div className="text-[10px] text-stone-400 leading-relaxed bg-stone-100/60 px-3 py-2 rounded-md border border-stone-200/60">
            <p className="mb-1"><strong>How to create a PAT:</strong></p>
            <p>GitHub → Settings → Developer settings → Personal access tokens → Generate new token (classic) → Select <code className="bg-stone-200 px-1 rounded">repo</code> scope</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-stone-200">
            <button
              onClick={handleClear}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[13px]">delete</span>
              Clear Token
            </button>
            <div className="flex gap-2">
              <button
                className="px-4 py-1.5 rounded-full text-xs font-medium text-stone-600 hover:bg-stone-200"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!tokenInput.trim() || status === 'checking'}
                className="px-4 py-1.5 rounded-full bg-primary text-white text-xs font-medium hover:bg-[#a13f20] transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[14px]">save</span>
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
