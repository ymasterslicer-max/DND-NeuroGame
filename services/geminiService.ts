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
    - Ходов до случайного события: ${settings.eventTimer}

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

export const generateEnhancedSetting = async (idea: string): Promise<string> => {
    try {
        const prompt = `
            Улучши и детализируй следующую идею для сеттинга текстовой RPG. Преврати ее в полноценное описание мира, готовое для начала игры.

            **Исходная идея:** "${idea}"

            **Инструкции по улучшению:**
            1.  **Лор:** Напиши краткий, но емкий лор сеттинга. Кто населяет этот мир? Какие ключевые фракции или силы существуют?
            2.  **Текущая ситуация:** Опиши, что происходит в мире прямо сейчас. Какой-то крупный конфликт, недавнее событие, напряженная политическая обстановка? Это должно стать отправной точкой для приключения.
            3.  **Предыстория:** Дай краткую предысторию мира, которая привела к текущей ситуации. Что было раньше? Какое великое событие все изменило?
            4.  **Уникальные детали:** Добавь 2-3 интересные, необычные детали или особенности мира. Это могут быть странные законы, уникальные технологии, аномальные явления или культурные особенности. Например: "В этом мире тени живые и могут воровать воспоминания".
            5.  **Небанальный конфликт/Злодей:** Придумай центральный конфликт или главного антагониста. У него должна быть понятная мотивация, философия и цели, а не просто "желание уничтожить мир". Он должен быть злодеем с точки зрения протагониста, но со своей правдой.

            Ответ должен быть одним цельным текстом, который можно сразу вставить в поле "Сеттинг".
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Setting enhancement failed:", error);
        throw new Error("Не удалось улучшить сеттинг.");
    }
};

export const generateCharacter = async (setting: string): Promise<string> => {
    try {
        const prompt = `
            Придумай интересного персонажа для текстовой RPG, который органично вписывается в следующий сеттинг.

            **Сеттинг:** "${setting}"

            **Инструкции по созданию персонажа:**
            Сгенерируй описание персонажа, строго следуя этой структуре:
            - **Имя:**
            - **Род занятий:**
            - **Описание:** (Внешность, характер, ключевые черты. 2-3 предложения)
            - **Предыстория:** (Краткая история жизни, которая объясняет, кто он сейчас. 2-3 предложения)
            - **Конфликт:** (Его главная внутренняя или внешняя проблема, цель или стремление)
            - **Текущая ситуация:** (Что он делает или где находится в самом начале игры)

            Ответ должен быть одним цельным текстом, который можно сразу вставить в поле "Описание персонажа".
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Character generation failed:", error);
        throw new Error("Не удалось сгенерировать персонажа.");
    }
};
