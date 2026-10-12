require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

(async () => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: 'Say hello'
    });
    console.log("RESPONSE 1.5-flash:", response.text);
  } catch (e) {
    console.error("ERROR 1.5:", e.message);
  }
})();
