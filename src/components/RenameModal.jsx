import React, { useState, useEffect } from 'react';

export default function RenameModal({ pdf, onClose, onSave }) {
  const [fileName, setFileName] = useState('');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (pdf) {
      setFileName(pdf.fileName || '');
      setTitle(pdf.title || '');
      setSubject(pdf.subject || '');
      setTags((pdf.tags || []).join(', '));
      setNotes(pdf.userNotes || '');
    }
  }, [pdf]);

  if (!pdf) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    let finalFileName = fileName.trim();
    if (!finalFileName.toLowerCase().endsWith('.pdf')) {
      finalFileName += '.pdf';
    }

    const tagList = tags.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean);

    onSave({
      oldName: pdf.fileName,
      newName: finalFileName,
      title: title.trim(),
      subject: subject.trim(),
      tags: tagList,
      userNotes: notes.trim()
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#f9f9f7] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-stone-200 transform transition-transform duration-200">
        <div className="px-6 py-4 bg-white border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-serif font-semibold">
            <span className="material-symbols-outlined text-[#a13f20] text-[20px]">edit_note</span>
            <h3>Edit PDF Note &amp; Details</h3>
          </div>
          <button 
            className="w-7 h-7 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500" 
            onClick={onClose}
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-primary flex justify-between">
              <span>PDF File Name</span>
              <span className="text-[10px] font-mono text-stone-400">.pdf extension</span>
            </label>
            <input 
              type="text" 
              required 
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#f4f4f2] border border-stone-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-black/40 font-mono"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-primary">Display Title</label>
            <input 
              type="text" 
              required 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#f4f4f2] border border-stone-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-black/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-primary">Subject</label>
              <input 
                type="text" 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Mathematics" 
                className="w-full px-3 py-2 text-xs bg-[#f4f4f2] border border-stone-200 rounded-lg focus:outline-none focus:bg-white"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-primary">Tags</label>
              <input 
                type="text" 
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. Exam, Ch1" 
                className="w-full px-3 py-2 text-xs bg-[#f4f4f2] border border-stone-200 rounded-lg focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-primary">Key Highlights / Notes</label>
            <textarea 
              rows="2" 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Summary or formulas for this sheaf..." 
              className="w-full px-3 py-2 text-xs bg-[#f4f4f2] border border-stone-200 rounded-lg focus:outline-none focus:bg-white resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
            <button 
              type="button" 
              className="px-4 py-1.5 rounded-full text-xs font-medium text-stone-600 hover:bg-stone-200" 
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-1.5 rounded-full bg-primary text-white text-xs font-medium hover:bg-[#a13f20] transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">save</span> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
