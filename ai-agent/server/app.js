const path = require("path");
const express = require("express");
const { config } = require("./config");
const { buildCors, buildRateLimiter, buildHelmet } = require("./middleware/security");
const { createConversationStore } = require("./services/conversationStore");
const { createOpenAiAgent } = require("./services/openaiAgent");
const { createAnalytics } = require("./services/analytics");
const { createChatRouter } = require("./routes/chat");
const { createFeedbackRouter } = require("./routes/feedback");

function createApp() {
  const app = express();

  const store = createConversationStore(config);
  const analytics = createAnalytics({
    enabled: config.enableAnalytics,
    privacyMode: config.analyticsPrivacyMode,
    logFile: config.analyticsLogFile
  });

  const agent = createOpenAiAgent(config);

  app.use(buildHelmet());
  app.use(buildCors(config));
  app.use(express.json({ limit: "50kb" }));

  const limiter = buildRateLimiter(config);
  app.use("/api/chat", limiter);

  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      ok: true,
      env: config.nodeEnv,
      model: config.openaiModel
    });
  });

  app.use(
    "/api/chat",
    createChatRouter({
      config,
      store,
      agent,
      analytics
    })
  );

  app.use(
    "/api/feedback",
    createFeedbackRouter({
      store,
      analytics
    })
  );

  app.use(express.static(path.join(process.cwd(), "public")));

  app.use((err, _req, res, _next) => {
    const isCorsError = err && typeof err.message === "string" && err.message.includes("CORS");
    const status = isCorsError ? 403 : 500;

    res.status(status).json({
      error: isCorsError ? "Blocked by CORS policy" : "Internal server error"
    });
  });

  return app;
}

module.exports = {
  createApp
};
