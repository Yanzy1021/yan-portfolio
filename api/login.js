// POST /api/login
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getData } = require('../lib/kv');
const { storeToken } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '请输入账号和密码' });

  const admin = await getData('admin');
  if (!admin) return res.status(500).json({ error: '服务器配置错误' });

  if (username !== admin.username || !bcrypt.compareSync(password, admin.password)) {
    return res.status(401).json({ error: '账号或密码错误' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  await storeToken(token);
  res.json({ token, username: admin.username });
};
