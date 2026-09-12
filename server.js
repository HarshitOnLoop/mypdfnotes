import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

const PDF_DIR = path.join(__dirname, 'pdf');
const METADATA_FILE = path.join(__dirname, 'notes-metadata.json');

// Ensure directories exist
if (!fs.existsSync(PDF_DIR)) {
  fs.mkdirSync(PDF_DIR, { recursive: true });
}

// Helper to read and write metadata
function readMetadata() {
  try {
    if (fs.existsSync(METADATA_FILE)) {
      const data = fs.readFileSync(METADATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading metadata file:', err);
  }
  return {};
}

function writeMetadata(meta) {
  try {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(meta, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing metadata file:', err);
  }
}

// Format bytes
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Multer configuration for uploading PDFs
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, PDF_DIR);
  },
  filename: function (req, file, cb) {
    let originalName = file.originalname;
    if (!originalName.toLowerCase().endsWith('.pdf')) {
      originalName += '.pdf';
    }
    const cleanName = originalName.replace(/[<>:"/\\|?*]/g, '_');
    
    let finalPath = path.join(PDF_DIR, cleanName);
    if (fs.existsSync(finalPath)) {
      const ext = path.extname(cleanName);
      const base = path.basename(cleanName, ext);
      cb(null, `${base}_${Date.now()}${ext}`);
    } else {
      cb(null, cleanName);
    }
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  },
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve PDF files directly with inline display headers
app.get('/pdf/:filename', (req, res) => {
  const filename = req.params.filename;
  const safeFilename = path.basename(filename);
  const filePath = path.join(PDF_DIR, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'PDF file not found' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
  res.sendFile(filePath);
});

// 1. GET /api/pdfs: Scan the pdf folder and return all PDFs with metadata
app.get('/api/pdfs', (req, res) => {
  try {
    const files = fs.readdirSync(PDF_DIR);
    const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));
    const metadata = readMetadata();

    let updatedMeta = false;
    const items = pdfFiles.map(fileName => {
      const filePath = path.join(PDF_DIR, fileName);
      const stats = fs.statSync(filePath);

      let fileMeta = metadata[fileName];
      if (!fileMeta) {
        const base = path.basename(fileName, path.extname(fileName));
        const readableTitle = base.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        fileMeta = {
          title: readableTitle,
          subject: 'General Notes',
          tags: ['Notes'],
          isFavorite: false,
          lastReadPage: 1,
          userNotes: ''
        };
        metadata[fileName] = fileMeta;
        updatedMeta = true;
      }

      return {
        fileName: fileName,
        title: fileMeta.title || fileName,
        subject: fileMeta.subject || 'General Notes',
        tags: fileMeta.tags || [],
        isFavorite: !!fileMeta.isFavorite,
        lastReadPage: fileMeta.lastReadPage || 1,
        userNotes: fileMeta.userNotes || '',
        sizeBytes: stats.size,
        sizeFormatted: formatFileSize(stats.size),
        createdAt: stats.birthtime,
        updatedAt: stats.mtime,
        url: `/pdf/${encodeURIComponent(fileName)}`
      };
    });

    if (updatedMeta) {
      writeMetadata(metadata);
    }

    items.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json({
      success: true,
      count: items.length,
      pdfs: items
    });
  } catch (err) {
    console.error('Error fetching PDFs:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. POST /api/rename: Rename a PDF file and update metadata
app.post('/api/rename', (req, res) => {
  try {
    const { oldName, newName, title, subject, tags, userNotes } = req.body;

    if (!oldName || !newName) {
      return res.status(400).json({ success: false, error: 'Both oldName and newName are required.' });
    }

    const safeOldName = path.basename(oldName);
    let safeNewName = path.basename(newName.trim());

    if (!safeNewName.toLowerCase().endsWith('.pdf')) {
      safeNewName += '.pdf';
    }

    safeNewName = safeNewName.replace(/[<>:"/\\|?*]/g, '_');

    const oldPath = path.join(PDF_DIR, safeOldName);
    const newPath = path.join(PDF_DIR, safeNewName);

    if (!fs.existsSync(oldPath)) {
      return res.status(404).json({ success: false, error: `Original file "${safeOldName}" does not exist in pdf/ folder.` });
    }

    const metadata = readMetadata();
    const existingEntry = metadata[safeOldName] || {};

    if (safeOldName !== safeNewName) {
      if (fs.existsSync(newPath)) {
        return res.status(409).json({ success: false, error: `A file named "${safeNewName}" already exists.` });
      }

      fs.renameSync(oldPath, newPath);

      delete metadata[safeOldName];
      metadata[safeNewName] = {
        ...existingEntry,
        title: title || existingEntry.title || safeNewName.replace(/\.pdf$/i, ''),
        subject: subject !== undefined ? subject : existingEntry.subject || 'General Notes',
        tags: tags !== undefined ? tags : existingEntry.tags || ['Notes'],
        userNotes: userNotes !== undefined ? userNotes : existingEntry.userNotes || ''
      };
    } else {
      metadata[safeOldName] = {
        ...existingEntry,
        title: title !== undefined ? title : existingEntry.title,
        subject: subject !== undefined ? subject : existingEntry.subject,
        tags: tags !== undefined ? tags : existingEntry.tags,
        userNotes: userNotes !== undefined ? userNotes : existingEntry.userNotes
      };
    }

    writeMetadata(metadata);

    const stats = fs.statSync(newPath);

    res.json({
      success: true,
      message: `PDF successfully renamed to "${safeNewName}"`,
      pdf: {
        fileName: safeNewName,
        title: metadata[safeNewName].title,
        subject: metadata[safeNewName].subject,
        tags: metadata[safeNewName].tags,
        isFavorite: !!metadata[safeNewName].isFavorite,
        lastReadPage: metadata[safeNewName].lastReadPage || 1,
        userNotes: metadata[safeNewName].userNotes || '',
        sizeBytes: stats.size,
        sizeFormatted: formatFileSize(stats.size),
        createdAt: stats.birthtime,
        updatedAt: stats.mtime,
        url: `/pdf/${encodeURIComponent(safeNewName)}`
      }
    });
  } catch (err) {
    console.error('Error renaming PDF:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. POST /api/upload: Upload new PDF notes
app.post('/api/upload', upload.array('pdfFiles', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No PDF files were uploaded.' });
    }

    const metadata = readMetadata();
    const uploaded = [];

    for (const file of req.files) {
      const fileName = file.filename;
      const base = path.basename(fileName, path.extname(fileName));
      const readableTitle = base.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      metadata[fileName] = {
        title: readableTitle,
        subject: req.body.subject || 'Uploaded Notes',
        tags: req.body.tags ? req.body.tags.split(',').map(t => t.trim()).filter(Boolean) : ['Uploaded'],
        isFavorite: false,
        lastReadPage: 1,
        userNotes: ''
      };

      const stats = fs.statSync(file.path);
      uploaded.push({
        fileName: fileName,
        title: metadata[fileName].title,
        subject: metadata[fileName].subject,
        tags: metadata[fileName].tags,
        sizeBytes: stats.size,
        sizeFormatted: formatFileSize(stats.size),
        url: `/pdf/${encodeURIComponent(fileName)}`
      });
    }

    writeMetadata(metadata);

    res.json({
      success: true,
      message: `Successfully uploaded ${uploaded.length} PDF file(s).`,
      uploaded: uploaded
    });
  } catch (err) {
    console.error('Error uploading PDF:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. DELETE /api/pdfs/:filename: Delete a PDF
app.delete('/api/pdfs/:filename', (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(PDF_DIR, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const metadata = readMetadata();
    if (metadata[filename]) {
      delete metadata[filename];
      writeMetadata(metadata);
    }

    res.json({
      success: true,
      message: `Deleted "${filename}" successfully.`
    });
  } catch (err) {
    console.error('Error deleting PDF:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 PDF Notes Server running at http://localhost:${PORT}`);
  console.log(`📂 PDF Storage Directory: ${PDF_DIR}`);
});
