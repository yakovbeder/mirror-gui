import rateLimit from 'express-rate-limit';
import type { RequestHandler } from 'express';

function createLimiter(options: {
  windowMs: number;
  max: number;
  message: string;
}): RequestHandler {
  if (process.env.VITEST === 'true') {
    return (_req, _res, next) => next();
  }

  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: options.message },
  });
}

/** Sensitive routes: pull secret, registry verify, operations, cache, catalog sync */
export const strictRateLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Too many requests. Please try again later.',
});

/** Mutating config and folder routes */
export const moderateRateLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: 'Too many requests. Please try again later.',
});
