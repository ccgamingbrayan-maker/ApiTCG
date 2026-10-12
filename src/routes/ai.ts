import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { supabase } from '../config/supabase';

export const aiRouter = Router();

aiRouter.post('/identify', async (req: Request, res: Response) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const { imageBase64 } = req.body as { imageBase64?: string };

  if (!imageBase64 || imageBase64 === 'data:,' || imageBase64.length < 500) {
    return res.status(400).json({ success: false, error: 'Imagen no válida o vacía. Asegúrate de enfocar la carta.' });
  }

  try {
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = 
      "Eres un analizador OCR experto en One Piece Card Game (Bandai).\n" +
      "Examina la imagen de la carta enfocada por la cámara.\n\n" +
      "REGLAS CRÍTICAS DE EXTRACCIÓN:\n" +
      "1. Prioridad 1: Encuentra el CÓDIGO OFICIAL de la carta en la esquina inferior derecha o inferior (formato exacto: OP##-###, ST##-###, EB##-###, PRB##-###, P-###. Ejemplos: OP01-025, OP05-060, OP13-079, ST01-001, EB01-006, P-033).\n" +
      "2. Prioridad 2: Si es una carta DON!! (lleva las letras 'DON!!' o diseño característico de carta DON!!):\n" +
      "   - Si muestra la ilustración de un personaje reconocible (ej. Luffy, Zoro, Chopper, Yamato, Shanks, Ace, Nami, etc.), responde 'DON!! [Personaje]' (ejemplo: 'DON!! Luffy', 'DON!! Yamato', 'DON!! Chopper').\n" +
      "   - Si es la carta DON!! estándar / básica sin personaje, responde exactamente: 'DON!!'.\n" +
      "3. Prioridad 3: Si no es DON y el código alfanumérico no se lee, lee el NOMBRE del personaje impreso en la parte superior o inferior (ejemplo: Monkey D. Luffy, Roronoa Zoro, Nami, Shanks, Portgas D. Ace).\n" +
      "4. PROHIBICIÓN TOTAL: NUNCA devuelvas números de Poder (5000, 6000, 1000, 12000), Coste (1 al 10), Vidas o Contadores (+1000, +2000). IGNORA esos números por completo.\n" +
      "5. Si no ves ningún código oficial ni nombre de carta claro, responde exactamente: NO_MATCH.\n\n" +
      "Responde ÚNICAMENTE el código oficial o el nombre (o NO_MATCH), sin explicaciones, sin markdown ni comillas.";

    const modelsToTry = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.8-flash'];
    let cardText = '';
    let lastError: unknown = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: 'image/jpeg'
              }
            },
            prompt
          ]
        });

        cardText = response.text?.trim() || '';
        if (cardText) break;
      } catch (err: unknown) {
        lastError = err;
        console.warn(`[AI] Modelo ${modelName} falló, probando respaldo...`);
      }
    }

    if (!cardText && lastError) {
      throw lastError;
    }

    cardText = cardText.replace(/^[`"'\s]+|[`"'\s]+$/g, '').trim();

    // 1. Descartar si es un número suelto (ej. poder 5000, coste 4, etc.)
    if (/^\+?\d+$/.test(cardText)) {
      return res.json({ success: false, error: 'Número de poder/coste ignorado' });
    }

    // 2. Extraer código oficial si viene dentro del texto
    const codeMatch = cardText.match(/\b(OP\d{2}[-\s]?\d{3}|ST\d{1,2}[-\s]?\d{3}|EB\d{2}[-\s]?\d{3}|PRB\d{2}[-\s]?\d{3}|P[-\s]?\d{1,3})\b/i);
    let finalCode = '';
    if (codeMatch) {
      finalCode = codeMatch[1].replace(/\s+/g, '-').toUpperCase();
    }

    if (!finalCode && (cardText.toUpperCase() === 'NO_MATCH' || cardText.toLowerCase().includes('no match') || cardText.length < 3)) {
      return res.json({ success: false, error: 'No se detectó el código de la carta con claridad' });
    }

    // 3. Buscar y validar en Supabase para obtener metadatos de la tarjeta
    let matchedCard: any = null;
    const isDonText = cardText.toLowerCase().includes('don');

    if (finalCode) {
      const { data } = await supabase
        .from('cards')
        .select('id, card_number, name, set_code, set_name, rarity, image_url')
        .ilike('card_number', finalCode)
        .limit(1)
        .maybeSingle();
      if (data) matchedCard = data;
    } else if (isDonText) {
      // Manejo específico para cartas DON!!
      const cleanChar = cardText.replace(/don!*|card/gi, '').trim();
      if (cleanChar.length >= 3) {
        const { data } = await supabase
          .from('cards')
          .select('id, card_number, name, set_code, set_name, rarity, image_url')
          .eq('set_code', 'DON')
          .ilike('name', `%${cleanChar}%`)
          .limit(1)
          .maybeSingle();
        if (data) matchedCard = data;
      }

      // Si no se detectó personaje o no coincidió, asociar a la carta DON!! estándar
      if (!matchedCard) {
        const { data } = await supabase
          .from('cards')
          .select('id, card_number, name, set_code, set_name, rarity, image_url')
          .eq('set_code', 'DON')
          .eq('name', 'DON!! Card')
          .limit(1)
          .maybeSingle();
        if (data) matchedCard = data;
      }
    } else if (cardText && cardText.length >= 3) {
      // Si no coincidió por código pero vino un nombre (ej. "Roronoa Zoro")
      const { data } = await supabase
        .from('cards')
        .select('id, card_number, name, set_code, set_name, rarity, image_url')
        .ilike('name', `%${cardText}%`)
        .limit(1)
        .maybeSingle();
      if (data) matchedCard = data;
    }

    let searchResult = finalCode || cardText;
    if (isDonText) {
      const cleanChar = cardText.replace(/don!*|card/gi, '').trim();
      searchResult = cleanChar ? `DON!! ${cleanChar}` : 'DON!!';
    } else if (matchedCard?.card_number) {
      searchResult = matchedCard.card_number;
    }

    return res.json({ 
      success: true, 
      searchString: searchResult,
      card: matchedCard ? {
        card_number: (isDonText && matchedCard.name === 'DON!! Card') ? 'DON!!' : matchedCard.card_number,
        name: matchedCard.name,
        rarity: matchedCard.rarity || (isDonText ? 'DON' : 'OP'),
        set_code: matchedCard.set_code || (isDonText ? 'DON' : ''),
        image_url: matchedCard.image_url
      } : null
    });
  } catch (err: unknown) {
    let message = err instanceof Error ? err.message : String(err);
    console.error(`[AI] Error identificando carta: ${message}`);
    
    // Si el error de Gemini es un JSON (ej. 503 High Demand), extraer el texto
    try {
      const parsed = JSON.parse(message);
      if (parsed.error && parsed.error.message) {
        message = parsed.error.message;
      }
    } catch(e) {} // Ignorar si no es JSON
    
    if (message.includes('high demand') || message.includes('503')) {
      message = "Los servidores de IA de Google están muy ocupados ahora mismo. Por favor, intenta de nuevo en unos segundos.";
    }
    
    return res.status(500).json({ success: false, error: message });
  }
});
