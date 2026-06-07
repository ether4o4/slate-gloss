import axios from 'axios';

const API_KEY = 'sk-17e8163a0e404c69b4bd1718a93d39bf';
const BASE_URL = 'https://api.deepseek.com/v1';

export const sendMessageToDeepSeek = async (messages: any[]) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/chat/completions`,
      {
        model: 'deepseek-chat',
        messages: messages,
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.choices[0].message;
  } catch (error) {
    console.error('DeepSeek API Error:', error);
    throw error;
  }
};
