/**
 * Upload helper - uses Vercel Blob in production, local fs in dev
 */
const { put } = require('@vercel/blob');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const ALLOWED = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.mp4', '.webm'];

async function uploadFile(buffer, originalName, mimeType) {
  const ext = path.extname(originalName).toLowerCase();
  if (!ALLOWED.includes(ext)) throw new Error('不支持的文件类型');

  try {
    // Vercel Blob upload
    const filename = Date.now() + '-' + crypto.randomBytes(6).toString('hex') + ext;
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: mimeType || 'application/octet-stream',
    });
    return { url: blob.url, filename: originalName };
  } catch (e) {
    // Fallback: local file
    const filename = Date.now() + '-' + crypto.randomBytes(6).toString('hex') + ext;
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const fp = path.join(uploadsDir, filename);
    fs.writeFileSync(fp, buffer);
    return { url: '/uploads/' + filename, filename: originalName };
  }
}

module.exports = { uploadFile };
