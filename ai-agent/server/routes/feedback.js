const express = require("express");
const { z } = require("zod");

const feedbackSchema = z.object({
  sessionId: z.string().trim().min(3).max(120),
  messageId: z.string().trim().min(3).max(120),
  feedback: z.enum(["up", "down"]),
  metadata: z
    .object({
      pageUrl: z.string().trim().max(500).optional()
    })
    .optional()
});

function createFeedbackRouter({ store, analytics }) {
  const router = express.Router();

  router.post("/", async (req, res) => {
    const parsed = feedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid feedback payload"
      });
      return;
    }

    await store.setFeedback(parsed.data.sessionId, parsed.data.messageId, parsed.data.feedback);

    analytics.logFeedbackEvent({
      sessionId: parsed.data.sessionId,
      messageId: parsed.data.messageId,
      feedback: parsed.data.feedback,
      metadata: parsed.data.metadata || {}
    });

    res.status(200).json({
      success: true
    });
  });

  return router;
}

module.exports = {
  createFeedbackRouter
};
