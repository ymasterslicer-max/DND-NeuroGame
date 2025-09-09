
import { GoogleGenAI, Chat, type Content, Modality, Type } from '@google/genai';
import type { GameSettings, CharacterStatus, ImageModel, GameTurn, Npc, InfoType, InfoItem, BestiaryEntry, GameEngineModel } from '../types';
import { GAME_MASTER_PROMPT_RU, GAME_MASTER_PROMPT_EN } from '../constants';
import type { Language } from '../i18n';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const initGameSession = async (settings: GameSettings, language: Language): Promise<{ chat: Chat, initialResponse: string }> => {
  const gameMasterPrompt = language === 'ru' ? GAME_MASTER_PROMPT_RU : GAME_MASTER_PROMPT_EN;
  
  // If there's a learning plan, it becomes the primary narrative style instruction.
  const narrativeStyleInstruction = settings.learningTopic 
    ? settings.narrativeStyle // In learning mode, narrativeStyle contains the full plan
    : (settings.narrativeStyle || (language === 'ru' ? 'Стандартный стиль ГМ' : 'Standard GM style'));

  const modelResponse = language === 'ru' 
    ? "Система понята. Я готов начать приключение. Предоставьте мне настройки для игры." 
    : "System understood. I am ready to begin the adventure. Please provide the game settings.";
  
  const chat = ai.chats.create({
    model: settings.gameEngineModel,
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
    - Стиль повествования: ${narrativeStyleInstruction}
    - Ходов до случайного события: ${settings.eventTimer}
    ${settings.learningTopic ? `- ТЕМА ОБУЧЕНИЯ: ${settings.learningTopic}` : ''}

    Начни игру. Сгенерируй первого персонажа, локацию и ситуацию согласно этим настройкам и правилам. Твой первый ответ должен быть **Ход 1**.
  ` : `
    ## GAME SETTINGS
    - Setting: ${settings.setting}
    - Character Description: ${settings.description}
    - Difficulty: ${settings.difficulty}
    - Narrative Style: ${narrativeStyleInstruction}
    - Turns until random event: ${settings.eventTimer}
    ${settings.learningTopic ? `- LEARNING TOPIC: ${settings.learningTopic}` : ''}

    Start the game. Generate the initial character, location, and situation according to these settings and rules. Your first response must be **Turn 1**.
  `;

  const result = await chat.sendMessage({ message: initialPrompt });
  
  return { chat, initialResponse: result.text };
};

export const recreateChatSession = (history: Content[], model: GameEngineModel): Chat => {
  const chat = ai.chats.create({
      model: model,
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

export const generateImagePrompt = async (
    gameHistory: GameTurn[],
    language: Language
): Promise<string> => {
    const lastTurn = gameHistory.filter(t => t.type === 'game').pop()?.content || (language === 'ru' ? 'Сцена еще не описана.' : 'The scene is not described yet.');

    const promptTemplate = language === 'ru' ? `
        Дай описание сцены для генерации изображения в нейросети во всех деталях. Промт должен быть мегаподробным и исчерпывающе описанным.
        
        **Контекст (последняя игровая сцена):**
        ---
        ${lastTurn}
        ---

        **Сгенерируй промт, следуя этой структуре:**
        - **[Основной объект/Сцена]:** Главный фокус изображения. Опиши кто или что это, его внешний вид, одежду, позу, эмоции и действие.
        - **[Окружение и Фон]:** Где находится объект? Детально опиши локацию, ее элементы, состояние.
        - **[Освещение]:** Самый важный элемент для создания настроения. Укажите источник света, его тип (жесткий/мягкий), цвет, время суток.
        - **[Композиция и Кадр]:** Как "снята" эта сцена? Укажите ракурс, план (крупный, средний), глубину резкости.
        - **[Цветовая палитра]:** Какие цвета доминируют в сцене? Это помогает создать гармоничное изображение.
        - **[Стиль и Детализация]:** Как это должно выглядеть? Фотография, картина маслом, 3D-рендер? Укажите уровень детализации.
    ` : `
        Provide a scene description for generating an image in a neural network in full detail. The prompt must be mega-detailed and exhaustively described.

        **Context (last game scene):**
        ---
        ${lastTurn}
        ---

        **Generate the prompt following this structure:**
        - **[Main Subject/Scene]:** The main focus of the image. Describe who or what it is, its appearance, clothing, pose, emotions, and action.
        - **[Environment and Background]:** Where is the subject located? Describe the location, its elements, and its condition in detail.
        - **[Lighting]:** The most crucial element for setting the mood. Specify the light source, its type (hard/soft), color, and time of day.
        - **[Composition and Framing]:** How is this scene "shot"? Specify the angle, shot type (close-up, medium), and depth of field.
        - **[Color Palette]:** What colors dominate the scene? This helps create a harmonious image.
        - **[Style and Detail]:** How should it look? A photograph, an oil painting, a 3D render? Specify the level of detail.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: promptTemplate,
        });

        return response.text;
    } catch (error) {
        console.error("Image prompt generation failed:", error);
        const errorMessage = error instanceof Error ? error.message : "An error occurred during image prompt generation.";
        throw new Error(`Error: ${errorMessage}`);
    }
};

