import { GoogleGenAI, Chat, type Content, Modality } from '@google/genai';
import type { GameSettings } from '../types';
import { GAME_MASTER_PROMPT_RU, GAME_MASTER_PROMPT_EN } from '../constants';
import type { Language } from '../i18n';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const initGameSession = async (settings: GameSettings, language: Language): Promise<{ chat: Chat, initialResponse: string }> => {
  const gameMasterPrompt = language === 'ru' ? GAME_MASTER_PROMPT_RU : GAME_MASTER_PROMPT_EN;
  const modelResponse = language === 'ru' 
    ? "Система понята. Я готов начать приключение. Предоставьте мне настройки для игры." 
    : "System understood. I am ready to begin the adventure. Please provide the game settings.";
  
  const chat = ai.chats.create({
    model: 'gemini-2.5-pro',
    history: [
      {
        role: 'user',
        parts: [{ text: gameMasterPrompt }],
      },
      {
        role: 'model',
        parts: [{ text: modelResponse }],
      },
    ],
  });

  const initialPrompt = language === 'ru' ? `
    ## НАСТРОЙКИ ИГРЫ
    - Сеттинг: ${settings.setting}
    - Описание персонажа: ${settings.description}
    - Сложность: ${settings.difficulty}
    - Стиль повествования: ${settings.narrativeStyle}
    - Ходов до случайного события: ${settings.eventTimer}

    Начни игру. Сгенерируй первого персонажа, локацию и ситуацию согласно этим настройкам и правилам. Твой первый ответ должен быть **Ход 1**.
  ` : `
    ## GAME SETTINGS
    - Setting: ${settings.setting}
    - Character Description: ${settings.description}
    - Difficulty: ${settings.difficulty}
    - Narrative Style: ${settings.narrativeStyle}
    - Turns until random event: ${settings.eventTimer}

    Start the game. Generate the initial character, location, and situation according to these settings and rules. Your first response must be **Turn 1**.
  `;

  const result = await chat.sendMessage({ message: initialPrompt });
  
  return { chat, initialResponse: result.text };
};

export const recreateChatSession = (history: Content[]): Chat => {
  const chat = ai.chats.create({
      model: 'gemini-2.5-pro',
      history: history,
  });
  return chat;
};


