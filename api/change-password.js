// POST /api/change-password
const bcrypt = require('bcryptjs');
const { getData, setData } = require('../lib/kv');
const { requireAuth } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const allowed = await requireAuth(req, res);
  if (!allowed) return;

  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ error: '请输入旧密码和新密码' });
  if (newPassword.length < 6) return res.status(400).json({ error: '新密码至少 6 位' });

  const admin = await getData('admin');
  if (!bcrypt.compareSync(oldPassword, admin.password)) {
    return res.status(401).json({ error: '旧密码错误' });
  }

  admin.password = bcrypt.hashSync(newPassword, 10);
  await setData('admin', admin);
  res.json({ success: true });
};
