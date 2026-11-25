/**
 * @file authCrypto.js
 * @description Zero-dependency Node crypto utilities for salted scrypt password hashing,
 * HS256 JWT signing/verification, and employee PII/password sanitization.
 */

const crypto = require('crypto');
let bcrypt = null;
try {
  bcrypt = require('bcryptjs');
} catch (_) {}

const getJwtSecret = () => {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length >= 16) {
    return process.env.JWT_SECRET.trim();
  }
  const seed = process.env.MONGO_URI || 'inforag_ems_default_signing_seed_2026';
  return crypto.createHash('sha256').update(`ems_jwt_v1_${seed}`).digest('hex');
};

const base64UrlEncode = (input) => {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input), 'utf8');
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

const base64UrlDecode = (str) => {
  let padded = String(str).replace(/-/g, '+').replace(/_/g, '/');
  while (padded.length % 4) padded += '=';
  return Buffer.from(padded, 'base64').toString('utf8');
};

/**
 * Hash a plaintext password with a random 16-byte salt using scrypt.
 */
const hashPassword = (plain) => {
  const clean = String(plain || '');
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(clean, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
};

const isPasswordHashed = (stored) => {
  return typeof stored === 'string' && stored.startsWith('scrypt$') && stored.split('$').length === 3;
};

/**
 * Verify plaintext password against either a scrypt hash or legacy plaintext password.
 */
const verifyPassword = (plain, stored) => {
  if (!plain || !stored) return false;
  const cleanPlain = String(plain);
  const cleanStored = String(stored);

  if (isPasswordHashed(cleanStored)) {
    const [, salt, hashHex] = cleanStored.split('$');
    try {
      const derived = crypto.scryptSync(cleanPlain, salt, 64);
      const expected = Buffer.from(hashHex, 'hex');
      if (derived.length !== expected.length) return false;
      return crypto.timingSafeEqual(derived, expected);
    } catch (_) {
      return false;
    }
  }

  // Legacy bcrypt ($2a$ / $2b$ / $2y$) verification support
  if (bcrypt && /^\$2[aby]\$\d{2}\$/.test(cleanStored)) {
    try {
      return bcrypt.compareSync(cleanPlain, cleanStored);
    } catch (_) {
      return false;
    }
  }

  // Legacy plaintext comparison (timing-safe length check)
  const a = Buffer.from(cleanPlain, 'utf8');
  const b = Buffer.from(cleanStored, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

/**
 * Sign a standard HS256 JWT token.
 */
const signJwt = (payload, expiresInSeconds = 7 * 24 * 3600) => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const nowSec = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: nowSec,
    exp: nowSec + expiresInSeconds
  };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const bodyB64 = base64UrlEncode(JSON.stringify(body));
  const data = `${headerB64}.${bodyB64}`;
  const sig = crypto
    .createHmac('sha256', getJwtSecret())
    .update(data)
    .digest();
  return `${data}.${base64UrlEncode(sig)}`;
};

/**
 * Verify an HS256 JWT token and return decoded payload or null if invalid/expired.
 */
const verifyJwt = (token) => {
  if (!token || typeof token !== 'string') return null;
  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;
  const [headerB64, bodyB64, sigB64] = parts;
  try {
    const expectedSig = base64UrlEncode(
      crypto
        .createHmac('sha256', getJwtSecret())
        .update(`${headerB64}.${bodyB64}`)
        .digest()
    );
    const a = Buffer.from(sigB64, 'utf8');
    const b = Buffer.from(expectedSig, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    const payload = JSON.parse(base64UrlDecode(bodyB64));
    if (payload.exp && Math.floor(Date.now() / 1000) > Number(payload.exp)) {
      return null;
    }
    return payload;
  } catch (_) {
    return null;
  }
};

/**
 * Encrypt/decrypt secret for Super Admin Credential Vault using AES-256-GCM.
 */
const getVaultKey = () => crypto.createHash('sha256').update(`ems_vault_v1_${getJwtSecret()}`).digest();

const encryptVaultSecret = (plain) => {
  if (!plain) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getVaultKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1$${iv.toString('hex')}$${tag.toString('hex')}$${enc.toString('hex')}`;
};

const decryptVaultSecret = (stored) => {
  if (!stored || typeof stored !== 'string') return null;
  if (!stored.startsWith('v1$')) return null;
  const parts = stored.split('$');
  if (parts.length !== 4) return null;
  try {
    const [, ivHex, tagHex, encHex] = parts;
    const decipher = crypto.createDecipheriv('aes-256-gcm', getVaultKey(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const dec = Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]);
    return dec.toString('utf8');
  } catch (_) {
    return null;
  }
};

/**
 * Strip passwords and restrict sensitive financial/PII fields from employee API responses.
 */
const sanitizeEmployeeForResponse = (empDoc, viewerUser = null) => {
  if (!empDoc) return empDoc;
  const obj = typeof empDoc.toObject === 'function' ? empDoc.toObject() : { ...empDoc };

  // NEVER expose passwords, hashes, or vault secrets in general directory endpoints
  delete obj.password;
  delete obj.adminVaultPassword;
  delete obj.passwordHistory;
  delete obj.passwordMigratedAt;

  const isPrivileged = Boolean(
    viewerUser && (
      viewerUser.isAdmin ||
      viewerUser.systemRole === 'admin' ||
      viewerUser.systemRole === 'hr' ||
      viewerUser.isDelegatedAdmin ||
      viewerUser.permissions?.manageSalaries ||
      viewerUser.permissions?.manageEmployees ||
      viewerUser.permissions?.allAccess
    )
  );
  const isSelf = Boolean(
    viewerUser && (
      (viewerUser._id && obj._id && String(viewerUser._id) === String(obj._id)) ||
      (viewerUser.employeeCode && obj.employeeCode && String(viewerUser.employeeCode).toUpperCase() === String(obj.employeeCode).toUpperCase())
    )
  );

  // Hide private financial & government ID fields from other non-privileged team members
  if (!isPrivileged && !isSelf) {
    delete obj.salary;
    delete obj.annualCTC;
    delete obj.startingSalary;
    delete obj.salaryBasis;
    delete obj.aadhaar;
    delete obj.upiId;
  }

  return obj;
};

module.exports = {
  hashPassword,
  isPasswordHashed,
  verifyPassword,
  encryptVaultSecret,
  decryptVaultSecret,
  signJwt,
  verifyJwt,
  sanitizeEmployeeForResponse
};
