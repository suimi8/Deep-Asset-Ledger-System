import JSEncrypt from 'jsencrypt';
import axios from 'axios';

let publicKeyCache = null;

async function getPublicKey() {
    if (publicKeyCache) return publicKeyCache;
    try {
        const res = await axios.get('/api/users/public-key');
        publicKeyCache = res.data.public_key;
        return publicKeyCache;
    } catch (err) {
        console.error("Failed to fetch public key", err);
        return null;
    }
}

export async function encryptPassword(password) {
    const publicKey = await getPublicKey();
    if (!publicKey) return password; // Fallback if encryption fails (should not happen in production)

    const encryptor = new JSEncrypt();
    encryptor.setPublicKey(publicKey);
    return encryptor.encrypt(password);
}
