/**
 * Yan's Portfolio - Admin Backend Server
 * Version: 2.0.0
 *
 * Usage:
 *   npm start        → 启动服务，默认端口 3000
 *   node server.js    → 同上
 *
 * 访问：
 *   主站：http://localhost:3000
 *   后台：http://localhost:3000/admin.html
 */

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== Middleware ==========
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files - 主站
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========== File Upload Config ==========
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = Date.now() + '-' + crypto.randomBytes(6).toString('hex') + ext;
    cb(null, name);
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: function (req, file, cb) {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.mp4', '.webm'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  }
});

// ========== JSON File Helpers ==========
function readJSON(filename) {
  const fp = path.join(__dirname, 'data', filename);
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function writeJSON(filename, data) {
  const fp = path.join(__dirname, 'data', filename);
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8');
}

// ========== Auth Middleware ==========
// 简单 token 验证（基于内存的 session token）
const activeTokens = new Set();

function authMiddleware(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token || !activeTokens.has(token)) {
    return res.status(401).json({ error: '未登录或登录已过期' });
  }
  next();
}

// ========== Auth API ==========

// POST /api/login - 管理员登录
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '请输入账号和密码' });
  }
  const admin = readJSON('admin.json');
  if (!admin) {
    return res.status(500).json({ error: '服务器配置错误' });
  }
  if (username !== admin.username || !bcrypt.compareSync(password, admin.password)) {
    return res.status(401).json({ error: '账号或密码错误' });
  }
  // 生成 token
  const token = crypto.randomBytes(32).toString('hex');
  activeTokens.add(token);
  res.json({ token, username: admin.username });
});

// POST /api/logout - 退出登录
app.post('/api/logout', (req, res) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (token) activeTokens.delete(token);
  res.json({ success: true });
});

// POST /api/change-password - 修改密码
app.post('/api/change-password', authMiddleware, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: '请输入旧密码和新密码' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: '新密码至少 6 位' });
  }
  const admin = readJSON('admin.json');
  if (!bcrypt.compareSync(oldPassword, admin.password)) {
    return res.status(401).json({ error: '旧密码错误' });
  }
  admin.password = bcrypt.hashSync(newPassword, 10);
  writeJSON('admin.json', admin);
  res.json({ success: true });
});

// ========== Favicon Fetcher ==========
function fetchFavicon(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    try {
      let domain = '';
      const parsed = new URL(url);
      domain = parsed.hostname;
      const proto = parsed.protocol === 'https:' ? https : http;

      // Try multiple favicon paths
      const candidates = [
        '/favicon.ico',
        '/apple-touch-icon.png',
        '/apple-touch-icon-180x180.png',
      ];

      let tried = 0;
      function tryNext() {
        if (tried >= candidates.length) return resolve(null);
        const faviconUrl = candidates[tried];
        tried++;

        const req = proto.get({
          hostname: domain,
          port: proto === https ? 443 : 80,
          path: faviconUrl,
          timeout: 5000,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FaviconBot)' }
        }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            // Follow redirect
            try {
              const redirectUrl = new URL(res.headers.location, url);
              if (redirectUrl.protocol === 'https:') {
                https.get(redirectUrl.href, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (r2) => {
                  if (r2.statusCode === 200 && parseInt(r2.headers['content-length'] || '0') > 0) {
                    saveFavicon(r2, domain).then(resolve);
                  } else { tryNext(); }
                }).on('error', () => tryNext());
              } else {
                http.get(redirectUrl.href, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (r2) => {
                  if (r2.statusCode === 200 && parseInt(r2.headers['content-length'] || '0') > 0) {
                    saveFavicon(r2, domain).then(resolve);
                  } else { tryNext(); }
                }).on('error', () => tryNext());
              }
            } catch(e) { tryNext(); }
            return;
          }
          if (res.statusCode !== 200) { res.destroy(); tryNext(); return; }
          const cl = parseInt(res.headers['content-length'] || '0');
          const ct = res.headers['content-type'] || '';
          if (cl === 0 || (!ct.includes('image') && !faviconUrl.endsWith('.ico'))) {
            res.destroy(); tryNext(); return;
          }
          saveFavicon(res, domain).then(resolve);
        });
        req.on('error', () => tryNext());
        req.on('timeout', () => { req.destroy(); tryNext(); });
      }
      tryNext();
    } catch(e) { resolve(null); }
  });
}

