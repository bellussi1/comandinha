import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';

const scryptParameters = {
  N: 16_384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
} as const;
const saltLength = 16;
const keyLength = 64;

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      keyLength,
      scryptParameters,
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey);
      },
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(saltLength);
  const derivedKey = await deriveKey(password, salt);

  return [
    'scrypt',
    '1',
    String(scryptParameters.N),
    String(scryptParameters.r),
    String(scryptParameters.p),
    salt.toString('base64url'),
    derivedKey.toString('base64url'),
  ].join('$');
}

export async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  const [
    algorithm,
    version,
    cost,
    blockSize,
    parallelization,
    saltValue,
    keyValue,
    extra,
  ] = encoded.split('$');

  if (
    algorithm !== 'scrypt' ||
    version !== '1' ||
    cost !== String(scryptParameters.N) ||
    blockSize !== String(scryptParameters.r) ||
    parallelization !== String(scryptParameters.p) ||
    !saltValue ||
    !keyValue ||
    extra !== undefined
  ) {
    return false;
  }

  const salt = Buffer.from(saltValue, 'base64url');
  const expectedKey = Buffer.from(keyValue, 'base64url');

  if (salt.length !== saltLength || expectedKey.length !== keyLength) {
    return false;
  }

  const actualKey = await deriveKey(password, salt);
  return timingSafeEqual(actualKey, expectedKey);
}
