require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

(async () => {
  try {
    // 1. Fetch image
    const res = await fetch('https://tcgplayer-cdn.tcgplayer.com/product/657344_in_200x200.jpg');
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    // 2. Pass to AI
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = "Eres un experto en One Piece TCG. Identifica esta carta. Responde ÚNICAMENTE con el nombre del personaje y su código de set (ej. 'Monkey D. Luffy OP01-120' o 'Imu OP08-052'). No agregues ninguna explicación ni puntuación extra, solo el texto clave para buscarla en una tienda.";

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            data: base64,
            mimeType: 'image/jpeg'
          }
        },
        prompt
      ]
    });
    console.log("AI OUTPUT:", response.text);
  } catch (e) {
    console.error("ERROR:", e.message);
  }
})();
