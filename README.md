# 📚 mypdfnotes — PDF Notes Manager

A modern, fast web application for reading, organizing, tagging, and managing PDF notes with **Cloudflare R2** and **GitHub Storage**.

---

## ✨ Features

- ⚡ **Zero-Egress Storage with Cloudflare R2**: Fast upload, streaming, and deletion using S3-compatible APIs.
- 🎨 **Visual First Page Thumbnails**: Automatically renders high-quality first-page previews using PDF.js.
- 🏷️ **Tagging & Metadata Management**: Tag notes, categorize by subject, add key highlights and summary formulas.
- ✏️ **Edit & Rename**: Rename notes and files on the fly with live metadata synchronization.
- 🔍 **Instant Search & Filter**: Filter notes by tags, subjects, titles, and highlights with instant search.
- 🔒 **Secure Credentials**: Supports `.env` variables or browser settings storage.

---

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/HarshitOnLoop/mypdfnotes.git
cd mypdfnotes
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Fill in your **Cloudflare R2** credentials:
```env
VITE_R2_ACCOUNT_ID=your_cloudflare_account_id
VITE_R2_ACCESS_KEY_ID=your_r2_access_key_id
VITE_R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
VITE_R2_BUCKET_NAME=mypdfnotes
VITE_R2_PUBLIC_URL=
```

*(Optional: You can also use `VITE_GITHUB_TOKEN=ghp_...` if you prefer GitHub storage).*

### 4. Run Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## 🛠️ Deployment (Vercel / Cloudflare Pages)

1. Connect your repository [`HarshitOnLoop/mypdfnotes`](https://github.com/HarshitOnLoop/mypdfnotes) in Vercel or Cloudflare Pages.
2. In your deployment dashboard, add the environment variables:
   - `VITE_R2_ACCOUNT_ID`
   - `VITE_R2_ACCESS_KEY_ID`
   - `VITE_R2_SECRET_ACCESS_KEY`
   - `VITE_R2_BUCKET_NAME`
   - `VITE_R2_PUBLIC_URL` (optional)
3. Set build command to `npm run build` and output directory to `dist`.

---

## 📄 License
MIT
