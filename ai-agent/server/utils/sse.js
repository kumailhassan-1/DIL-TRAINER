function initSse(res) {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  res.write("retry: 1500\n\n");
}

function sendSseEvent(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function closeSse(res) {
  if (!res.writableEnded) {
    res.end();
  }
}

function chunkText(input, maxChunkSize = 24) {
  const text = String(input || "");
  if (text.length <= maxChunkSize) {
    return [text];
  }

  const words = text.split(/(\s+)/);
  const chunks = [];
  let current = "";

  for (const token of words) {
    const candidate = `${current}${token}`;
    if (candidate.length > maxChunkSize && current.length > 0) {
      chunks.push(current);
      current = token;
    } else {
      current = candidate;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

module.exports = {
  initSse,
  sendSseEvent,
  closeSse,
  chunkText
};
