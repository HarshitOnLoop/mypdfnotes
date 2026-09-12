import React, { useState, useEffect } from 'react';
import {
  getR2Config,
  setR2Config,
  validateR2Connection,
  isUsingEnvR2,
  hasEnvR2Config,
  getEnvR2Config
} from '../utils/cloudflareR2';
import {
  getToken,
  setToken,
  validateToken as validateGitHubToken,
  isUsingEnvToken as isUsingEnvGitHubToken,
  hasEnvToken as hasEnvGitHubToken
} from '../utils/githubApi';
import { getActiveProvider, setActiveProvider } from '../utils/storage';

export default function SettingsModal({ isOpen, onClose, onConfigChange }) {
  const [activeTab, setActiveTab] = useState('r2'); // 'r2' | 'github'

  // R2 state
  const [r2Form, setR2Form] = useState({
    accountId: '',
    accessKeyId: '',
    secretAccessKey: '',
    bucketName: '',
    publicUrl: '',
  });
  const [r2Status, setR2Status] = useState('idle'); // idle | checking | valid | invalid
  const [r2Error, setR2Error] = useState('');
  const [showR2Secret, setShowR2Secret] = useState(false);

  // GitHub state
  const [githubToken, setGithubToken] = useState('');
  const [githubStatus, setGithubStatus] = useState('idle');
  const [showGithubToken, setShowGithubToken] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const currentProvider = getActiveProvider();
      setActiveTab(currentProvider);

      // Load R2 config
      const r2Cfg = getR2Config();
      setR2Form(r2Cfg);
      if (r2Cfg.accountId && r2Cfg.accessKeyId && r2Cfg.secretAccessKey && r2Cfg.bucketName) {
        checkR2(r2Cfg);
      } else {
        setR2Status('idle');
      }

      // Load GitHub token
      const gh = getToken();
      setGithubToken(gh);
      if (gh) {
        checkGitHub(gh);
      } else {
        setGithubStatus('idle');
      }
    }
  }, [isOpen]);

  const checkR2 = async (config) => {
    setR2Status('checking');
    setR2Error('');
    const res = await validateR2Connection(config);
    if (res.valid) {
      setR2Status('valid');
    } else {
      setR2Status('invalid');
      setR2Error(res.error || 'Connection failed');
    }
  };

  const checkGitHub = async (token) => {
    setGithubStatus('checking');
    const valid = await validateGitHubToken();
    setGithubStatus(valid ? 'valid' : 'invalid');
  };

  const handleSaveR2 = async () => {
    setR2Config(r2Form);
    setActiveProvider('r2');
    setR2Status('checking');
    const res = await validateR2Connection(r2Form);
    if (res.valid) {
      setR2Status('valid');
      onConfigChange?.(true);
      setTimeout(() => onClose(), 600);
    } else {
      setR2Status('invalid');
      setR2Error(res.error || 'Connection failed');
    }
  };

  const handleClearR2 = () => {
    setR2Config(null);
    const env = getEnvR2Config();
    setR2Form(env);
    if (env.accountId && env.accessKeyId && env.secretAccessKey && env.bucketName) {
      checkR2(env);
      onConfigChange?.(true);
    } else {
      setR2Status('idle');
      onConfigChange?.(false);
    }
  };

  const handleSaveGitHub = async () => {
    const trimmed = githubToken.trim();
    if (!trimmed) return;
    setToken(trimmed);
    setActiveProvider('github');
    setGithubStatus('checking');
    const valid = await validateGitHubToken();
    setGithubStatus(valid ? 'valid' : 'invalid');
    if (valid) {
      onConfigChange?.(true);
      setTimeout(() => onClose(), 600);
    }
  };

  const handleClearGitHub = () => {
    setToken('');
    const fallback = getToken();
    setGithubToken(fallback);
    if (fallback) {
      checkGitHub(fallback);
      onConfigChange?.(true);
    } else {
      setGithubStatus('idle');
      onConfigChange?.(false);
    }
  };

  if (!isOpen) return null;

  const envR2Present = hasEnvR2Config();
  const envGithubPresent = hasEnvGitHubToken();

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#f9f9f7] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-stone-200 transform transition-all duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-serif font-semibold text-lg">
            <span className="material-symbols-outlined text-[#a13f20] text-[22px]">cloud_sync</span>
            <h3>Storage Settings</h3>
          </div>
          <button
            className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500"
            onClick={onClose}
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        {/* Storage Tabs */}
        <div className="flex border-b border-stone-200 bg-stone-100/60 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => { setActiveTab('r2'); setActiveProvider('r2'); }}
            className={`pb-2.5 px-3 text-xs font-bold font-sans transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'r2'
                ? 'border-[#a13f20] text-[#a13f20]'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">cloud</span>
            Cloudflare R2 (Recommended)
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('github'); setActiveProvider('github'); }}
            className={`pb-2.5 px-3 text-xs font-bold font-sans transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'github'
                ? 'border-[#a13f20] text-[#a13f20]'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">code</span>
            GitHub Storage
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 flex flex-col gap-4 overflow-y-auto">
          {activeTab === 'r2' && (
            <>
              {/* Status Badge */}
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-white border border-stone-200 shadow-xs">
                {r2Status === 'checking' && (
                  <>
                    <span className="material-symbols-outlined text-[18px] text-amber-500 animate-spin">sync</span>
                    <span className="text-xs font-semibold text-stone-700">Connecting to Cloudflare R2...</span>
                  </>
                )}
                {r2Status === 'valid' && (
                  <>
                    <span className="material-symbols-outlined text-[18px] text-emerald-500">check_circle</span>
                    <span className="text-xs font-semibold text-emerald-700">
                      Connected to Cloudflare R2 bucket: <strong>{r2Form.bucketName}</strong>
                    </span>
                  </>
                )}
                {r2Status === 'invalid' && (
                  <>
                    <span className="material-symbols-outlined text-[18px] text-red-500">error</span>
                    <span className="text-xs font-semibold text-red-600 truncate">
                      {r2Error || 'Invalid credentials or bucket unreachable'}
                    </span>
                  </>
                )}
                {r2Status === 'idle' && (
                  <>
                    <span className="material-symbols-outlined text-[18px] text-stone-400">key</span>
                    <span className="text-xs font-semibold text-stone-600">Enter Cloudflare R2 credentials or configure .env</span>
                  </>
                )}
              </div>

              {/* Env banner */}
              {envR2Present && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2 text-emerald-900 text-xs">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px] mt-0.5">verified</span>
                  <div>
                    <span className="font-semibold">.env Config Active: </span>
                    <span>Loaded from <code className="font-mono text-[11px] bg-emerald-100 px-1 rounded">VITE_R2_*</code> variables.</span>
                  </div>
                </div>
              )}

              {/* Form inputs */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-primary">Cloudflare Account ID</label>
                  <input
                    type="text"
                    value={r2Form.accountId}
                    onChange={(e) => setR2Form({ ...r2Form, accountId: e.target.value })}
                    placeholder="e.g. 8f92a34bc98..."
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#a13f20]/20 focus:border-[#a13f20]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-primary">R2 Bucket Name</label>
                    <input
                      type="text"
                      value={r2Form.bucketName}
                      onChange={(e) => setR2Form({ ...r2Form, bucketName: e.target.value })}
                      placeholder="e.g. mypdfnotes"
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#a13f20]/20 focus:border-[#a13f20]"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-primary">Access Key ID</label>
                    <input
                      type="text"
                      value={r2Form.accessKeyId}
                      onChange={(e) => setR2Form({ ...r2Form, accessKeyId: e.target.value })}
                      placeholder="e.g. 74d89a2b..."
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#a13f20]/20 focus:border-[#a13f20]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-primary">Secret Access Key</label>
                  <div className="relative">
                    <input
                      type={showR2Secret ? 'text' : 'password'}
                      value={r2Form.secretAccessKey}
                      onChange={(e) => setR2Form({ ...r2Form, secretAccessKey: e.target.value })}
                      placeholder="e.g. e5f6a7b8c9d0..."
                      className="w-full pl-3 pr-10 py-2 text-xs bg-white border border-stone-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#a13f20]/20 focus:border-[#a13f20]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowR2Secret(!showR2Secret)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {showR2Secret ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-primary flex justify-between items-center">
                    <span>Public Bucket URL / Custom Domain</span>
                    <span className="text-[10px] text-stone-400 font-normal">Optional</span>
                  </label>
                  <input
                    type="text"
                    value={r2Form.publicUrl}
                    onChange={(e) => setR2Form({ ...r2Form, publicUrl: e.target.value })}
                    placeholder="https://pub-xxxx.r2.dev or https://notes.yourdomain.com"
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#a13f20]/20 focus:border-[#a13f20]"
                  />
                </div>
              </div>

              {/* Helpful Guide */}
              <div className="text-[11px] text-stone-500 leading-relaxed bg-white px-3.5 py-3 rounded-lg border border-stone-200">
                <p className="font-bold text-stone-800 mb-1">How to get Cloudflare R2 Credentials:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-stone-600">
                  <li>In Cloudflare Dashboard, go to <strong>R2</strong> and create a bucket (e.g. <code className="bg-stone-100 px-1 rounded">mypdfnotes</code>).</li>
                  <li>Click <strong>Manage R2 API Tokens</strong> &rarr; <strong>Create API Token</strong> (Object Read &amp; Write).</li>
                  <li>Copy the Account ID, Access Key ID, and Secret Access Key into <code className="bg-stone-100 font-semibold px-1 rounded text-[#a13f20]">.env</code> or above.</li>
                </ol>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={handleClearR2}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                  Reset
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-full text-xs font-semibold text-stone-600 hover:bg-stone-200 transition-colors"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveR2}
                    disabled={!r2Form.accountId || !r2Form.bucketName || !r2Form.accessKeyId || !r2Form.secretAccessKey || r2Status === 'checking'}
                    className="px-5 py-2 rounded-full bg-primary text-white text-xs font-semibold hover:bg-[#a13f20] transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[15px]">save</span>
                    Save R2 Storage
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'github' && (
            <>
              {/* GitHub Status */}
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-white border border-stone-200 shadow-xs">
                {githubStatus === 'checking' && (
                  <>
                    <span className="material-symbols-outlined text-[18px] text-amber-500 animate-spin">sync</span>
                    <span className="text-xs font-semibold text-stone-700">Checking GitHub token...</span>
                  </>
                )}
                {githubStatus === 'valid' && (
                  <>
                    <span className="material-symbols-outlined text-[18px] text-emerald-500">check_circle</span>
                    <span className="text-xs font-semibold text-emerald-700">Connected to GitHub Repository</span>
                  </>
                )}
                {githubStatus === 'invalid' && (
                  <>
                    <span className="material-symbols-outlined text-[18px] text-red-500">error</span>
                    <span className="text-xs font-semibold text-red-600">Invalid GitHub PAT or no repo scope</span>
                  </>
                )}
                {githubStatus === 'idle' && (
                  <>
                    <span className="material-symbols-outlined text-[18px] text-stone-400">key</span>
                    <span className="text-xs font-semibold text-stone-600">Enter GitHub PAT with repo scope</span>
                  </>
                )}
              </div>

              {envGithubPresent && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2 text-emerald-900 text-xs">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px] mt-0.5">verified</span>
                  <div>
                    <span className="font-semibold">.env Token Active: </span>
                    <span className="font-mono text-[11px]">VITE_GITHUB_TOKEN</span> is configured.
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-primary">GitHub Personal Access Token</label>
                <div className="relative">
                  <input
                    type={showGithubToken ? 'text' : 'password'}
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-white border border-stone-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#a13f20]/20 focus:border-[#a13f20]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGithubToken(!showGithubToken)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {showGithubToken ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={handleClearGitHub}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                  Reset
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-full text-xs font-semibold text-stone-600 hover:bg-stone-200 transition-colors"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveGitHub}
                    disabled={!githubToken.trim() || githubStatus === 'checking'}
                    className="px-5 py-2 rounded-full bg-primary text-white text-xs font-semibold hover:bg-[#a13f20] transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[15px]">save</span>
                    Use GitHub Storage
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
