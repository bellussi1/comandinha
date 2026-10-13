import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';

const legacyScryptParameters = {
  N: 16_384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
} as const;
const currentScryptParameters = {
  N: 131_072,
  r: 8,
  p: 1,
  maxmem: 256 * 1024 * 1024,
} as const;
const saltLength = 16;
const keyLength = 64;

type ScryptParameters = typeof legacyScryptParameters | typeof currentScryptParameters;

function deriveKey(
  password: string,
  salt: Buffer,
  parameters: ScryptParameters,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      keyLength,
      parameters,
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
  const derivedKey = await deriveKey(password, salt, currentScryptParameters);

  return [
    'scrypt',
    '2',
    String(currentScryptParameters.N),
    String(currentScryptParameters.r),
    String(currentScryptParameters.p),
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

  const parameters =
    version === '1'
      ? legacyScryptParameters
      : version === '2'
        ? currentScryptParameters
        : undefined;

  if (
    algorithm !== 'scrypt' ||
    !parameters ||
    cost !== String(parameters.N) ||
    blockSize !== String(parameters.r) ||
    parallelization !== String(parameters.p) ||
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

  const actualKey = await deriveKey(password, salt, parameters);
  return timingSafeEqual(actualKey, expectedKey);
}
