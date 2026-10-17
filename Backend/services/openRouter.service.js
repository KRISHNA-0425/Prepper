import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export const askAI = async (messages) => {
  try {
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('No messages provided to askAI');
    }

    const response = await axios.post(
      process.env.OPEN_ROUTER_URL,
      {
        model: process.env.OPEN_ROUTER_MODEL,
        messages: messages,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPEN_ROUTER_APIKEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const content = response?.data?.choices?.[0]?.message?.content;

    if (!content || !content.trim()) {
      throw new Error('Empty response content received from OpenRouter API');
    }

    return content;
  } catch (error) {
    throw new Error(error?.message || 'Error occurred while communicating with OpenRouter');
  }
};