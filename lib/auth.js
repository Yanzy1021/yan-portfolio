/**
 * Auth Middleware for Vercel Serverless Functions
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Redis } = require('@upstash/redis');

const TOKEN_PREFIX = 'portfolio:token:';
const TOKEN_TTL = 86400; // 24 hours in seconds

let _redis = null;
function getRedis() {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (url && token) {
    _redis = new Redis({ url, token });
    return _redis;
  }
  return null;
}

function getToken(req) {
  const auth = req.headers['authorization'] || '';
  return auth.replace('Bearer ', '');
}

async function verifyToken(req) {
  const token = getToken(req);
  if (!token) return false;
  try {
    const redis = getRedis();
    if (redis) {
      const val = await redis.get(TOKEN_PREFIX + token);
      return val !== null && val !== undefined;
    }
    // Fallback: accept any non-empty token when Redis unavailable
    return token.length > 10;
  } catch (e) {
    return token.length > 10;
  }
}

async function storeToken(token) {
  try {
    const redis = getRedis();
    if (redis) {
      await redis.set(TOKEN_PREFIX + token, '1', { ex: TOKEN_TTL });
    }
  } catch (e) {}
}

async function removeToken(req) {
  const token = getToken(req);
  if (!token) return;
  try {
    const redis = getRedis();
    if (redis) {
      await redis.del(TOKEN_PREFIX + token);
    }
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
