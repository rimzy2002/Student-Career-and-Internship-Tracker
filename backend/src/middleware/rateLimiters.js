const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const DEFAULT_AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_AUTH_MAX = 10; // 10 attempts per window

const DEFAULT_AI_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_AI_MAX = 10; // 10 requests per window

/**
 * Creates an authentication rate limiter instance.
 * Protects login, registration, and credential verification routes against brute-force attacks.
 */
function createAuthLimiter(overrides = {}) {
  return rateLimit({
    windowMs: DEFAULT_AUTH_WINDOW_MS,
    limit: DEFAULT_AUTH_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    message: {
      message: 'Too many authentication attempts. Please try again later.'
    },
    handler: (req, res, next, options) => {
      res.status(options.statusCode).json(options.message);
    },
    ...overrides
  });
}

/**
 * Creates an AI matching rate limiter instance.
 * Protects resume/job matching routes from AI provider quota exhaustion.
 * Key strategy prefers cryptographically verified student identity (req.user.userId),
 * falling back to IP address if unauthenticated.
 */
function createAiMatchLimiter(overrides = {}) {
  return rateLimit({
    windowMs: DEFAULT_AI_WINDOW_MS,
    limit: DEFAULT_AI_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    message: {
      message: 'Too many AI matching requests. Please try again later.'
    },
    keyGenerator: (req) => {
      if (req.user && req.user.userId) {
        return `user:${req.user.userId}`;
      }
      return ipKeyGenerator(req.ip || '127.0.0.1');
    },
    handler: (req, res, next, options) => {
      res.status(options.statusCode).json(options.message);
    },
    ...overrides
  });
}

const authLimiter = createAuthLimiter();
const aiMatchLimiter = createAiMatchLimiter();

module.exports = {
  authLimiter,
  aiMatchLimiter,
  createAuthLimiter,
  createAiMatchLimiter,
  DEFAULT_AUTH_WINDOW_MS,
  DEFAULT_AUTH_MAX,
  DEFAULT_AI_WINDOW_MS,
  DEFAULT_AI_MAX
};
