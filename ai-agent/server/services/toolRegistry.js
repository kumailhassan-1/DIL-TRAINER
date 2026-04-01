const { readKnowledgeBase } = require("./knowledgeBase");

function getToolDefinitions() {
  return [
    {
      type: "function",
      function: {
        name: "search_knowledge_base",
        description: "Search website knowledge base entries by topic keywords.",
        parameters: {
          type: "object",
          properties: {
            topic: {
              type: "string",
              description: "Topic keyword such as pricing, onboarding, integrations, refunds, support"
            }
          },
          required: ["topic"],
          additionalProperties: false
        }
      }
    },
    {
      type: "function",
      function: {
        name: "handoff_to_human",
        description: "Returns support escalation details for human follow-up.",
        parameters: {
          type: "object",
          properties: {
            reason: {
              type: "string",
              description: "Why escalation is needed"
            }
          },
          required: ["reason"],
          additionalProperties: false
        }
      }
    }
  ];
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value || "{}");
  } catch (_error) {
    return {};
  }
}

async function executeToolCall(toolCall) {
  const fnName = toolCall.function.name;
  const args = safeJsonParse(toolCall.function.arguments);

  if (fnName === "search_knowledge_base") {
    const data = readKnowledgeBase();
    const topic = String(args.topic || "").trim().toLowerCase();

    const productMatches = data.products.filter((item) => {
      const text = `${item.name} ${item.description}`.toLowerCase();
      return text.includes(topic);
    });

    const faqMatches = data.faqs.filter((faq) => {
      const text = `${faq.question} ${faq.answer}`.toLowerCase();
      return text.includes(topic);
    });

    const policyMatches = data.policies.filter((policy) => {
      const text = `${policy.title} ${policy.summary}`.toLowerCase();
      return text.includes(topic);
    });

    return {
      topic,
      products: productMatches,
      faqs: faqMatches,
      policies: policyMatches
    };
  }

  if (fnName === "handoff_to_human") {
    return {
      escalation: true,
      reason: String(args.reason || "User requested human support"),
      contactEmail: "kumailhassanpixel@gmail.com",
      contactPage: "/contact.html"
    };
  }

  return {
    error: "Unknown tool requested"
  };
}

module.exports = {
  getToolDefinitions,
  executeToolCall
};