export const sendPlayerAction = async (chat: Chat, action: string): Promise<AsyncGenerator<string>> => {
    const result = await chat.sendMessageStream({ message: action });
    
    const stream = (async function*() {
        for await (const chunk of result) {
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

export const generateEnhancedSetting = async (idea: string, language: Language): Promise<string> => {
    try {
        const prompt = language === 'ru' ? `
            Улучши и детализируй следующую идею для сеттинга текстовой RPG. Преврати ее в полноценное описание мира, готовое для начала игры.

            **Исходная идея:** "${idea}"

            **Инструкции по улучшению:**
            1.  **Лор:** Напиши краткий, но емкий лор сеттинга. Кто населяет этот мир? Какие ключевые фракции или силы существуют?
            2.  **Текущая ситуация:** Опиши, что происходит в мире прямо сейчас. Какой-то крупный конфликт, недавнее событие, напряженная политическая обстановка? Это должно стать отправной точкой для приключения.
            3.  **Предыстория:** Дай краткую предысторию мира, которая привела к текущей ситуации. Что было раньше? Какое великое событие все изменило?
            4.  **Уникальные детали:** Добавь 2-3 интересные, необычные детали или особенности мира. Это могут быть странные законы, уникальные технологии, аномальные явления или культурные особенности. Например: "В этом мире тени живые и могут воровать воспоминания".
            5.  **Небанальный конфликт/Злодей:** Придумай центральный конфликт или главного антагониста. У него должна быть понятная мотивация, философия и цели, а не просто "желание уничтожить мир". Он должен быть злодеем с точки зрения протагониста, но со своей правдой.

            Ответ должен быть одним цельным текстом, который можно сразу вставить в поле "Сеттинг".
        ` : `
            Enhance and detail the following idea for a text-based RPG setting. Turn it into a full-fledged world description ready for the start of a game.

            **Original Idea:** "${idea}"

            **Enhancement Instructions:**
            1.  **Lore:** Write a brief but rich lore for the setting. Who inhabits this world? What are the key factions or powers?
            2.  **Current Situation:** Describe what is happening in the world right now. A major conflict, a recent event, a tense political situation? This should be the starting point for the adventure.
            3.  **Backstory:** Provide a brief history of the world that led to the current situation. What came before? What great event changed everything?
            4.  **Unique Details:** Add 2-3 interesting, unusual details or features of the world. These could be strange laws, unique technologies, anomalous phenomena, or cultural peculiarities. For example: "In this world, shadows are alive and can steal memories."
            5.  **Non-trivial Conflict/Villain:** Create a central conflict or main antagonist. They should have a clear motivation, philosophy, and goals, not just a "desire to destroy the world." They should be a villain from the protagonist's perspective, but with their own truth.

            The response should be a single, cohesive text that can be immediately pasted into the "Setting" field.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Setting enhancement failed:", error);
        throw new Error(language === 'ru' ? "Не удалось улучшить сеттинг." : "Failed to enhance setting.");
    }
};

export const summarizeSettingFromFile = async (fileContent: string, language: Language): Promise<string> => {
    try {
        const prompt = language === 'ru' ? `
            Выступи в роли эксперта по созданию миров и гейм-дизайнера. Тебе предоставлен текст, который может быть частью книги, статьей или набором заметок. Твоя задача — проанализировать этот текст и извлечь из него квинтэссенцию сеттинга для текстовой RPG.

            **Исходный текст:**
            ---
            ${fileContent}
            ---

            **Инструкции по созданию описания сеттинга:**
            1.  **Основная концепция:** В 1-2 предложениях опиши самую суть мира. Что делает его уникальным?
            2.  **Ключевой лор и предыстория:** Выдели 3-4 самых важных элемента лора или исторических событий, которые сформировали текущее положение дел.
            3.  **Основные фракции и силы:** Перечисли ключевые группы, организации или народы. Кратко опиши их цели и взаимоотношения.
            4.  **Текущая ситуация в мире:** Опиши главный конфликт, напряжение или недавнее событие, которое станет отправной точкой для приключения игрока.
            5.  **Уникальные черты:** Укажи 2-3 интересные особенности мира (магия, технологии, география, культура, законы природы).
            6.  **Атмосфера:** Опиши общую атмосферу мира (мрачная, героическая, сатирическая, таинственная и т.д.).

            Твой результат должен быть одним цельным, хорошо структурированным текстом, который можно немедленно использовать в качестве описания сеттинга для начала игры. Не пиши ничего, кроме самого описания.
        ` : `
            Act as an expert world-builder and game designer. You are provided with a text that could be part of a book, an article, or a set of notes. Your task is to analyze this text and extract the essence of a setting for a text-based RPG.

            **Source Text:**
            ---
            ${fileContent}
            ---

            **Instructions for Creating the Setting Description:**
            1.  **Core Concept:** In 1-2 sentences, describe the very essence of the world. What makes it unique?
            2.  **Key Lore and Backstory:** Highlight the 3-4 most important lore elements or historical events that have shaped the current state of affairs.
            3.  **Main Factions and Powers:** List the key groups, organizations, or peoples. Briefly describe their goals and relationships.
            4.  **Current World Situation:** Describe the main conflict, tension, or recent event that will serve as the starting point for the player's adventure.
            5.  **Unique Features:** Indicate 2-3 interesting features of the world (magic, technology, geography, culture, laws of nature).
            6.  **Atmosphere:** Describe the overall atmosphere of the world (dark, heroic, satirical, mysterious, etc.).

            Your result should be a single, well-structured text that can be immediately used as a setting description to start the game. Do not write anything other than the description itself.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Setting summarization failed:", error);
        throw new Error(language === 'ru' ? "Не удалось создать сеттинг из файла." : "Failed to create setting from file.");
    }
};

export const generateCharacter = async (setting: string, language: Language): Promise<string> => {
    try {
        const prompt = language === 'ru' ? `
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
        ` : `
            Invent an interesting character for a text-based RPG who fits organically into the following setting.

            **Setting:** "${setting}"

            **Character Creation Instructions:**
            Generate a character description strictly following this structure:
            - **Name:**
            - **Occupation:**
            - **Description:** (Appearance, personality, key traits. 2-3 sentences)
            - **Backstory:** (A brief life story that explains who they are now. 2-3 sentences)
            - **Conflict:** (Their main internal or external problem, goal, or ambition)
            - **Current Situation:** (What they are doing or where they are at the very beginning of the game)

            The response should be a single, cohesive text that can be immediately pasted into the "Character Description" field.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Character generation failed:", error);
        throw new Error(language === 'ru' ? "Не удалось сгенерировать персонажа." : "Failed to generate character.");
    }
};

export const generateRandomIdea = async (
    fieldType: 'setting' | 'description' | 'style', 
    language: Language
): Promise<string> => {
    let subject = '';
    let example = '';

    switch(fieldType) {
        case 'setting':
            subject = language === 'ru' ? 'сеттинга для текстовой RPG' : 'a text-based RPG setting';
            example = language === 'ru' ? 'Например: Город, построенный на панцире гигантской черепахи, которая медленно плывет по морю хаоса.' : 'For example: A city built on the shell of a giant turtle that slowly swims through a sea of chaos.';
            break;
        case 'description':
            subject = language === 'ru' ? 'персонажа для текстовой RPG' : 'a character for a text-based RPG';
            example = language === 'ru' ? 'Например: Библиотекарь, который тайно является хранителем запретных знаний и вынужден скрываться.' : 'For example: A librarian who is secretly the keeper of forbidden knowledge and is forced to hide.';
            break;
        case 'style':
            subject = language === 'ru' ? 'стиля повествования для текстовой RPG' : 'a narrative style for a text-based RPG';
            example = language === 'ru' ? 'Например: Готический хоррор с элементами космической оперы.' : 'For example: Gothic horror with elements of a space opera.';
            break;
    }

    const prompt = language === 'ru' ? `
        Придумай краткую, но вдохновляющую идею для ${subject}.
        Идея должна быть изложена максимум в двух предложениях.
        Ответ должен быть только текстом идеи, без лишних фраз.
        ${example}
    ` : `
        Come up with a brief but inspiring idea for ${subject}.
        The idea must be described in a maximum of two sentences.
        The response should be only the text of the idea, without any extra phrases.
        ${example}
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: prompt,
        });

        return response.text.trim();
    } catch (error) {
        console.error(`Random ${fieldType} generation failed:`, error);
        throw new Error(language === 'ru' ? `Не удалось сгенерировать случайную идею.` : `Failed to generate a random idea.`);
    }
};


export const contactGameMaster = async (gameHistory: Content[], userMessage: string, language: Language): Promise<AsyncGenerator<string>> => {
  const historyText = gameHistory.map(content => {
      const partsText = content.parts.map(part => {
          if ('text' in part && typeof part.text === 'string') {
              return part.text;
          }
          return '[non-text part]';
      }).join('\n');
      return `${content.role}:\n${partsText}`;
  }).join('\n\n---\n\n');
  
  const gameMasterPrompt = language === 'ru' ? GAME_MASTER_PROMPT_RU : GAME_MASTER_PROMPT_EN;

  const metaPrompt = language === 'ru' ? `
    Ты — Гейм-мастер (GM) текстовой RPG. Игрок хочет поговорить с тобой вне игры (out-of-character).
    Тебе предоставлена полная история вашей игры и изначальные правила, по которым ты работаешь.
    Твоя задача — ответить на вопрос игрока с позиции дружелюбного и полезного GM, а не из игрового мира. Ты можешь прояснять правила, отвечать на вопросы о сюжете, давать подсказки или соглашаться на изменения, которые предлагает игрок.

    ### ИЗНАЧАЛЬНЫЕ ПРАВИЛА ИГРЫ:
    ${gameMasterPrompt}

    ### ИСТОРИЯ ИГРЫ:
    ${historyText}

    ### ВОПРОС ИГРОКА (вне игры):
    "${userMessage}"

    Твой ответ должен быть прямым, полезным и адресованным игроку. Говори как человек, а не как игровой персонаж.
  ` : `
    You are the Game Master (GM) of a text-based RPG. The player wants to talk to you out-of-character.
    You have been provided with the complete history of your game and the initial rules you are operating under.
    Your task is to answer the player's question from the perspective of a friendly and helpful GM, not from within the game world. You can clarify rules, answer questions about the plot, give hints, or agree to changes the player suggests.

    ### INITIAL GAME RULES:
    ${gameMasterPrompt}

    ### GAME HISTORY:
    ${historyText}

    ### PLAYER'S QUESTION (out-of-character):
    "${userMessage}"

    Your response should be direct, helpful, and addressed to the player. Speak like a person, not a game character.
  `;

  try {
    const response = await ai.models.generateContentStream({
        model: "gemini-2.5-pro",
        contents: metaPrompt,
    });

    const stream = (async function*() {
        for await (const chunk of response) {
            if (chunk.text) {
              yield chunk.text;
            }
        }
    })();

    return stream;
  } catch (error) {
      console.error("GM contact failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Произошла неизвестная ошибка при связи с ГМ.";
      throw new Error(`Ошибка: ${errorMessage}`);
  }
};