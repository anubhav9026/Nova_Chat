// frontend/src/services/webhook.ts

const BACKEND_AI_URL = 'http://localhost:5000/api/ai/chat';
const DIRECT_WEBHOOK_URL = 'http://localhost:5678/webhook-test/d29a89eb-e03e-4ecf-8685-1a9c90575600';

// Generate a valid 24-character hex string that MongoDB accepts as an ObjectId
const generateObjectId = (): string => {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const random = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  return timestamp + random;
};

export const AI_BOT_USER = {
  _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', // Fixed valid ObjectId for the AI bot
  name: 'Nova AI',
  email: 'ai@novachat.bot',
  avatar: 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=nova-ai&backgroundColor=818cf8',
  status: 'online' as const,
  about: '🤖 AI Assistant powered by n8n workflow',
};

export const isAIBot = (contactId: string): boolean => {
  return contactId === AI_BOT_USER._id;
};

/**
 * Extracts AI text from various possible n8n payload structures (array, object, raw text)
 */
function parseN8nResponse(data: any): string {
  if (!data) return 'No response received from AI.';

  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return parseN8nResponse(parsed);
    } catch {
      return data;
    }
  }

  // If array response (e.g. [{ output: "..." }])
  if (Array.isArray(data)) {
    if (data.length === 0) return 'AI response was empty.';
    return parseN8nResponse(data[0]);
  }

  // If backend proxy already formatted it
  if (data.reply && typeof data.reply === 'string') {
    return data.reply;
  }

  if (data.json) {
    return parseN8nResponse(data.json);
  }

  const potentialKeys = ['output', 'response', 'reply', 'text', 'message', 'result', 'content', 'answer'];
  for (const key of potentialKeys) {
    if (data[key] && typeof data[key] === 'string') {
      return data[key];
    }
    if (data[key] && typeof data[key] === 'object') {
      return parseN8nResponse(data[key]);
    }
  }

  return JSON.stringify(data, null, 2);
}

export const sendToWebhook = async (message: string, userId?: string): Promise<string> => {
  const payload = {
    message: message.trim(),
    userId: userId || 'anonymous',
    timestamp: new Date().toISOString(),
  };

  // 1. First attempt: Use Backend Proxy (Eliminates Browser CORS issues and adds retry)
  try {
    const res = await fetch(BACKEND_AI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok && data.reply) {
      return data.reply;
    }

    if (!res.ok && data.details) {
      throw new Error(data.details);
    }
  } catch (proxyErr: any) {
    console.warn('Backend proxy failed, trying direct webhook...', proxyErr.message);

    // 2. Second attempt: Direct n8n webhook call
    try {
      const directRes = await fetch(DIRECT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!directRes.ok) {
        const errorText = await directRes.text();
        throw new Error(`n8n webhook returned status ${directRes.status}: ${errorText}`);
      }

      const contentType = directRes.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const directData = await directRes.json();
        return parseN8nResponse(directData);
      }
      return await directRes.text();
    } catch (directErr: any) {
      throw new Error(
        `Could not reach n8n AI workflow: ${directErr.message || 'Make sure n8n is running and workflow is active'}`
      );
    }
  }

  return 'No response received from AI workflow.';
};

/**
 * Create a Message object from the AI bot's response
 */
export const createAIMessage = (content: string, userId: string) => ({
  _id: generateObjectId(),
  sender: AI_BOT_USER._id,
  recipient: userId,
  content,
  read: true,
  createdAt: new Date().toISOString(),
});

/**
 * Create a Message object for the user's outgoing message to the AI bot
 */
export const createUserMessageToAI = (content: string, userId: string) => ({
  _id: generateObjectId(),
  sender: userId,
  recipient: AI_BOT_USER._id,
  content,
  read: true,
  createdAt: new Date().toISOString(),
});