export const generateImage = async (prompt: string, model: ImageModel): Promise<string> => {
    if (model === 'none') {
        throw new Error("Image generation is disabled.");
    }
    try {
        if (model === 'imagen-4.0-generate-001') {
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: prompt,
                config: {
                  numberOfImages: 1,
                  outputMimeType: 'image/jpeg',
                  aspectRatio: '1:1',
                },
            });
    
            if (response.generatedImages && response.generatedImages.length > 0) {
                const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
                return `data:image/jpeg;base64,${base64ImageBytes}`;
            } else {
                 throw new Error("Image generation response did not contain any images.");
            }

        } else if (model === 'gemini-2.5-flash-image-preview') {
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
                throw new Error("Image generation response did not contain image data.");
            }
        } else {
             throw new Error(`Unsupported image generation model: ${model}`);
        }
    } catch (error) {
        console.error("Image generation failed:", error);
        const errorMessage = error instanceof Error ? error.message : "Произошла неизвестная ошибка при генерации изображения.";
        throw new Error(`Ошибка генерации: ${errorMessage}`);
    }
};

export const generateEnhancedSetting = async (idea: string, language: Language, model: GameEngineModel): Promise<string> => {
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
            model: model,
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Setting enhancement failed:", error);
        throw new Error(language === 'ru' ? "Не удалось улучшить сеттинг." : "Failed to enhance setting.");
    }
};

export const summarizeSettingFromFile = async (fileContent: string, language: Language, model: GameEngineModel): Promise<string> => {
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
            1.  **Core Concept:** In 1-2 sentences, describe the very essence of the. What makes it unique?
            2.  **Key Lore and Backstory:** Highlight the 3-4 most important lore elements or historical events that have shaped the current state of affairs.
            3.  **Main Factions and Powers:** List the key groups, organizations, or peoples. Briefly describe their goals and relationships.
            4.  **Current World Situation:** Describe the main conflict, tension, or recent event that will serve as the starting point for the player's adventure.
            5.  **Unique Features:** Indicate 2-3 interesting features of the world (magic, technology, geography, culture, laws of nature).
            6.  **Atmosphere:** Describe the overall atmosphere of the world (dark, heroic, satirical, mysterious, etc.).

            Your result should be a single, well-structured text that can be immediately used as a setting description to start the game. Do not write anything other than the description itself.
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Setting summarization failed:", error);
        throw new Error(language === 'ru' ? "Не удалось создать сеттинг из файла." : "Failed to create setting from file.");
    }
};

export const generateCharacter = async (setting: string, language: Language, model: GameEngineModel): Promise<string> => {
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
            model: model,
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
    language: Language,
    model: GameEngineModel
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
            model: model,
            contents: prompt,
        });

        return response.text.trim();
    } catch (error) {
        console.error(`Random ${fieldType} generation failed:`, error);
        throw new Error(language === 'ru' ? `Не удалось сгенерировать случайную идею.` : `Failed to generate a random idea.`);
    }
};


