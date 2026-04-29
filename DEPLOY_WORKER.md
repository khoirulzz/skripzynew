# Instruksi Deploy Cloudflare Worker

Untuk memperbaiki error 404 pada `/api/ai/embed-batch`, deploy ulang worker dengan script terbaru:

1. **Login ke Cloudflare:**
   ```bash
   npx wrangler auth login
   ```

2. **Deploy Worker:**
   ```bash
   npx wrangler deploy
   ```

3. **Pastikan Environment Variables sudah di-set di Cloudflare Dashboard:**
   - `WORKER_SECRET`: skripzy1234
   - `FIREBASE_PROJECT_ID`: skripzy-4fbaa
   - `FIREBASE_WEB_API_KEY`: API key web Firebase project
   - `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, etc. (untuk group_1, group_2, dll.)
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `CORE_API_KEY` (jika digunakan)

Worker name: `skripzy-app`
URL: `https://skripzy-app.workers.dev`

Setelah deploy, endpoint berikut akan tersedia:
- `/api/ai/embed-batch`
- `/public/forms/:slug`
- `/public/forms/:slug/responses`
- `/workspace/forms/publish`
- `/workspace/ai/chapter-generate`
