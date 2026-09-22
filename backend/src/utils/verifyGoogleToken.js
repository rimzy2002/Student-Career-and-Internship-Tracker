const jwt = require('jsonwebtoken');

const GOOGLE_CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const DEFAULT_FIREBASE_PROJECT_ID = 'careertrack-fde11';

let cachedKeys = null;
let keysExpiry = 0;

/**
 * Fetch Google's public certificates for Firebase Authentication.
 * Caches keys in memory according to the Cache-Control header.
 */
async function getGooglePublicKeys() {
  const now = Date.now();
  if (cachedKeys && now < keysExpiry) {
    return cachedKeys;
  }

  const res = await fetch(GOOGLE_CERTS_URL);
  if (!res.ok) {
    throw new Error('Failed to retrieve Google public authentication certificates');
  }

  // Parse Cache-Control header max-age for caching
  const cacheControl = res.headers.get('cache-control') || '';
  const match = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSeconds = match ? parseInt(match[1], 10) : 3600;

  cachedKeys = await res.json();
  keysExpiry = now + maxAgeSeconds * 1000;
  return cachedKeys;
}

/**
 * Cryptographically verifies a Firebase / Google ID token.
 * 
 * Rules enforced:
 * 1. Token must be present and a non-empty string.
 * 2. Token header must declare algorithm 'RS256' and a valid 'kid'.
 * 3. The 'kid' must match one of Google's public signing certificates.
 * 4. Token signature must be valid against Google's public certificate.
 * 5. 'aud' must equal the configured Firebase project ID.
 * 6. 'iss' must equal https://securetoken.google.com/<FIREBASE_PROJECT_ID>.
 * 7. 'sub' must be a non-empty string representing the user's Firebase UID.
 * 8. Token must not be expired.
 *
 * @param {string} idToken - The raw JWT identity token from Firebase client SDK.
 * @returns {Promise<object>} The verified token payload containing email, name, uid, etc.
 */
async function verifyGoogleToken(idToken) {
  if (!idToken || typeof idToken !== 'string') {
    const err = new Error('Authentication token is required');
    err.name = 'TokenMissingError';
    throw err;
  }

  const decodedHeader = jwt.decode(idToken, { complete: true });
  if (!decodedHeader || !decodedHeader.header || !decodedHeader.header.kid) {
    const err = new Error('Malformed token: missing header or key identifier (kid)');
    err.name = 'TokenMalformedError';
    throw err;
  }

  if (decodedHeader.header.alg !== 'RS256') {
    const err = new Error('Invalid token algorithm; expected RS256');
    err.name = 'TokenInvalidAlgorithmError';
    throw err;
  }

  const keys = await getGooglePublicKeys();
  const publicKey = keys[decodedHeader.header.kid];
  if (!publicKey) {
    const err = new Error('Public certificate not found for token key identifier');
    err.name = 'TokenKeyNotFoundError';
    throw err;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID;
  const expectedIssuer = `https://securetoken.google.com/${projectId}`;

  const payload = jwt.verify(idToken, publicKey, {
    algorithms: ['RS256'],
    audience: projectId,
    issuer: expectedIssuer
  });

  if (!payload.sub || typeof payload.sub !== 'string') {
    const err = new Error('Invalid token subject');
    err.name = 'TokenInvalidSubjectError';
    throw err;
  }

  return payload;
}

module.exports = {
  verifyGoogleToken,
  getGooglePublicKeys
};