function saveFavicon(stream, domain) {
  return new Promise((resolve) => {
    try {
      const safeDomain = domain.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = 'favicon-' + safeDomain + '-' + Date.now() + '.ico';
      const filepath = path.join(__dirname, 'uploads', filename);
      const ws = fs.createWriteStream(filepath);
      stream.pipe(ws);
      ws.on('finish', () => {
        resolve('/uploads/' + filename);
      });
      ws.on('error', () => { resolve(null); });
      stream.on('error', () => { ws.destroy(); resolve(null); });
    } catch(e) { resolve(null); }
  });
}

// ========== Pagination Helper ==========
function paginate(data, page = 1, limit = 12) {
  const total = data.length;
  const totalPages = Math.ceil(total / limit);
  const p = Math.max(1, parseInt(page) || 1);
  const start = (p - 1) * limit;
  const items = data.slice(start, start + limit);
  return { items, total, page: p, limit, totalPages };
}

// ========== Works API ==========

// GET /api/works - 获取作品（支持分页）
app.get('/api/works', (req, res) => {
  const works = readJSON('works.json') || [];
  if (req.query.page) {
    const result = paginate(works, req.query.page, parseInt(req.query.limit) || 12);
    return res.json({
      items: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages
    });
  }
  res.json(works);
});

// POST /api/works - 新增作品（需登录）
app.post('/api/works', authMiddleware, (req, res) => {
  const works = readJSON('works.json') || [];
  const work = {
    id: Date.now().toString(),
    title: req.body.title || '',
    description: req.body.description || '',
    image: req.body.image || '',
    link: req.body.link || '',
    createdAt: new Date().toISOString()
  };
  works.push(work);
  writeJSON('works.json', works);
  res.json(work);
});

// PUT /api/works/:id - 编辑作品（需登录）
app.put('/api/works/:id', authMiddleware, (req, res) => {
  const works = readJSON('works.json') || [];
  const idx = works.findIndex(w => w.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '作品不存在' });
  works[idx] = { ...works[idx], ...req.body, id: works[idx].id, updatedAt: new Date().toISOString() };
  writeJSON('works.json', works);
  res.json(works[idx]);
});

// DELETE /api/works/:id - 删除作品（需登录）
app.delete('/api/works/:id', authMiddleware, (req, res) => {
  let works = readJSON('works.json') || [];
  const idx = works.findIndex(w => w.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '作品不存在' });
  works.splice(idx, 1);
  writeJSON('works.json', works);
  res.json({ success: true });
});

// ========== Articles API ==========

// GET /api/articles - 获取文章（支持分页）
app.get('/api/articles', (req, res) => {
  const articles = readJSON('articles.json') || [];
  if (req.query.page) {
    const result = paginate(articles, req.query.page, parseInt(req.query.limit) || 12);
    return res.json({
      items: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages
    });
  }
  res.json(articles);
});

// POST /api/articles - 新增文章（需登录）
app.post('/api/articles', authMiddleware, (req, res) => {
  const articles = readJSON('articles.json') || [];
  const article = {
    id: Date.now().toString(),
    title: req.body.title || '',
    date: req.body.date || '',
    summary: req.body.summary || '',
    image: req.body.image || '',
    icon: req.body.icon || '✱',
    link: req.body.link || '',
    createdAt: new Date().toISOString()
  };
  articles.push(article);
  writeJSON('articles.json', articles);
  res.json(article);
});

// PUT /api/articles/:id - 编辑文章（需登录）
app.put('/api/articles/:id', authMiddleware, (req, res) => {
  const articles = readJSON('articles.json') || [];
  const idx = articles.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '文章不存在' });
  articles[idx] = { ...articles[idx], ...req.body, id: articles[idx].id, updatedAt: new Date().toISOString() };
  writeJSON('articles.json', articles);
  res.json(articles[idx]);
});

// DELETE /api/articles/:id - 删除文章（需登录）
app.delete('/api/articles/:id', authMiddleware, (req, res) => {
  let articles = readJSON('articles.json') || [];
  const idx = articles.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '文章不存在' });
  articles.splice(idx, 1);
  writeJSON('articles.json', articles);
  res.json({ success: true });
});

