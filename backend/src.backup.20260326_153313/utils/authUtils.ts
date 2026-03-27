import * as crypto from 'crypto';

export function generateTemporaryPassword(length: number = 12): string {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length)
    .replace(/[^A-Za-z0-9]/g, '') // Remove any non-alphanumeric chars
    .substring(0, length);
}
