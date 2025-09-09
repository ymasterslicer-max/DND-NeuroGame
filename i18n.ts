import { useCallback } from 'react';

export const translations = {
  ru: {
    // Common
    error: 'Ошибка',
    loading: 'Загрузка...',
    language: 'Язык',
    theme: 'Тема',
    light: 'Светлая',
    dark: 'Темная',
    send: 'Отправить',
    unknownError: 'Неизвестная ошибка.',
    none: 'Нет',
    info: 'Инфо',
    generate: 'Сгенерировать',
    accept: 'Принять',
    fast: 'Быстрый',
    quality: 'Качественный',

    // App Header
    appTitle: 'Gemini Text Adventure RPG',
    appSubtitle: 'Ваша история, которую формируют ваши решения.',

    // GameSetup
    createYourAdventure: 'Создайте свое приключение',
    settingLabel: 'Сеттинг (где происходит история?)',
    settingPlaceholder: 'Например: Забытое королевство в облаках',
    createSettingFromFile: 'Создать сеттинг из текстового файла',
    enhanceSettingAI: 'Улучшить сеттинг с помощью ИИ',
    characterDescriptionLabel: 'Описание персонажа (кто вы?)',
    characterDescriptionPlaceholder: 'Например: Старый волшебник, потерявший память',
    inventCharacter: 'Детальный персонаж',
    styleSelectionTitle: 'Выбор стиля повествования',
    noneStyleTooltip: 'Отключить специальный стиль повествования',
    customStyleLabel: 'Свой стиль повествования',
    customStylePlaceholder: 'Введите здесь свои подробные инструкции для Гейм-мастера...',
    turnsUntilRandomEvent: 'Ходов до случайного события',
    difficulty: 'Сложность',
    startAdventure: 'Начать приключение',
    loadGame: 'Загрузить игру',
    loadFromFile: 'Загрузить из файла',
    randomizeTooltip: 'Сгенерировать случайный вариант',
    errorLoadGame: "Не удалось загрузить игру. Данные могут быть повреждены.",
    errorLoadFromFile: "Не удалось загрузить игру из файла",
    errorInvalidSaveFile: "Файл сохранения имеет неверный формат.",
    saveDataNotFound: "Сохраненные данные не найдены.",
    customAuthor: 'Свой автор',
    generateAuthorStyleTitle: 'Генерация авторского стиля',
    authorNameLabel: 'Имя автора',
    authorNamePlaceholder: 'Например: Стивен Кинг',
    appliedStyle: 'Примененный стиль',
    clearStyle: 'Очистить',
    gameEngine: 'Движок ИИ',
    errorSwitchingModel: 'Ошибка при переключении движка.',
    learningMode: 'Режим обучения',
    generateLearningPlanTitle: 'Генерация плана обучения',
    learningTopicLabel: 'Тема для изучения',
    learningTopicPlaceholder: 'Например: Реверсивная психология',
    appliedLearningPlan: 'Примененный план обучения',
    
    // GameWindow
    saveGame: 'Сохранить',
    downloadSave: 'Скачать файл сохранения',
    restart: 'Начать заново',
    gameSaved: 'Игра сохранена!',
    saveFileDownloaded: 'Файл сохранения скачан!',
    generatingResponse: 'Генерация ответа...',
    inputPlaceholderWaiting: 'Ожидание ответа...',
    inputPlaceholderAction: 'Что вы делаете?',
    continue: 'Продолжить',
    imagePrompt: 'Промт для картинки',
    randomEventCounter: 'Ходов до случайного события',
    contactGMTitle: 'Связаться с Гейм-мастером (OOC)',

    // CharacterStatus & Journal
    status: 'Статус',
    journal: 'Журнал',
    characterSheet: 'Лист персонажа',
    update: 'Обновить',
    statusUpdatePrompt: 'Нажмите "Обновить" или введите "статус", чтобы увидеть информацию.',
    inventory: 'Инвентарь',
    effects: 'Эффекты',
    journalEmpty: 'Журнал пока пуст. Начните свое приключение!',
    restartConfirmation: 'Вы уверены, что хотите начать заново? Весь несохраненный прогресс будет потерян.',

    // ImageGenerationPanel & World Panels
    scene: 'Сцена',
    npcs: 'NPC',
    sceneVisualization: 'Визуализация сцены',
    generating: 'Генерация...',
    clickToEnlarge: 'Нажмите, чтобы увеличить',
    imageWillAppearHere: 'Здесь появится изображение текущей сцены.',
    imageGeneratedAutomatically: 'Изображение генерируется автоматически после каждого хода.',
    noNpcsMet: 'Вы еще не встретили ни одного важного персонажа.',
    noPortrait: 'Нет портрета',
    imageModelLabel: 'Модель изображения',
    imagen4: 'Imagen 4.0 (Качество)',
    geminiFlashImage: 'Gemini Flash (Скорость)',
    imageModelNone: 'Нет',
    sceneImageGeneration: 'Генерация сцены',

    // Modals
    close: 'Закрыть',
    // ImageViewerModal
    enlargedSceneImage: 'Увеличенное изображение сцены',
    // GMContactModal
    contactGM: 'Связь с Гейм-мастером',
    gmThinks: 'ГМ думает...',
    gmInputPlaceholder: 'Ваш вопрос к ГМ...',
    errorGMSessionInactive: "Игровая сессия не активна для связи с ГМ.",
    errorGMContact: "Ошибка связи с ГМ",
    expert: 'Эксперт',
    // ItemDetailModal
    itemDetails: 'Детали предмета',
    description: 'Описание',
    actions: 'Действия',
    use: 'Использовать',
    drop: 'Выбросить',
    errorGetItemDesc: 'Не удалось получить описание предмета.',
    errorGetDataForSave: 'Не удалось получить данные для сохранения.',
    // NpcDetailModal
    npcDetails: 'Информация о персонаже',
    // InfoPanel & InfoDetail Modals
    infoPanelTitle: 'Справочник',
    surroundings: 'Окружение',
    locations: 'Локации',
    bestiary: 'Бестиарий',
    quests: 'Квесты',
    infoDetails: 'Информация',
    noDescription: 'Описание отсутствует.',
    noImage: 'Нет изображения.',
    stats: 'Характеристики',
    noSurroundings: 'Информация об окружении появится здесь после обновления.',
    noLocations: 'Посещенные локации появятся здесь после обновления.',
    noBestiary: 'Встреченные существа появятся здесь после обновления.',
    noQuests: 'Активные задания появятся здесь после обновления.',
    updateInfo: 'Обновить информацию',
    // ImagePromptModal
    imagePromptTitle: 'Промт для генерации изображения',
    copyPrompt: 'Копировать',
    promptCopied: 'Скопировано!',
    generatingPrompt: 'Генерация промта...',


    // Difficulties
    Normal: 'Обычная',
    Hardcore: 'Хардкор',

  },
  en: {
    // Common
    error: 'Error',
    loading: 'Loading...',
    language: 'Language',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    send: 'Send',
    unknownError: 'An unknown error occurred.',
    none: 'None',
    info: 'Info',
    generate: 'Generate',
    accept: 'Accept',
    fast: 'Fast',
    quality: 'Quality',

    // App Header
    appTitle: 'Gemini Text Adventure RPG',
    appSubtitle: 'Your story, shaped by your choices.',

    // GameSetup
    createYourAdventure: 'Create Your Adventure',
    settingLabel: 'Setting (where does the story take place?)',
    settingPlaceholder: 'e.g., A forgotten kingdom in the clouds',
    createSettingFromFile: 'Create setting from text file',
    enhanceSettingAI: 'Enhance setting with AI',
    characterDescriptionLabel: 'Character Description (who are you?)',
    characterDescriptionPlaceholder: 'e.g., An old wizard who has lost their memory',
    inventCharacter: 'Detailed Character',
    styleSelectionTitle: 'Narrative Style Selection',
    noneStyleTooltip: 'Disable special narrative style',
    customStyleLabel: 'Custom Narrative Style',
    customStylePlaceholder: 'Enter your own detailed instructions for the Game Master here...',
    turnsUntilRandomEvent: 'Turns until random event',
    difficulty: 'Difficulty',
    startAdventure: 'Start Adventure',
    loadGame: 'Load Game',
    loadFromFile: 'Load from File',
    randomizeTooltip: 'Generate a random option',
    errorLoadGame: "Failed to load game. Data may be corrupted.",
    errorLoadFromFile: "Failed to load game from file",
    errorInvalidSaveFile: "Invalid save file format.",
    saveDataNotFound: "No saved data found.",
    customAuthor: 'Custom Author',
    generateAuthorStyleTitle: 'Generate Author Style',
    authorNameLabel: "Author's Name",
    authorNamePlaceholder: 'e.g., Stephen King',
    appliedStyle: 'Applied Style',
    clearStyle: 'Clear',
    gameEngine: 'AI Engine',
    errorSwitchingModel: 'Error switching engine model.',
    learningMode: 'Learning Mode',
    generateLearningPlanTitle: 'Generate Learning Plan',
    learningTopicLabel: 'Topic to learn',
    learningTopicPlaceholder: 'e.g., Reverse Psychology',
    appliedLearningPlan: 'Applied Learning Plan',
    
    // GameWindow
    saveGame: 'Save',
    downloadSave: 'Download save file',
    restart: 'Restart',
    gameSaved: 'Game saved!',
    saveFileDownloaded: 'Save file downloaded!',
    generatingResponse: 'Generating response...',
    inputPlaceholderWaiting: 'Waiting for response...',
    inputPlaceholderAction: 'What do you do?',
    continue: 'Continue',
    imagePrompt: 'Image Prompt',
    randomEventCounter: 'Turns until random event',
    contactGMTitle: 'Contact Game Master (OOC)',
    
    // CharacterStatus & Journal
    status: 'Status',
    journal: 'Journal',
    characterSheet: 'Character Sheet',
    update: 'Update',
    statusUpdatePrompt: 'Click "Update" or type "status" to see information.',
    inventory: 'Inventory',
    effects: 'Effects',
    journalEmpty: 'The journal is empty. Begin your adventure!',
    restartConfirmation: 'Are you sure you want to restart? All unsaved progress will be lost.',

    // ImageGenerationPanel & World Panels
    scene: 'Scene',
    npcs: 'NPCs',
    sceneVisualization: 'Scene Visualization',
    generating: 'Generating...',
    clickToEnlarge: 'Click to enlarge',
    imageWillAppearHere: 'The image of the current scene will appear here.',
    imageGeneratedAutomatically: 'The image is generated automatically after each turn.',
    noNpcsMet: 'You have not met any important characters yet.',
    noPortrait: 'No portrait',
    imageModelLabel: 'Image Model',
    imagen4: 'Imagen 4.0 (Quality)',
    geminiFlashImage: 'Gemini Flash (Speed)',
    imageModelNone: 'None',
    sceneImageGeneration: 'Scene Generation',

    // Modals
    close: 'Close',
    // ImageViewerModal
    enlargedSceneImage: 'Enlarged scene image',
    // GMContactModal
    contactGM: 'Contact Game Master',
    gmThinks: 'GM is thinking...',
    gmInputPlaceholder: 'Your question to the GM...',
    errorGMSessionInactive: "Game session is not active for GM contact.",
    errorGMContact: "Error contacting GM",
    expert: 'Expert',
    // ItemDetailModal
    itemDetails: 'Item Details',
    description: 'Description',
    actions: 'Actions',
    use: 'Use',
    drop: 'Drop',
    errorGetItemDesc: 'Failed to get item description.',
    errorGetDataForSave: 'Failed to get data for save.',
    // NpcDetailModal
    npcDetails: 'Character Information',
    // InfoPanel & InfoDetail Modals
    infoPanelTitle: 'Compendium',
    surroundings: 'Surroundings',
    locations: 'Locations',
    bestiary: 'Bestiary',
    quests: 'Quests',
    infoDetails: 'Details',
    noDescription: 'No description available.',
    noImage: 'No image.',
    stats: 'Stats',
    noSurroundings: 'Information about surroundings will appear here after updating.',
    noLocations: 'Visited locations will appear here after updating.',
    noBestiary: 'Encountered creatures will appear here after updating.',
    noQuests: 'Active quests will appear here after updating.',
    updateInfo: 'Update Information',
    // ImagePromptModal
    imagePromptTitle: 'Image Generation Prompt',
    copyPrompt: 'Copy',
    promptCopied: 'Copied!',
    generatingPrompt: 'Generating prompt...',

    // Difficulties
    Normal: 'Normal',
    Hardcore: 'Hardcore',
  },
};

export type Language = keyof typeof translations;

type TranslationKeys = keyof typeof translations.ru & keyof typeof translations.en;

export const useTranslation = (language: Language) => {
  return useCallback((key: TranslationKeys) => {
    // Fallback logic: try the selected language, then Russian (as the base), then the key itself.
    const langTranslations = translations[language] || translations.ru;
    // @ts-ignore
    return langTranslations[key] || translations.ru[key] || String(key);
  }, [language]);
};