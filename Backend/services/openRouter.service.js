import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const askAI = async (messages, options = {}) => {
  try {
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('No messages provided to askAI');
    }

    const maxTokens = options.max_tokens || 800;
    const model = options.model || process.env.OPEN_ROUTER_MODEL || 'openai/gpt-4o-mini';

    const payload = {
      model,
      messages,
      max_tokens: maxTokens,
    };

    const response = await axios.post(
      process.env.OPEN_ROUTER_URL,
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.OPEN_ROUTER_APIKEY}`,
          'Content-Type': 'application/json',
        },
        timeout: options.timeout || 30000,
      }
    );

    const content = response?.data?.choices?.[0]?.message?.content;

    if (!content || !content.trim()) {
      throw new Error('Empty response content received from OpenRouter API');
    }

    return content;
  } catch (error) {
    const providerMessage = error?.response?.data?.error?.message;
    const statusCode = error?.response?.status;
    const message = providerMessage || error?.message || 'Error occurred while communicating with OpenRouter';
    const wrappedError = new Error(message);
    if (statusCode) wrappedError.status = statusCode;
    throw wrappedError;
  }
};