export const contactGameMaster = async (
    gameHistory: Content[], 
    userMessage: string, 
    language: Language, 
    model: GameEngineModel, 
    mode: 'gm' | 'expert'
): Promise<AsyncGenerator<string>> => {
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

  let metaPrompt: string;

  if (mode === 'expert') {
      const expertPromptRu = `[ТВОЯ РОЛЬ]
Ты — ИИ-Эксперт, доброжелательный и эрудированный независимый наблюдатель. Ты не являешься частью игрового мира или Гейм-мастером. Твоя задача — анализировать ход игры и давать игроку полезные, основанные на реальных знаниях комментарии, подсказки и советы. Ты как опытный друг, который смотрит игру через плечо и делится мудростью.

[ТВОЯ ЗАДАЧА]
Проанализируй историю игры и последний вопрос/комментарий игрока. Твой ответ должен быть полезным, дружелюбным и многогранным.

[АЛГОРИТМ ТВОИХ ДЕЙСТВИЙ]
1.  **Проанализируй ситуацию:** Что только что произошло в игре? Каков непосредственный контекст вопроса игрока?
2.  **Объясни явление (Связь с реальным миром):** Найди ключевое явление в игровой ситуации (например, тактика переговоров, исторический факт, психологический феномен, природное явление) и объясни его с точки зрения реального мира. Приведи интересные факты или данные. Если игрок пытается взломать замок, расскажи о реальных принципах работы замков. Если он ведет переговоры, расскажи о тактике "добрый/злой полицейский".
3.  **Дай стратегический совет:** Основываясь на своем "опыте", предложи 1-2 общие стратегии или направления для размышления. Не давай прямых спойлеров или решений для текущей головоломки. Твои советы должны быть универсальными. Например: "В таких напряженных ситуациях иногда полезно сменить тему, чтобы разрядить обстановку" или "Помните, что у каждого персонажа есть свои скрытые мотивы. Попытка понять, чего он на самом деле хочет, может открыть новые возможности".
4.  **Стиль ответа:** Говори прямо, дружелюбно и ободряюще. Структурируй свой ответ так, чтобы его было легко читать (например, с помощью коротких абзацев или списков), но избегай жестких, формальных шаблонов.

---
[КОНТЕКСТ ДЛЯ АНАЛИЗА]
История игры:
${historyText}
Вопрос игрока: "${userMessage}"

Дай развернутый, полезный и дружелюбный ответ, следуя своим инструкциям.`;

    const expertPromptEn = `[YOUR ROLE]
You are an AI Expert, a friendly, knowledgeable, and independent observer. You are not part of the game world or the Game Master. Your task is to analyze the game's progress and provide the player with useful comments, hints, and advice based on real-world knowledge. You are like an experienced friend looking over the player's shoulder and sharing wisdom.

[YOUR TASK]
Analyze the game history and the player's latest question/comment. Your response should be helpful, friendly, and multifaceted.

[ALGORITHM OF YOUR ACTIONS]
1.  **Analyze the Situation:** What just happened in the game? What is the immediate context of the player's question?
2.  **Explain the Phenomenon (Real-World Connection):** Identify a key phenomenon in the game situation (e.g., a negotiation tactic, a historical fact, a psychological principle, a natural event) and explain it from a real-world perspective. Provide interesting facts or data. If the player is trying to pick a lock, briefly explain the real principles of how locks work. If they are negotiating, talk about the "good cop/bad cop" tactic.
3.  **Give Strategic Advice:** Based on your "experience," suggest 1-2 general strategies or directions for thought. Do not give direct spoilers or solutions to the current puzzle. Your advice should be universal. For example: "In tense situations like this, sometimes changing the subject can help de-escalate," or "Remember that every character has their own hidden motivations. Trying to understand what they truly want might open up new possibilities."
4.  **Response Style:** Speak directly, in a friendly and encouraging tone. Structure your response for easy readability (e.g., using short paragraphs or lists), but avoid rigid, formal templates.

---
[CONTEXT FOR ANALYSIS]
Game History:
${historyText}
Player's Question: "${userMessage}"

Provide a detailed, helpful, and friendly response following your instructions.`;
    metaPrompt = language === 'ru' ? expertPromptRu : expertPromptEn;
  } else { // 'gm' mode
      metaPrompt = language === 'ru' ? `
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
  }


  try {
    const response = await ai.models.generateContentStream({
        model: model,
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

export const getItemDescription = async (
    itemName: string,
    characterStatus: CharacterStatus | null,
    gameSettings: GameSettings | null,
    language: Language,
    model: GameEngineModel
): Promise<string> => {
    const prompt = language === 'ru' ? `
        Ты — Гейм-мастер текстовой RPG. Игрок осматривает предмет из своего инвентаря.
        Дай этому предмету художественное и атмосферное описание в контексте игры.

        **Сеттинг:** ${gameSettings?.setting || 'Неизвестен'}
        **Персонаж:** ${gameSettings?.description || 'Неизвестен'}
        **Предмет:** ${itemName}

        **Твоя задача:**
        1. Опиши внешний вид предмета (2-3 предложения).
        2. Намекни на его возможное происхождение или назначение.
        3. Если у предмета есть очевидные функции, кратко упомяни их.
        4. Сохраняй стиль повествования игры.

        Отвечай только описанием, без лишних фраз.
    ` : `
        You are the Game Master of a text-based RPG. The player is inspecting an item from their inventory.
        Give this item a flavorful and atmospheric description in the context of the game.

        **Setting:** ${gameSettings?.setting || 'Unknown'}
        **Character:** ${gameSettings?.description || 'Unknown'}
        **Item:** ${itemName}

        **Your task:**
        1. Describe the item's appearance (2-3 sentences).
        2. Hint at its possible origin or purpose.
        3. If the item has obvious functions, briefly mention them.
        4. Maintain the narrative style of the game.

        Respond only with the description, without any extra phrases.
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Item description generation failed:", error);
        throw new Error(language === 'ru' ? "Не удалось получить описание предмета." : "Failed to get item description.");
    }
};

