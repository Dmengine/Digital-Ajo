import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const KEY_HEX = process.env.KYC_ENCRYPTION_KEY as string;

const getKey = (): Buffer => {
    if (!KEY_HEX || KEY_HEX.length !== 64) {
        throw new Error('KYC_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
    }
    return Buffer.from(KEY_HEX, 'hex');
};

export const encrypt = (plaintext: string): string => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

export const decrypt = (ciphertext: string): string => {
    const parts = ciphertext.split(':');
    if (parts.length !== 2) throw new Error('Invalid ciphertext format');
    const [ivHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
};
