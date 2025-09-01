import { GoogleGenAI, Chat, type Content, Modality } from '@google/genai';
import type { GameSettings } from '../types';
import { GAME_MASTER_PROMPT } from '../constants';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// FIX: Removed deprecated model initialization. The model is now specified directly in ai.chats.create.

export const initGameSession = async (settings: GameSettings): Promise<{ chat: Chat, initialResponse: string }> => {
  // FIX: Use ai.chats.create instead of the deprecated model.startChat
  const chat = ai.chats.create({
    // FIX: Use the recommended model for text tasks.
    model: 'gemini-2.5-flash',
    history: [
      {
        role: 'user',
        parts: [{ text: GAME_MASTER_PROMPT }],
      },
      {
        role: 'model',
        parts: [{ text: "Система понята. Я готов начать приключение. Предоставьте мне настройки для игры." }],
      },
    ],
  });

  const initialPrompt = `
    ## НАСТРОЙКИ ИГРЫ
    - Сеттинг: ${settings.setting}
    - Описание персонажа: ${settings.description}
    - Сложность: ${settings.difficulty}
    - Стиль повествования: ${settings.narrativeStyle}

    Начни игру. Сгенерируй первого персонажа, локацию и ситуацию согласно этим настройкам и правилам. Твой первый ответ должен быть **Ход 1**.
  `;

  // FIX: Pass message as an object and use .text property for response, correcting both reported errors.
  const result = await chat.sendMessage({ message: initialPrompt });
  
  return { chat, initialResponse: result.text };
};

export const recreateChatSession = (history: Content[]): Chat => {
  const chat = ai.chats.create({
      // FIX: Use the recommended model for text tasks.
      model: 'gemini-2.5-flash',
      history: history,
  });
  return chat;
};


export const sendPlayerAction = async (chat: Chat, action: string): Promise<AsyncGenerator<string>> => {
    // FIX: Pass message as an object for sendMessageStream, correcting the error on line 45.
    const result = await chat.sendMessageStream({ message: action });
    
    const stream = (async function*() {
        // FIX: Iterate directly over result (instead of result.stream) and use .text property (instead of .text()), correcting the error on line 48.
        for await (const chunk of result) {
            // FIX: Add a guard to prevent yielding undefined if a chunk has no text.
            if (chunk.text) {
              yield chunk.text;
            }
        }
    })();
    
    return stream;
};

export const generateImage = async (prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    {
                        text: prompt,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

        if (imagePart && imagePart.inlineData) {
            const base64ImageBytes: string = imagePart.inlineData.data;
            const mimeType = imagePart.inlineData.mimeType;
            return `data:${mimeType};base64,${base64ImageBytes}`;
        } else {
            throw new Error("Не удалось сгенерировать изображение. Ответ не содержит данных изображения.");
        }
    } catch (error) {
        console.error("Image generation failed:", error);
        const errorMessage = error instanceof Error ? error.message : "Произошла неизвестная ошибка при генерации изображения.";
        throw new Error(`Ошибка генерации: ${errorMessage}`);
    }
};