const getInfoListPrompt = (type: InfoType, gameHistoryText: string, language: Language, existingItemNames: string[]): string => {
    const prompts = {
        ru: {
            surroundings: {
                task: "Проанализируй ПОСЛЕДНИЕ 2-3 ХОДА истории игры. Извлеки список всех видимых персонажей (игрок, NPC, враги) и интерактивных объектов (двери, сундуки, рычаги, трупы).",
                grouping: 'Сгруппируй их по категориям: "Персонажи", "Объекты".',
                history: `**Последние ходы:**\n---\n${gameHistoryText}\n---`
            },
            locations: {
                task: "Проанализируй ВСЮ историю игры. Составь список всех посещенных отдельных локаций, комнат и областей.",
                grouping: 'Сгруппируй их по более крупным областям, если это применимо (например, "Таверна \'Соленый пес\'", "Подземелье - 1-й этаж").',
                history: `**История игры:**\n---\n${gameHistoryText}\n---`
            },
            bestiary: {
                task: "Проанализируй ВСЮ историю игры. Составь список всех встреченных или упомянутых монстров, существ и врагов.",
                grouping: 'Сгруппируй их по типу (например, "Нежить", "Гуманоид", "Зверь").',
                history: `**История игры:**\n---\n${gameHistoryText}\n---`
            },
            quests: {
                task: "Проанализируй ВСЮ историю игры. Извлеки список всех активных квестов и заданий.",
                grouping: 'Сгруппируй их по категориям: "Основные", "Дополнительные".',
                history: `**История игры:**\n---\n${gameHistoryText}\n---`
            },
        },
        en: {
            surroundings: {
                task: "Analyze the LAST 2-3 TURNS of the game history. Extract a list of all visible characters (player, NPCs, enemies) and interactive objects (doors, chests, levers, corpses).",
                grouping: 'Group them by category: "Characters", "Objects".',
                history: `**Recent Turns:**\n---\n${gameHistoryText}\n---`
            },
            locations: {
                task: "Analyze the ENTIRE game history. Compile a list of all distinct visited locations, rooms, and areas.",
                grouping: 'Group them by a larger area if applicable (e.g., "Tavern \'The Salty Dog\'", "Dungeon - Floor 1").',
                history: `**Game History:**\n---\n${gameHistoryText}\n---`
            },
            bestiary: {
                task: "Analyze the ENTIRE game history. Compile a list of all monsters, creatures, and enemies encountered or mentioned.",
                grouping: 'Group them by type (e.g., "Undead", "Humanoid", "Beast").',
                history: `**Game History:**\n---\n${gameHistoryText}\n---`
            },
            quests: {
                task: "Analyze the ENTIRE game history. Extract a list of all active quests and tasks.",
                grouping: 'Group them by category: "Main", "Side".',
                history: `**Game History:**\n---\n${gameHistoryText}\n---`
            },
        },
    };

    const selectedPrompt = prompts[language][type];
    const exclusionText = language === 'ru' 
        ? `ВАЖНО: Исключи из своего ответа следующие уже известные названия: ${existingItemNames.join(', ')}. Возвращай только НОВЫЕ элементы.`
        : `IMPORTANT: Exclude the following already known names from your response: ${existingItemNames.join(', ')}. Only return NEW items.`;

    return `
        Ты — ИИ-ассистент для текстовой RPG, который помогает игроку каталогизировать информацию.
        ${selectedPrompt.task}
        ${selectedPrompt.grouping}

        ${existingItemNames.length > 0 ? exclusionText : ''}

        ${selectedPrompt.history}
    `;
};


export const generateInfoList = async (
    type: InfoType,
    gameHistory: GameTurn[],
    language: Language,
    existingItems: (InfoItem | BestiaryEntry)[],
    model: GameEngineModel
): Promise<(InfoItem | BestiaryEntry)[]> => {
    const gameHistoryText = gameHistory
        .slice(type === 'surroundings' ? -5 : 0) // Take last 5 turns for surroundings, all for others
        .map(turn => `${turn.type === 'player' ? '> ' : ''}${turn.content}`)
        .join('\n\n');

    const existingItemNames = existingItems.map(item => item.name);

    const prompt = getInfoListPrompt(type, gameHistoryText, language, existingItemNames);

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            category: { type: Type.STRING },
                        },
                    },
                },
            },
        });
        
        const jsonStr = response.text.trim();
        const parsedData = JSON.parse(jsonStr) as { name: string, category: string }[];
        
        // Add a unique ID to each new item
        const newItems = parsedData.map(item => ({
            ...item,
            id: item.name.toLowerCase().replace(/\s+/g, '_'),
        }));

        return newItems;
    } catch (error) {
        console.error(`Info list generation for "${type}" failed:`, error);
        throw new Error(language === 'ru' ? `Не удалось обновить список: ${type}.` : `Failed to update list: ${type}.`);
    }
};


