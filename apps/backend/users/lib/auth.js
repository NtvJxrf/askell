// Loads the root .env as a side effect (no Valkey connection).
import '@askell/shared/env';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Re-export the shared permission helpers so the rest of the backend has a
// single import surface and a single source of truth for permissions.
export { PERMISSIONS, hasPermission, isAdmin } from '@askell/shared/permissions';

const BCRYPT_ROUNDS = 10;

function accessSecret() {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not set. Add it to the root .env file.');
  return secret;
}

function refreshSecret() {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not set. Add it to the root .env file.');
  return secret;
}

function accessMinutes() {
  return Number(process.env.JWT_ACCESS_EXPIRATION_MINUTES || 15);
}

function refreshDays() {
  return Number(process.env.JWT_REFRESH_EXPIRATION_DAYS || 30);
}

/** Access-token lifetime in seconds (handy for clients that schedule refreshes). */
export function accessTokenTtlSeconds() {
  return accessMinutes() * 60;
}

export function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/**
 * Short-lived access token. Payload is kept minimal: id, username, fullname, roles.
 */
export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      fullname: user.fullname,
      roles: user.roles ?? [],
    },
    accessSecret(),
    { expiresIn: `${accessMinutes()}m` }
  );
}

/**
 * Long-lived refresh token. Only carries the user id and a type marker.
 */
export function signRefreshToken(user) {
  return jwt.sign({ sub: user.id, type: 'refresh' }, refreshSecret(), {
    expiresIn: `${refreshDays()}d`,
  });
}

/** Verify an access token. Throws if missing/expired/invalid. */
export function verifyAccessToken(token) {
  const decoded = jwt.verify(token, accessSecret());
  return {
    id: decoded.sub,
    username: decoded.username,
    fullname: decoded.fullname,
    roles: decoded.roles ?? [],
  };
}

/** Verify a refresh token. Throws if missing/expired/invalid/wrong type. */
export function verifyRefreshToken(token) {
  const decoded = jwt.verify(token, refreshSecret());
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  return { id: decoded.sub };
}
