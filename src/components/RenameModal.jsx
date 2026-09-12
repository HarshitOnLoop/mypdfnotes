import React, { useState, useEffect } from 'react';

export default function RenameModal({ pdf, isOpen, onClose, onSave }) {
  const [fileName, setFileName] = useState('');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pdf) {
      setFileName(pdf.fileName || '');
      setTitle(pdf.title || '');
      setSubject(pdf.subject || '');
      setTags(Array.isArray(pdf.tags) ? [...pdf.tags] : []);
      setNotes(pdf.userNotes || '');
      setTagInput('');
      setSaving(false);
    }
  }, [pdf, isOpen]);

  if (!isOpen || !pdf) return null;

  const handleAddTag = (tagToAdd) => {
    const clean = (tagToAdd || tagInput).trim().replace(/^#/, '');
    if (clean && !tags.includes(clean)) {
      setTags(prev => [...prev, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  const handleKeyDownTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let finalFileName = fileName.trim();
    if (!finalFileName.toLowerCase().endsWith('.pdf')) {
      finalFileName += '.pdf';
    }

    setSaving(true);
    try {
      await onSave({
        oldName: pdf.fileName,
        newName: finalFileName,
        title: title.trim() || finalFileName.replace(/\.pdf$/i, ''),
        subject: subject.trim() || 'Notes',
        tags: tags.length > 0 ? tags : ['Notes'],
        userNotes: notes.trim(),
      });
      onClose();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const quickTagSuggestions = ['Study', 'Exam', 'Reference', 'Formulas', 'Lecture', 'Assignment', 'Summary', 'Cheatsheet'];

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <div className="bg-[#f9f9f7] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-stone-200 transform transition-all duration-200 scale-100">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-white border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-serif font-semibold text-lg">
            <span className="material-symbols-outlined text-[#a13f20] text-[22px]">edit_note</span>
            <h3>Edit Note &amp; Tags</h3>
          </div>
          <button 
            disabled={saving}
            className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-800 transition-colors disabled:opacity-40" 
            onClick={onClose}
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-primary tracking-wide">
              Display Title
            </label>
            <input 
              type="text" 
              required 
              value={title}
              disabled={saving}
              placeholder="e.g. Chapter 4 - Calculus Notes"
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a13f20]/20 focus:border-[#a13f20] text-stone-800 font-medium transition-all"
            />
          </div>

          {/* Subject & Filename */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-primary tracking-wide">
                Subject
              </label>
              <input 
                type="text" 
                value={subject}
                disabled={saving}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Mathematics, Physics" 
                className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a13f20]/20 focus:border-[#a13f20] text-stone-800 font-medium transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-primary flex items-center justify-between">
                <span>File Name</span>
                <span className="text-[10px] font-mono text-stone-400 font-normal">.pdf</span>
              </label>
              <input 
                type="text" 
                required 
                value={fileName}
                disabled={saving}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a13f20]/20 focus:border-[#a13f20] text-stone-800 font-mono text-[11px] transition-all"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-primary flex items-center justify-between">
              <span>Tags &amp; Labels</span>
              <span className="text-[10px] text-stone-400 font-normal">Press Enter or comma to add</span>
            </label>

            {/* Tag Badges Container */}
            <div className="min-h-[42px] p-2 bg-white border border-stone-200 rounded-lg flex flex-wrap items-center gap-1.5 focus-within:ring-2 focus-within:ring-[#a13f20]/20 focus-within:border-[#a13f20] transition-all">
              {tags.map((tag) => (
                <span 
                  key={tag} 
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-stone-100 text-stone-800 text-[11px] font-medium border border-stone-200 shadow-xs"
                >
                  <span className="text-[#a13f20] font-semibold">#</span>
                  {tag}
                  {!saving && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-0.5 text-stone-400 hover:text-red-500 rounded-full flex items-center justify-center transition-colors"
                    >
                      <span className="material-symbols-outlined text-[13px]">close</span>
                    </button>
                  )}
                </span>
              ))}
              <input 
                type="text"
                disabled={saving}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDownTag}
                placeholder={tags.length === 0 ? "Type tag & press enter (e.g. Exam, Ch1)..." : "Add more..."}
                className="flex-1 min-w-[120px] text-xs bg-transparent border-none outline-none text-stone-800 placeholder:text-stone-400 py-0.5"
              />
            </div>

            {/* Suggested quick tags */}
            <div className="flex items-center flex-wrap gap-1 mt-1">
              <span className="text-[10px] text-stone-400 font-medium mr-1">Quick add:</span>
              {quickTagSuggestions
                .filter(st => !tags.includes(st))
                .slice(0, 5)
                .map(st => (
                  <button
                    key={st}
                    type="button"
                    disabled={saving}
                    onClick={() => handleAddTag(st)}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-stone-200/70 hover:bg-[#a13f20]/10 hover:text-[#a13f20] text-stone-600 transition-colors font-sans font-medium"
                  >
                    +{st}
                  </button>
                ))}
            </div>
          </div>

          {/* Highlights / Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-primary">
              Highlights &amp; Summary
            </label>
            <textarea 
              rows="2" 
              disabled={saving}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Important formulas, key takeaways, page bookmarks..." 
              className="w-full px-3.5 py-2 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a13f20]/20 focus:border-[#a13f20] text-stone-800 placeholder:text-stone-400 resize-none transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-200 mt-1">
            <button 
              type="button" 
              disabled={saving}
              className="px-4 py-2 rounded-full text-xs font-semibold text-stone-600 hover:bg-stone-200 transition-colors disabled:opacity-40" 
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving}
              className="px-5 py-2 rounded-full bg-primary text-white text-xs font-semibold hover:bg-[#a13f20] transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-60 disabled:cursor-wait"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving to GitHub...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
