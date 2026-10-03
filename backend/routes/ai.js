// backend/routes/ai.js
const express = require('express');
const router = express.Router();

const DEFAULT_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook-test/d29a89eb-e03e-4ecf-8685-1a9c90575600';

/**
 * Helper to extract human-readable text from varied n8n response payloads
 */
function extractN8nText(data) {
  if (!data) return 'No response content from AI agent.';

  // If string
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return extractN8nText(parsed);
    } catch {
      return data;
    }
  }

  // If array (n8n standard output items)
  if (Array.isArray(data)) {
    if (data.length === 0) return 'AI agent returned an empty list.';
    return extractN8nText(data[0]);
  }

  // If object with nested json property
  if (data.json) {
    return extractN8nText(data.json);
  }

  // Check common keys
  const potentialKeys = ['output', 'response', 'reply', 'text', 'message', 'result', 'content', 'answer'];
  for (const key of potentialKeys) {
    if (data[key] && typeof data[key] === 'string') {
      return data[key];
    }
    if (data[key] && typeof data[key] === 'object') {
      return extractN8nText(data[key]);
    }
  }

  // Fallback: stringify json
  return JSON.stringify(data, null, 2);
}

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
  const { message, userId } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }

  const webhookUrls = [
    DEFAULT_WEBHOOK_URL,
    // Automatically try production URL if test URL fails
    DEFAULT_WEBHOOK_URL.replace('/webhook-test/', '/webhook/'),
  ];

  let lastError = null;

  for (const targetUrl of [...new Set(webhookUrls)]) {
    try {
      console.log(`[AI Webhook] Forwarding message to: ${targetUrl}`);
      const payload = {
        message: message.trim(),
        userId: userId || 'anonymous',
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000), // 30s timeout
      });

      const responseText = await response.text();
      console.log(`[AI Webhook] Response Status (${response.status}):`, responseText.slice(0, 300));

      if (response.ok) {
        let parsedData;
        try {
          parsedData = JSON.parse(responseText);
        } catch {
          parsedData = responseText;
        }

        const reply = extractN8nText(parsedData);
        return res.json({ reply, raw: parsedData });
      } else {
        lastError = `Webhook status ${response.status}: ${responseText}`;
      }
    } catch (err) {
      console.error(`[AI Webhook] Request failed for ${targetUrl}:`, err.message);
      lastError = err.message;
    }
  }

  return res.status(502).json({
    error: 'Failed to communicate with n8n AI workflow.',
    details: lastError,
    hint: 'Make sure n8n is running at http://localhost:5678 and you have clicked "Execute workflow" (for test mode) or toggled the workflow to "Active" (for production mode).',
  });
});

module.exports = router;