export const getInfoItemDetails = async (
    itemName: string,
    type: InfoType,
    gameHistory: GameTurn[],
    language: Language,
    model: GameEngineModel
): Promise<{ description: string, stats?: string }> => {
    const gameHistoryText = gameHistory.map(turn => `${turn.type === 'player' ? '> ' : ''}${turn.content}`).join('\n\n');

    const prompts = {
        ru: {
            surroundings: `Ты — ГМ. Дай краткое, атмосферное описание объекта или персонажа '${itemName}'.`,
            locations: `Ты — ГМ. Опираясь на всю историю игры, дай общее, атмосферное описание локации '${itemName}'. Опиши ее внешний вид, ключевые особенности и общую атмосферу, а не то, что происходит в ней в данный момент.`,
            bestiary: `Ты — ГМ. Дай краткое, атмосферное описание этого существа '${itemName}' и укажи его известные характеристики (Здоровье, Броня и т.д.), если они упоминались в бою.`,
            quests: `Ты - ГМ. Дай краткое описание для квеста '${itemName}', основываясь на истории игры.`
        },
        en: {
            surroundings: `You are the GM. Provide a brief, atmospheric description of this object or character '${itemName}'.`,
            locations: `You are the GM. Based on the entire game history, provide a general, atmospheric description of the location '${itemName}'. Describe its appearance, key features, and overall atmosphere, not what is happening there right now.`,
            bestiary: `You are the GM. Provide a brief, atmospheric description of this creature '${itemName}' and list its known stats (Health, Armor, etc.) if mentioned in combat.`,
            quests: `You are the GM. Provide a brief description for the quest '${itemName}', based on the game history.`
        }
    };

    const task = prompts[language][type];
    const properties = {
        description: { type: Type.STRING, description: "The atmospheric description." },
        ...(type === 'bestiary' && { stats: { type: Type.STRING, description: "Known stats, e.g., 'Health: 50/50, Armor: 12'. Can be empty." } })
    };

    const prompt = `
        ${task}
        **Контекст (история игры):**
        ---
        ${gameHistoryText}
        ---
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties,
                },
            },
        });

        const jsonStr = response.text.trim();
        return JSON.parse(jsonStr) as { description: string, stats?: string };
    } catch (error) {
        console.error(`Detail generation for "${itemName}" failed:`, error);
        throw new Error(language === 'ru' ? "Не удалось получить детали." : "Failed to get details.");
    }
};

export const generateAuthorStyle = async (authorName: string, language: Language, setting: string, description: string): Promise<string> => {
    const prompt = language === 'ru' ? `
        Ты — эксперт-литературовед. Проанализируй творчество автора по имени "${authorName}".
        Твоя задача — создать краткую, но емкую инструкцию для языковой модели (LLM), чтобы она могла генерировать текст в стиле этого автора для конкретной текстовой RPG.

        **Инструкция должна включать:**
        1.  **Краткое резюме стиля (2-3 предложения):** В чем самая суть? Например: "Ироничное фэнтези с социальной сатирой и абсурдом, не выходящим за рамки логики".
        2.  **Темы и настроение:** Какие темы автор поднимает чаще всего? Какое настроение преобладает в его произведениях (меланхолия, цинизм, ужас, ирония)?
        3.  **Тип повествования:** От какого лица ведется рассказ? Какова дистанция между рассказчиком и событиями (всезнающий, отстраненный, личный)?
        4.  **Особенности языка:** Какая лексика характерна? Каково строение фраз (короткие, рубленые или длинные, витиеватые)? Есть ли фирменные приемы (повторы, инверсии, метафоры)?
        5.  **Создание атмосферы:** На чем делается акцент? На деталях быта, пейзажах, внутренних монологах, диалогах?
        6.  **Советы для LLM:** Дай 2-3 конкретных совета. Например: "В диалогах используй недосказанность. Эмоции передавай через действия, а не описания. Вставляй в текст стихи и песни".

        **ДОПОЛНИТЕЛЬНЫЙ КОНТЕКСТ ДЛЯ АДАПТАЦИИ:**
        Этот стиль будет использоваться в текстовой RPG со следующими параметрами:
        *   **Сеттинг:** ${setting}
        *   **Персонаж:** ${description}
        *   **Задача:** Если уместно, добавь в "Советы для LLM" один краткий пример того, как можно было бы описать элемент из предоставленного сеттинга или действие персонажа в запрашиваемом стиле. Это необязательно, но сделает инструкцию более наглядной.

        Ответ должен быть только сгенерированной инструкцией, без лишних фраз "Вот инструкция:" и т.п.
    ` : `
        You are an expert literary critic. Analyze the works of the author named "${authorName}".
        Your task is to create a concise but comprehensive instruction set for a language model (LLM) so it can generate text in this author's style for a specific text-based RPG.

        **The instruction must include:**
        1.  **Brief Style Summary (2-3 sentences):** What is the core essence? For example: "Ironic fantasy with social satire and absurdity that stays within the bounds of logic."
        2.  **Themes and Mood:** What themes does the author address most often? What is the prevailing mood in their works (melancholy, cynicism, horror, irony)?
        3.  **Narrative Type:** From what point of view is the story told? What is the distance between the narrator and the events (omniscient, detached, personal)?
        4.  **Language Features:** What vocabulary is characteristic? What is the sentence structure (short, choppy, or long, ornate)? Are there signature techniques (repetition, inversion, metaphors)?
        5.  **Atmosphere Creation:** What is the focus? On details of daily life, landscapes, internal monologues, dialogues?
        6.  **Tips for the LLM:** Provide 2-3 specific tips. For example: "Use understatement in dialogues. Convey emotions through actions, not descriptions. Insert poems and songs into the text."

        **ADDITIONAL CONTEXT FOR ADAPTATION:**
        This style will be used in a text-based RPG with the following parameters:
        *   **Setting:** ${setting}
        *   **Character:** ${description}
        *   **Task:** If appropriate, add one brief example to the "Tips for the LLM" section demonstrating how an element from the provided setting or an action by the character could be described in the requested style. This is optional but will make the instruction more illustrative.

        The response should only be the generated instruction, without extra phrases like "Here is the instruction:" etc.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt
        });
        return response.text;
    } catch (error) {
        console.error("Author style generation failed:", error);
        throw new Error(language === 'ru' ? "Не удалось сгенерировать авторский стиль." : "Failed to generate author style.");
    }
};