// ========== Tools API ==========

// GET /api/tools - 获取工具列表（公开，支持分页）
app.get('/api/tools', (req, res) => {
  const tools = readJSON('tools.json') || [];
  if (req.query.page) {
    const result = paginate(tools, req.query.page, parseInt(req.query.limit) || 12);
    return res.json({
      items: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages
    });
  }
  res.json(tools);
});

// POST /api/tools - 新增工具（需登录）
app.post('/api/tools', authMiddleware, async (req, res) => {
  const tools = readJSON('tools.json') || [];
  const tool = {
    id: Date.now().toString(),
    name: req.body.name || '',
    description: req.body.description || '',
    category: req.body.category || '',
    icon: req.body.icon || '',
    link: req.body.link || '',
    createdAt: new Date().toISOString()
  };
  // Auto-fetch favicon if no icon but has link
  if (!tool.icon && tool.link) {
    try {
      const faviconUrl = await fetchFavicon(tool.link);
      if (faviconUrl) tool.icon = faviconUrl;
    } catch(e) {}
  }
  tools.push(tool);
  writeJSON('tools.json', tools);
  res.json(tool);
});

// PUT /api/tools/:id - 编辑工具（需登录）
app.put('/api/tools/:id', authMiddleware, async (req, res) => {
  const tools = readJSON('tools.json') || [];
  const idx = tools.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '工具不存在' });
  const updated = { ...tools[idx], ...req.body, id: tools[idx].id, updatedAt: new Date().toISOString() };
  // Auto-fetch favicon if icon was cleared but link exists
  if (!updated.icon && updated.link) {
    try {
      const faviconUrl = await fetchFavicon(updated.link);
      if (faviconUrl) updated.icon = faviconUrl;
    } catch(e) {}
  }
  tools[idx] = updated;
  writeJSON('tools.json', tools);
  res.json(tools[idx]);
});

// DELETE /api/tools/:id - 删除工具（需登录）
app.delete('/api/tools/:id', authMiddleware, (req, res) => {
  let tools = readJSON('tools.json') || [];
  const idx = tools.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '工具不存在' });
  tools.splice(idx, 1);
  writeJSON('tools.json', tools);
  res.json({ success: true });
});

// ========== Avatar (Digital Clone) API ==========

// GET /api/avatar - 获取数字分身配置（公开）
app.get('/api/avatar', (req, res) => {
  const avatar = readJSON('avatar.json');
  res.json(avatar || {});
});

// PUT /api/avatar - 更新数字分身配置（需登录）
app.put('/api/avatar', authMiddleware, (req, res) => {
  const avatar = readJSON('avatar.json') || {};
  const updated = { ...avatar, ...req.body };
  writeJSON('avatar.json', updated);
  res.json(updated);
});

// ========== Contact API ==========

// GET /api/contact - 获取联系方式（公开）
app.get('/api/contact', (req, res) => {
  const contact = readJSON('contact.json');
  res.json(contact || {});
});

// PUT /api/contact - 更新联系方式（需登录）
app.put('/api/contact', authMiddleware, (req, res) => {
  const contact = readJSON('contact.json') || {};
  const updated = { ...contact, ...req.body };
  writeJSON('contact.json', updated);
  res.json(updated);
});

// GET /api/check-auth - 检查登录状态（需登录）
app.get('/api/check-auth', authMiddleware, (req, res) => {
  res.json({ valid: true, username: 'admin' });
});

// ========== Upload API ==========

// POST /api/upload - 上传文件（需登录）
app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '请选择文件' });
  }
  res.json({
    url: '/uploads/' + req.file.filename,
    filename: req.file.originalname
  });
});

// ========== SPA Fallback ==========
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ========== Start Server ==========
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║  Yan Portfolio Server v2.0.0         ║');
  console.log('  ║                                      ║');
  console.log('  ║  主站：http://localhost:' + PORT + '        ║');
  console.log('  ║  后台：http://localhost:' + PORT + '/admin.html ║');
  console.log('  ║                                      ║');
  console.log('  ║  默认账号：admin                      ║');
  console.log('  ║  默认密码：admin123                  ║');
  console.log('  ║  （首次登录后请立即修改密码）         ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
  console.log('  按 Ctrl+C 关闭服务');
  console.log('');
});
