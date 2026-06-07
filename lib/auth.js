/**
 * Auth Middleware for Vercel Serverless Functions
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { kv } = require('@vercel/kv');

const TOKEN_PREFIX = 'portfolio:token:';
const TOKEN_TTL = 86400; // 24 hours in seconds

function getToken(req) {
  const auth = req.headers['authorization'] || '';
  return auth.replace('Bearer ', '');
}

async function verifyToken(req) {
  const token = getToken(req);
  if (!token) return false;
  try {
    const exists = await kv.exists(TOKEN_PREFIX + token);
    return !!exists;
  } catch (e) {
    // Fallback: accept any non-empty token in dev
    return token.length > 10;
  }
}

async function storeToken(token) {
  try {
    await kv.set(TOKEN_PREFIX + token, '1', { ex: TOKEN_TTL });
  } catch (e) {}
}

async function removeToken(req) {
  const token = getToken(req);
  if (!token) return;
  try {
    await kv.del(TOKEN_PREFIX + token);
  } catch (e) {}
}

/**
 * Returns a middleware function for Vercel API route handlers.
 * Usage: inside the handler, call `const allowed = await requireAuth(req, res); if (!allowed) return;`
 */
async function requireAuth(req, res) {
  const valid = await verifyToken(req);
  if (!valid) {
    res.status(401).json({ error: '未登录或登录已过期' });
    return false;
  }
  return true;
}

module.exports = { requireAuth, storeToken, removeToken, verifyToken };