export const generateLearningPlan = async (theme: string, language: Language, setting: string, description: string): Promise<string> => {
    const prompt = language === 'ru' ? `### МЕТА-ИНСТРУКЦИЯ ДЛЯ ИИ-МЕТОДИСТА: "СЮЖЕТНЫЙ ПЛАН ОБУЧЕНИЯ"

[РОЛЬ]
Ты — ИИ-Методист и Сценарист мирового класса. Ты создаешь обучающие сценарии, которые бесшовно интегрируются в интерактивные истории (текстовые RPG).

[ЗАДАЧА]
Твоя главная цель — создать исчерпывающий "Сюжетный План Обучения" для навыка: "${theme}". Этот план будет использоваться другим ИИ (Гейм-мастером) для проведения обучающей игровой сессии. План должен быть самодостаточным, предельно четким и сфокусированным на практическом применении навыка через геймплей.

[КОНТЕКСТ ИГРЫ ДЛЯ АДАПТАЦИИ ПЛАНА]
*   **Сеттинг:** ${setting}
*   **Персонаж:** ${description}
*   **Твоя дополнительная задача:** Адаптируй все этапы, примеры и архетипы NPC так, чтобы они органично вписывались в предоставленный сеттинг и соответствовали описанию персонажа. Например, если персонаж — кибер-детектив, то "Наставником" может быть старый хакер, а "Экзаменом" — взлом корпоративной системы защиты с помощью социальной инженерии.

[КЛЮЧЕВЫЕ ПРИНЦИПЫ, КОТОРЫМ ТЫ ДОЛЖЕН СЛЕДОВАТЬ]
1.  **Дидактический подход:** Обучение должно быть явным и структурированным. Каждый ход — это урок.
2.  **От простого к сложному:** План должен вести игрока по нарастающей сложности, от базовых принципов до их комбинации в стрессовой ситуации.
3.  **Контекстуальность:** Все обучающие элементы должны быть органично вплетены в предоставленный сеттинг и сюжет.

[СТРОГАЯ СТРУКТУРА ВЫХОДНОГО ДОКУМЕНТА]
---
### Сюжетный План Обучения: ${theme}

[1. ТЕОРЕТИЧЕСКОЕ ЯДРО: ПРИНЦИПЫ ДЛЯ УСВОЕНИЯ]
Разложи ${theme} на 3-4 ключевых, действенных принципа. Это не сухие определения, а практические правила.
*   **Принцип 1: [Название принципа]** — [Краткое и простое объяснение, как это работает на практике. Пример: **Принцип Зеркала** — Начните с отражения языка тела и тона голоса собеседника, чтобы подсознательно вызвать доверие.]
*   **Принцип 2: [Название принципа]** — [Объяснение...]
*   ...

[2. ДИДАКТИЧЕСКАЯ СТРУКТУРА ХОДА (НОВЫЙ ПОДХОД)]
Это инструкция для Гейм-мастера о том, *как* проводить каждый обучающий ход. Он должен следовать этому циклу неукоснительно.
*   **1. ФАЗА ТЕОРИИ (Начало каждого хода):**
    *   **Введение в Принцип:** В начале каждого нового хода (или при введении нового аспекта навыка) ты должен явно представить игроку теоретический конструкт. Этот конструкт должен быть логическим шагом в освоении общей темы.
    *   **Формат:** \`[ОБУЧАЮЩИЙ МОДУЛЬ: <Название Принципа/Техники>]\`
    *   **Содержание:** Краткое (2-4 предложения) и ясное объяснение сути абстрактного принципа, его цели и основного механизма действия, без привязки к конкретным фразам. Ты должен объяснить "почему это работает", а не "что говорить".
*   **2. ФАЗА ПРАКТИКИ (Основная часть хода):**
    *   **Описание Ситуации:** Сразу после блока с теорией идет стандартное описание игровой ситуации. Ситуация должна быть спроектирована как релевантный сценарий для применения только что объясненного теоретического принципа.
    *   **Четкая Задача:** В строке "Цель" должна быть явно указана задача, требующая применения осваиваемого навыка.
    *   **Запрос Действия:** Стандартный вопрос "Что вы делаете?".
*   **3. ФАЗА АНАЛИЗА (После действия игрока):**
    *   **Обратная Связь:** После того как игрок описывает свое действие, и ты обрабатываешь его (проверка характеристики, результат), ты ОБЯЗАН предоставить детальный, объективный анализ этого действия в специальном блоке. Твой анализ должен оценивать не "правильность" фразы, а соответствие действия изложенному принципу.
    *   **Формат:** \`[АНАЛИЗ ДЕЙСТВИЯ]\`
    *   **Содержание:**
        *   **Если Успех:** Начинай с маркера "ПРИНЦИП УСВОЕН". Четко объясни, почему действие игрока было успешным, ссылаясь на теорию из начала хода. Опиши, как его действия повлияли на внутреннее состояние или позицию NPC. Возможно введение системы очков или уровней навыка для отслеживания прогресса.
        *   **Если Частичный Успех:** Начинай с маркера "ЧАСТИЧНОЕ ПРИМЕНЕНИЕ". Укажи, какая часть действия соответствовала принципу и сработала, а какая — нет. Предложи альтернативный вектор мысли или доработку подхода, чтобы в следующий раз результат был лучше.
        *   **Если Провал:** Начинай с маркера "ОШИБКА ПРИМЕНЕНИЯ". Спокойно и конструктивно объясни, в чем именно действие игрока разошлось с теоретическим принципом. Укажи на ключевую ошибку (например, "вы попытались контролировать собеседника, вместо того чтобы контролировать ситуацию" или "ваше действие было реактивным, а не проактивным"). Предоставь [УРОК] — краткий вывод, который игрок должен запомнить.

[3. АРХЕТИПЫ NPC ДЛЯ ТРЕНИРОВКИ (Адаптированные под контекст)]
Опиши 3 архетипа NPC, которые ГМ сможет использовать как "тренажеры", органично вписав их в сеттинг.
*   **"Наставник":** Персонаж, который мастерски владеет навыком ${theme} и может как демонстрировать его, так и давать тонкие подсказки игроку.
*   **"Тренажер":** Персонаж, на котором удобно отрабатывать навык. Он представляет собой типичную "цель" для применения ${theme}. [Пример для "Убеждения": "Упрямый стражник", "Недоверчивый торговец"].
*   **"Соперник":** Персонаж, который также использует ${theme}, возможно, против игрока. Это создает интересное противостояние и показывает навык с другой стороны.

[4. ПОШАГОВЫЙ СЮЖЕТНЫЙ КАРКАС (Адаптированный под контекст)]
Последовательность игровых этапов.
*   **Этап 1: Наблюдение (Демонстрация).**
    *   **Задача для ГМ:** Создай сцену, где игрок видит, как "Наставник" успешно применяет один из Принципов на "Тренажере".
    *   **Цель игрока:** Увидеть навык в действии и понять его эффект.
*   **Этап 2: Первая Проба (Песочница).**
    *   **Задача для ГМ:** Создай простую, низкорисковую ситуацию, где для успеха достаточно применить один базовый Принцип.
    *   **Цель игрока:** Попробовать применить увиденное. Провал не должен быть катастрофическим.
*   **Этап 3: Комплексная Задача (Комбинация).**
    *   **Задача для ГМ:** Создай проблему, где нужно скомбинировать 2-3 Принципа для достижения цели. Возможно, появится "Соперник".
    *   **Цель игрока:** Осознанно комбинировать изученные аспекты.
*   **Этап 4: "Экзамен" (Мастерство).**
    *   **Задача для ГМ:** Поставь игрока в критическую, напряженную ситуацию с высокими ставками. Решение должно требовать тонкого и виртуозного владения ${theme}.
    *   **Цель игрока:** Продемонстрировать полное понимание навыка в стрессовой ситуации.
*   **Этап 5: Рефлексия (Закрепление).**
    *   **Задача для ГМ:** После "Экзамена" создай короткую спокойную сцену, где "Наставник" или сам игрок в своих мыслях подводит итог, как ${theme} помог(ло) ему достичь цели.
    *   **Цель игрока:** Осознать и закрепить полученный опыт.
---
**ИТОГОВАЯ ИНСТРУКЦИЯ ДЛЯ ГМ (НОВАЯ УНИВЕРСАЛЬНАЯ ВЕРСИЯ):** "Твоя задача — быть личным тренером по навыку, который выберет игрок. Забудь о скрытых намеках. Твой рабочий цикл: 1. Объясни абстрактный принцип. 2. Создай релевантную ситуацию для его применения. 3. Проанализируй действие игрока на соответствие этому принципу. Каждый ход — это структурированный урок. Ты не оцениваешь креативность или отыгрыш, ты оцениваешь понимание и применение предложенной теоретической модели. Твоя цель — не рассказать историю, а провести игрока через эффективный тренинг, используя игровой мир как интерактивный симулятор."
` : `### META-INSTRUCTION FOR AI METHODOLOGIST: "NARRATIVE LEARNING PLAN"

[ROLE]
You are a world-class AI Methodologist and Screenwriter. You create educational scenarios that are seamlessly integrated into interactive stories (text-based RPGs).

[TASK]
Your main goal is to create a comprehensive "Narrative Learning Plan" for the skill: "${theme}". This plan will be used by another AI (the Game Master) to conduct an educational game session. The plan must be self-sufficient, crystal clear, and focused on the practical application of the skill through gameplay.

[GAME CONTEXT FOR PLAN ADAPTATION]
*   **Setting:** ${setting}
*   **Character:** ${description}
*   **Your additional task:** Adapt all stages, examples, and NPC archetypes to fit organically into the provided setting and align with the character description. For instance, if the character is a cyber-detective, the "Mentor" could be an old hacker, and the "Exam" could be hacking a corporate security system using social engineering.

[KEY PRINCIPLES YOU MUST FOLLOW]
1.  **Invisible Learning:** Knowledge should not be delivered as lectures. The player must learn by solving in-game problems and interacting with the world. Learning is a side effect of an interesting story.
2.  **Simple to Complex:** The plan must guide the player through increasing difficulty, from observation to masterful application in a stressful situation.
3.  **Contextuality:** All learning elements must be organically woven into the provided setting and plot.

[STRICT STRUCTURE OF THE OUTPUT DOCUMENT]
---
### Narrative Learning Plan: ${theme}

[1. THEORETICAL CORE: PRINCIPLES TO MASTER]
Break down ${theme} into 3-4 key, actionable principles. These are not dry definitions but practical rules.
*   **Principle 1: [Principle Name]** — [A brief and simple explanation of how it works in practice. Example: **The Mirroring Principle** — Start by reflecting the body language and tone of voice of the other person to subconsciously build trust.]
*   **Principle 2: [Principle Name]** — [Explanation...]
*   ...

[2. PEDAGOGICAL STRATEGY FOR THE GM]
This is an instruction for the Game Master on *how* to teach.
*   **Principle of Organic Integration:** Weave the principles from the "Theoretical Core" into NPC dialogues, situation descriptions, and as possible solutions to problems. *Example: A mentor NPC might use one of the principles on the player themselves and then explain what they did.*
*   **Improved Feedback Loop:**
    *   **On Success:** Describe not only the emotional result but also briefly connect it to the learned principle. *Example: "You successfully defended your right to 15 minutes of rest. It was a small victory, but you feel something straightening up inside you. (Principle 'Small Victory' learned)."*
    *   **On Failure:** Provide not just a hint, but a direct yet gentle suggestion pointing out the incorrectly applied tactic and referring to the correct principle. *Example: "Your attempt to start a fight in response to her yelling failed; you feel even more devastated. (Lesson: Direct confrontation from a weak position is a trap. Perhaps you should have started with something less noticeable, with a 'Micro-Boundary'?)."*
*   **Anti-Patterns (What to Avoid):**
    *   **No Lectures:** Don't turn dialogues into lessons.
    *   **No Tests:** Avoid situations like "Now tell me, which principle should be applied here?". The test of knowledge is solving the in-game problem.

[3. NPC ARCHETYPES FOR TRAINING (Adapted to context)]
Describe 3 NPC archetypes that the GM can use as "training dummies," fitting them organically into the setting.
*   **"The Mentor":** A character who has mastered the skill of ${theme} and can both demonstrate it and give subtle hints to the player.
*   **"The Training Dummy":** A character on whom it is convenient to practice the skill. They represent a typical "target" for applying ${theme}. [Example for "Persuasion": "A stubborn guard," "A distrustful merchant"].
*   **"The Rival":** A character who also uses ${theme}, possibly against the player. This creates an interesting conflict and shows the skill from another perspective.

[4. STEP-BY-STEP NARRATIVE FRAMEWORK (Adapted to context)]
A sequence of game stages.
*   **Stage 1: Observation (Demonstration).**
    *   **GM's Task:** Create a scene where the player sees "The Mentor" successfully apply one of the Principles on "The Training Dummy".
    *   **Player's Goal:** To see the skill in action and understand its effect.
*   **Stage 2: First Attempt (Sandbox).**
    *   **GM's Task:** Create a simple, low-risk situation where applying one basic Principle is enough for success.
    *   **Player's Goal:** To try applying what they've seen. Failure should not be catastrophic.
*   **Stage 3: Complex Task (Combination).**
    *   **GM's Task:** Create a problem where a combination of 2-3 Principles is needed to achieve the goal. "The Rival" might appear.
    *   **Player's Goal:** To consciously combine the learned aspects.
*   **Stage 4: "The Exam" (Mastery).**
    *   **GM's Task:** Put the player in a critical, high-stakes, stressful situation. The solution must require a subtle and masterful command of ${theme}.
    *   **Player's Goal:** To demonstrate a full understanding of the skill under pressure.
*   **Stage 5: Reflection (Reinforcement).**
    *   **GM's Task:** After "The Exam," create a short, calm scene where "The Mentor" or the player's own thoughts summarize how ${theme} helped them achieve their goal.
    *   **Player's Goal:** To recognize and reinforce the learned experience.

[5. PLAYER LEARNING MECHANICS (THEORY INTEGRATION)] — NEW MANDATORY SECTION
This is the most important section. The GM MUST convey theoretical information to the player through the following game mechanics so the player understands WHICH principles they are learning and WHAT tools they have.
*   **1. Internal Monologue ("Voice of Reason"):** In moments of quiet, reflection, or immediately after a failure, the GM must describe the character's thoughts that are a direct reference to the Theoretical Core. This is the voice of their suppressed but still living personality.
    *   *Example after failure:* "You stand there, humiliated and defeated. But somewhere deep in your consciousness, under a layer of fear, a cold, clear thought is born: 'That was stupid. A head-on approach won't work. I need to act differently. Start small...' (Hint towards the 'Micro-Boundary' Principle)."
*   **2. Direct Hints from the Mentor:** The mentor NPC must give not generic phrases, but specific, allegorical advice that directly reflects the learning principles.
    *   *Example dialogue:* The character complains. The Mentor replies: "You're trying to break a wall with your head. Start with the foundation instead. When you have your own foundation, the wall will crumble on its own. (Direct hint towards the 'Micro-Boundary' and 'Egress Plan' Principles)."
*   **3. "Epiphanies" (The "Objective" Principle):** At key moments of manipulation, the GM should give the character "moments of clarity" when they suddenly see the situation from an outside perspective.
    *   *Example:* "She is crying and saying you don't love her. And suddenly, for a second, her tears seem... fake. You see not an unhappy woman, but a child demanding a toy. This isn't love. It's... a demand. (Activation of the 'Objective' Principle)."
---
**FINAL INSTRUCTION FOR THE GM:** "You must not just simulate a cruel world. Your main task is to be a learning interface. Every turn you take must not only describe events but also provide the player with information through Internal Monologue, Mentor's Hints, or Epiphanies, so they understand what strategies and principles are available to them. Failures must be followed by an analysis of mistakes, and successes by reinforcing the correct actions."
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Learning plan generation failed:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        throw new Error(language === 'ru' ? `Ошибка генерации плана: ${errorMessage}` : `Error generating plan: ${errorMessage}`);
    }
};
