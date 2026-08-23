import rateLimit from "express-rate-limit";

// Task 02: auth endpoints limited to 10 requests/minute/IP.
export const authRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests, please try again later",
    code: "RATE_LIMIT_EXCEEDED",
    details: {},
  },
});