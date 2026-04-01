# Production AI Conversational Agent Widget

A complete, production-ready AI agent package you can embed in any website with:

- modern responsive chat widget
- dark/light mode
- markdown rendering
- typing indicator
- copy + thumbs feedback
- localStorage persistence + clear chat
- Node.js + Express backend
- SSE live streaming responses
- in-memory conversation store + optional Redis fallback
- configurable system prompt + knowledge base
- tool-calling architecture for future actions
- analytics with privacy-first mode

## 1) Project Tree

```text
ai-agent/
├── .env.example
├── package.json
├── README.md
├── render.yaml
├── vercel.json
├── api/
│   └── index.js
├── knowledge/
│   └── base.json
├── logs/
│   └── .gitkeep
├── public/
│   ├── demo.html
│   ├── widget.css
│   └── widget.js
└── server/
    ├── app.js
    ├── config.js
    ├── index.js
    ├── middleware/
    │   ├── security.js
    │   └── validateChat.js
    ├── routes/
    │   ├── chat.js
    │   └── feedback.js
    ├── services/
    │   ├── analytics.js
    │   ├── conversationStore.js
    │   ├── knowledgeBase.js
    │   ├── openaiAgent.js
    │   └── toolRegistry.js
    └── utils/
        └── sse.js
```

## 2) Local Setup

1. Install dependencies

```bash
npm install
```

2. Create environment file

```bash
cp .env.example .env
```

3. Set at minimum:

- OPENAI_API_KEY
- CORS_ORIGINS

If you are using OpenRouter, also set:

- OPENAI_BASE_URL=https://openrouter.ai/api/v1
- OPENROUTER_SITE_URL=https://your-site.example
- OPENROUTER_APP_NAME=Your App Name

4. Run development server

```bash
npm run dev
```

5. Open demo page

- http://localhost:8787/demo.html

Health check:

- http://localhost:8787/api/health

## 3) API Endpoints

- POST /api/chat
  - request body: sessionId (optional), message (required), metadata (optional)
  - response: SSE stream with events: meta, typing, token, done, error

- POST /api/feedback
  - request body: sessionId, messageId, feedback (up/down), metadata (optional)

- GET /api/health

## 4) Embedding In Any Website

Required embed markup (one script + one div):

```html
<div id="ai-agent-widget"></div>
<script src="https://YOUR_DOMAIN/widget.js" defer></script>
```

Optional customization block before script:

```html
<script>
  window.AIAgentWidgetConfig = {
    apiBaseUrl: "https://YOUR_DOMAIN",
    storageKey: "my-site-assistant",
    agent: {
      name: "Acme AI Concierge",
      avatarUrl: "https://YOUR_SITE/avatar.png",
      welcomeMessage: "Hi! I can help you choose a plan, compare features, or contact sales.",
      subtitle: "Replies in a few seconds"
    },
    labels: {
      inputPlaceholder: "Ask about plans, demos, support...",
      sendButton: "Send",
      clearButton: "Clear",
      closeButton: "Close"
    },
    theme: {
      mode: "auto",
      primaryColor: "#1f9dff"
    }
  };
</script>
<div id="ai-agent-widget"></div>
<script src="https://YOUR_DOMAIN/widget.js" defer></script>
```

## 5) Platform Embed Notes

- Plain HTML: paste snippets in page body.
- WordPress: add snippets in Custom HTML block or footer injection plugin.
- Webflow: use Embed component in page body/footer.
- React: place config in useEffect or index.html, render div in component.

## 6) Agent Personality + Knowledge Customization

### System Prompt

- Use SYSTEM_PROMPT_OVERRIDE in .env for brand voice, boundaries, style.

### Knowledge Base

- Edit knowledge/base.json
- Keep products, FAQs, and policies up to date.

### Model

- Change OPENAI_MODEL (for example gpt-4o, gpt-4o-mini, or any gpt-5-class model available in your account).
- For OpenRouter free tiers, use a free model id such as meta-llama/llama-3.1-8b-instruct:free.

## 7) Tool Calling

Current built-in tools in server/services/toolRegistry.js:

- search_knowledge_base
- handoff_to_human

You can add more tool definitions and execution handlers later for:

- check_order_status
- book_meeting
- create_ticket

## 8) Security + Abuse Protection

Implemented:

- API key server-side only
- CORS allow-list
- Helmet headers
- rate limiting (express-rate-limit)
- input schema validation (zod)
- user input sanitization (sanitize-html)
- basic abuse guard patterns
- graceful SSE error events

## 9) Analytics (Privacy-First)

- Enabled with ENABLE_ANALYTICS=true
- Privacy mode with ANALYTICS_PRIVACY_MODE=true
- Logs written as NDJSON to ANALYTICS_LOG_FILE
- In privacy mode, content is stored as hash + length instead of raw message text

## 10) Deploy To Render

1. Push this folder to GitHub.
2. Create new Render Web Service from repo.
3. Render detects render.yaml automatically.
4. Set required env vars in Render dashboard:
   - OPENAI_API_KEY
   - CORS_ORIGINS
   - OPENAI_MODEL (optional override)
5. Deploy and use your Render domain in embed script.

## 11) Deploy To Vercel

1. Push this folder to GitHub.
2. Import project into Vercel.
3. Add env vars:
   - OPENAI_API_KEY
   - CORS_ORIGINS
4. vercel.json routes /api/* to server function and exposes widget assets.
5. Use generated Vercel domain in embed script.

Note: SSE is supported, but long-running streams depend on platform execution limits.

## 12) Production Checklist

- set strict CORS_ORIGINS
- enable HTTPS only
- add Redis URL for multi-instance memory
- tune rate limits per traffic pattern
- customize knowledge/base.json for real website data
- verify logs retention policy
- rotate OPENAI_API_KEY periodically
