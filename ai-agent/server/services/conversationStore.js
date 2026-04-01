const { createClient } = require("redis");

class InMemoryStore {
  constructor({ ttlSeconds, maxHistory }) {
    this.ttlMs = ttlSeconds * 1000;
    this.maxHistory = maxHistory;
    this.map = new Map();

    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [sessionId, value] of this.map.entries()) {
        if (now - value.updatedAt > this.ttlMs) {
          this.map.delete(sessionId);
        }
      }
    }, Math.max(10000, Math.min(60000, this.ttlMs)));

    if (typeof this.cleanupTimer.unref === "function") {
      this.cleanupTimer.unref();
    }
  }

  async getSession(sessionId) {
    if (!this.map.has(sessionId)) {
      this.map.set(sessionId, {
        messages: [],
        updatedAt: Date.now()
      });
    }

    const current = this.map.get(sessionId);
    current.updatedAt = Date.now();
    return current;
  }

  async getMessages(sessionId) {
    const session = await this.getSession(sessionId);
    return session.messages.slice(-this.maxHistory);
  }

  async appendMessage(sessionId, message) {
    const session = await this.getSession(sessionId);
    session.messages.push(message);
    session.messages = session.messages.slice(-this.maxHistory);
    session.updatedAt = Date.now();
  }

  async setFeedback(sessionId, messageId, feedback) {
    const session = await this.getSession(sessionId);
    session.messages = session.messages.map((message) => {
      if (message.id !== messageId) {
        return message;
      }
      return {
        ...message,
        feedback
      };
    });
    session.updatedAt = Date.now();
  }

  async setSession(sessionId, sessionValue) {
    this.map.set(sessionId, {
      messages: Array.isArray(sessionValue.messages) ? sessionValue.messages.slice(-this.maxHistory) : [],
      updatedAt: Date.now()
    });
  }
}

class RedisBackedStore {
  constructor({ redisUrl, ttlSeconds, maxHistory, fallbackStore }) {
    this.ttlSeconds = ttlSeconds;
    this.maxHistory = maxHistory;
    this.fallbackStore = fallbackStore;
    this.client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy(retries) {
          return Math.min(retries * 50, 1000);
        }
      }
    });
    this.ready = false;
    this.connectPromise = null;
  }

  async ensureConnected() {
    if (this.ready) {
      return;
    }

    if (!this.connectPromise) {
      this.connectPromise = this.client.connect().then(() => {
        this.ready = true;
      });
    }

    await this.connectPromise;
  }

  key(sessionId) {
    return `chat:session:${sessionId}`;
  }

  async getSession(sessionId) {
    try {
      await this.ensureConnected();
      const raw = await this.client.get(this.key(sessionId));
      if (!raw) {
        const value = {
          messages: [],
          updatedAt: Date.now()
        };
        await this.client.set(this.key(sessionId), JSON.stringify(value), {
          EX: this.ttlSeconds
        });
        return value;
      }

      const parsed = JSON.parse(raw);
      parsed.updatedAt = Date.now();
      return parsed;
    } catch (_error) {
      return this.fallbackStore.getSession(sessionId);
    }
  }

  async saveSession(sessionId, session) {
    try {
      await this.ensureConnected();
      await this.client.set(this.key(sessionId), JSON.stringify(session), {
        EX: this.ttlSeconds
      });
    } catch (_error) {
      await this.fallbackStore.setSession(sessionId, session);
    }
  }

  async getMessages(sessionId) {
    const session = await this.getSession(sessionId);
    return session.messages.slice(-this.maxHistory);
  }

  async appendMessage(sessionId, message) {
    const session = await this.getSession(sessionId);
    session.messages.push(message);
    session.messages = session.messages.slice(-this.maxHistory);
    session.updatedAt = Date.now();
    await this.saveSession(sessionId, session);
  }

  async setFeedback(sessionId, messageId, feedback) {
    const session = await this.getSession(sessionId);
    session.messages = session.messages.map((message) => {
      if (message.id !== messageId) {
        return message;
      }
      return {
        ...message,
        feedback
      };
    });
    session.updatedAt = Date.now();
    await this.saveSession(sessionId, session);
  }
}

function createConversationStore(config) {
  const fallbackStore = new InMemoryStore({
    ttlSeconds: config.sessionTtlSeconds,
    maxHistory: config.maxHistoryMessages
  });

  if (!config.redisUrl) {
    return fallbackStore;
  }

  return new RedisBackedStore({
    redisUrl: config.redisUrl,
    ttlSeconds: config.sessionTtlSeconds,
    maxHistory: config.maxHistoryMessages,
    fallbackStore
  });
}

module.exports = {
  createConversationStore
};
