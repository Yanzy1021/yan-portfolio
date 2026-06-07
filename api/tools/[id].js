// /api/tools/[id] - PUT (update), DELETE
const https = require('https');
const http = require('http');
const { getData, setData } = require('../lib/kv');
const { requireAuth } = require('../lib/auth');
const { uploadFile } = require('../lib/upload');

async function fetchFavicon(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    try {
      const parsed = new URL(url);
      const domain = parsed.hostname;
      const proto = parsed.protocol === 'https:' ? https : http;
      proto.get({ hostname: domain, path: '/favicon.ico', timeout: 5000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }, (r) => {
        if (r.statusCode === 200) {
          const chunks = [];
          r.on('data', c => chunks.push(c));
          r.on('end', () => {
            const buf = Buffer.concat(chunks);
            uploadFile(buf, 'favicon-' + domain.replace(/[^a-z0-9.-]/gi, '_') + '.ico', 'image/x-icon')
              .then(r => resolve(r ? r.url : null)).catch(() => resolve(null));
          });
        } else { resolve(null); }
      }).on('error', () => resolve(null));
    } catch (e) { resolve(null); }
  });
}

module.exports = async function handler(req, res) {
  const id = req.query.id;
  const method = req.method;

  if (method === 'PUT') {
    const allowed = await requireAuth(req, res);
    if (!allowed) return;
    const tools = await getData('tools') || [];
    const idx = tools.findIndex(t => t.id === id);
    if (idx === -1) return res.status(404).json({ error: '工具不存在' });
    const updated = { ...tools[idx], ...req.body, id: tools[idx].id, updatedAt: new Date().toISOString() };
    if (!updated.icon && updated.link) {
      try { const u = await fetchFavicon(updated.link); if (u) updated.icon = u; } catch(e) {}
    }
    tools[idx] = updated;
    await setData('tools', tools);
    return res.json(tools[idx]);
  }

  if (method === 'DELETE') {
    const allowed = await requireAuth(req, res);
    if (!allowed) return;
    const tools = await getData('tools') || [];
    const idx = tools.findIndex(t => t.id === id);
    if (idx === -1) return res.status(404).json({ error: '工具不存在' });
    tools.splice(idx, 1);
    await setData('tools', tools);
    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
