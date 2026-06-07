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

// ========== Works API ==========

// GET /api/works - 获取所有作品（公开）
app.get('/api/works', (req, res) => {
  const works = readJSON('works.json') || [];
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

// GET /api/articles - 获取所有文章（公开）
app.get('/api/articles', (req, res) => {
  const articles = readJSON('articles.json') || [];
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
