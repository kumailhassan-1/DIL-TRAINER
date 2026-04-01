const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

function buildCors(config) {
  const allowAll = config.corsOrigins.includes("*");

  function isLocalDevOrigin(origin) {
    if (origin === "null") {
      return true;
    }

    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(String(origin || ""));
  }

  return cors({
    origin(origin, callback) {
      const allowLocalDev = config.nodeEnv !== "production" && isLocalDevOrigin(origin);

      if (!origin || allowAll || config.corsOrigins.includes(origin) || allowLocalDev) {
        return callback(null, true);
      }
      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: false,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-Session-Id"]
  });
}

function buildRateLimiter(config) {
  return rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    handler(_req, res) {
      res.status(429).json({
        error: "Too many requests. Please wait a moment and try again."
      });
    }
  });
}

function buildHelmet() {
  return helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  });
}

module.exports = {
  buildCors,
  buildRateLimiter,
  buildHelmet
};
