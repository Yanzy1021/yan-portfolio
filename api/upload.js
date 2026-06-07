// POST /api/upload - 文件上传（需登录）
const { requireAuth } = require('../lib/auth');
const { uploadFile } = require('../lib/upload');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const allowed = await requireAuth(req, res);
  if (!allowed) return;

  // Vercel serverless needs manual body parsing for multipart
  const contentType = req.headers['content-type'] || '';

  if (contentType.includes('multipart/form-data')) {
    try {
      // Simple multipart parser for file uploads
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks);
      const boundary = contentType.split('boundary=')[1];
      if (!boundary) return res.status(400).json({ error: '无效的请求' });

      const parts = body.toString('binary').split('--' + boundary);
      for (const part of parts) {
        if (!part.includes('Content-Disposition')) continue;
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd === -1) continue;
        const headers = part.substring(0, headerEnd);
        const content = part.substring(headerEnd + 4, part.length - 2); // remove \r\n

        // Extract filename
        const fnMatch = headers.match(/filename="([^"]+)"/);
        const ctMatch = headers.match(/Content-Type:\s*(.+)/);
        if (!fnMatch) continue;

        const filename = fnMatch[1];
        const mimeType = ctMatch ? ctMatch[1].trim() : 'application/octet-stream';
        const buffer = Buffer.from(content, 'binary');

        const result = await uploadFile(buffer, filename, mimeType);
        return res.json(result);
      }
      return res.status(400).json({ error: '请选择文件' });
    } catch (e) {
      return res.status(500).json({ error: '上传失败：' + (e.message || '未知错误') });
    }
  }

  // Also support base64 encoded upload
  if (req.body && req.body.file) {
    try {
      const buffer = Buffer.from(req.body.file, 'base64');
      const result = await uploadFile(buffer, req.body.filename || 'upload.png', req.body.mimeType || 'image/png');
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ error: '上传失败：' + (e.message || '未知错误') });
    }
  }

  res.status(400).json({ error: '请选择文件' });
};
