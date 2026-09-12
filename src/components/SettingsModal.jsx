import React, { useState, useEffect } from 'react';
import { saveGithubConfig, loadGithubConfig, isGithubConfigured } from '../utils/githubStorage';

export default function SettingsModal({ open, onClose }) {
  const [token, setToken] = useState('');
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('main');
  const [showToken, setShowToken] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      const cfg = loadGithubConfig();
      setToken(cfg.token || '');
      setOwner(cfg.owner || '');
      setRepo(cfg.repo || '');
      setBranch(cfg.branch || 'main');
      setSaved(false);
    }
  }, [open]);

  if (!open) return null;

  const handleSave = () => {
    saveGithubConfig({ token, owner, repo, branch });
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 900);
  };

  const handleClear = () => {
    localStorage.removeItem('gh_token');
    localStorage.removeItem('gh_owner');
    localStorage.removeItem('gh_repo');
    localStorage.removeItem('gh_branch');
    setToken(''); setOwner(''); setRepo(''); setBranch('main');
  };

  const configured = isGithubConfigured();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-stone-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#1c1b1b] flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[16px]">settings</span>
              </div>
              <div>
                <h2 className="font-serif text-lg font-semibold text-stone-900">GitHub Settings</h2>
                <p className="text-[11px] text-stone-400">Upload PDFs directly to your repo</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-700 rounded-full">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">

          {/* Status pill */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${configured ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
            <span className="material-symbols-outlined text-[14px]">
              {configured ? 'check_circle' : 'warning'}
            </span>
            {configured
              ? `Connected to ${owner}/${repo}`
              : 'Not connected — uploads will be saved locally only'}
          </div>

          {/* How to get a PAT */}
          <details className="text-[11px] text-stone-500 bg-stone-50 rounded-xl px-3 py-2 cursor-pointer">
            <summary className="font-semibold text-stone-700 flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">help</span>
              How to get a GitHub Token (PAT)?
            </summary>
            <ol className="mt-2 pl-4 list-decimal space-y-1 leading-relaxed">
              <li>Go to <a href="https://github.com/settings/tokens/new" target="_blank" rel="noreferrer" className="text-[#a13f20] underline">github.com/settings/tokens/new</a></li>
              <li>Name it <strong>mypdfnotes</strong></li>
              <li>Select scope: <strong>repo</strong> (full control)</li>
              <li>Click <strong>Generate token</strong> and copy it here</li>
            </ol>
          </details>

          {/* Token */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-stone-700">Personal Access Token (PAT)</label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="w-full pr-10 pl-3 py-2 rounded-xl border border-stone-200 text-xs font-mono bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#a13f20]/30 focus:border-[#a13f20]"
              />
              <button
                type="button"
                onClick={() => setShowToken(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
              >
                <span className="material-symbols-outlined text-[16px]">{showToken ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>

          {/* Owner + Repo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-700">GitHub Username</label>
              <input
                type="text"
                value={owner}
                onChange={e => setOwner(e.target.value)}
                placeholder="HarshitOnLoop"
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#a13f20]/30 focus:border-[#a13f20]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-700">Repository Name</label>
              <input
                type="text"
                value={repo}
                onChange={e => setRepo(e.target.value)}
                placeholder="mypdfnotes"
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#a13f20]/30 focus:border-[#a13f20]"
              />
            </div>
          </div>

          {/* Branch */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-stone-700">Branch</label>
            <input
              type="text"
              value={branch}
              onChange={e => setBranch(e.target.value)}
              placeholder="main"
              className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#a13f20]/30 focus:border-[#a13f20]"
            />
          </div>

          {/* Warning */}
          <p className="text-[10px] text-stone-400 bg-stone-50 rounded-xl px-3 py-2 leading-relaxed">
            🔒 Your token is stored only in <strong>this browser's localStorage</strong> and never sent anywhere except GitHub's API. Clear it anytime with the button below.
          </p>
        </div>

        {/* Footer actions */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <button
            onClick={handleClear}
            className="px-3 py-1.5 rounded-full text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
          >
            Clear Token
          </button>

          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-1.5 rounded-full text-xs font-medium text-stone-600 hover:bg-stone-100 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!token || !owner || !repo}
              className="px-5 py-1.5 rounded-full bg-[#1c1b1b] text-white text-xs font-semibold hover:bg-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {saved ? (
                <><span className="material-symbols-outlined text-[13px]">check</span> Saved!</>
              ) : (
                <><span className="material-symbols-outlined text-[13px]">save</span> Save</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
