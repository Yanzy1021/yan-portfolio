// /api/tools - GET (list/paginate), POST (create)
const https = require('https');
const http = require('http');
const { getData, setData, paginate } = require('../lib/kv');
const { requireAuth } = require('../lib/auth');
const { uploadFile } = require('../lib/upload');

async function fetchFavicon(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    try {
      const parsed = new URL(url);
      const domain = parsed.hostname;
      const proto = parsed.protocol === 'https:' ? https : http;
      const candidates = ['/favicon.ico', '/apple-touch-icon.png'];
      let tried = 0;
      function tryNext() {
        if (tried >= candidates.length) return resolve(null);
        proto.get({ hostname: domain, path: candidates[tried], timeout: 5000,
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
          } else { tryNext(); }
        }).on('error', () => tryNext());
        tried++;
      }
      tryNext();
    } catch (e) { resolve(null); }
  });
}

module.exports = async function handler(req, res) {
  const method = req.method;
  if (method === 'GET') {
    const tools = await getData('tools') || [];
    if (req.query.page) {
      const result = paginate(tools, req.query.page, parseInt(req.query.limit) || 12);
      return res.json({
        items: result.items, total: result.total,
        page: result.page, limit: result.limit, totalPages: result.totalPages
      });
    }
    return res.json(tools);
  }

  if (method === 'POST') {
    const allowed = await requireAuth(req, res);
    if (!allowed) return;
    const tools = await getData('tools') || [];
    const tool = {
      id: Date.now().toString(),
      name: req.body.name || '',
      description: req.body.description || '',
      category: req.body.category || '',
      icon: req.body.icon || '',
      link: req.body.link || '',
      createdAt: new Date().toISOString()
    };
    if (!tool.icon && tool.link) {
      try { const u = await fetchFavicon(tool.link); if (u) tool.icon = u; } catch(e) {}
    }
    tools.push(tool);
    await setData('tools', tools);
    return res.json(tool);
  }

  res.status(405).json({ error: 'Method not allowed' });
};
