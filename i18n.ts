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
    narrativeStyleLabel: 'Стиль повествования',
    narrativeStylePlaceholder: 'Например: В стиле Терри Пратчетта, с иронией',
    turnsUntilRandomEvent: 'Ходов до случайного события',
    difficulty: 'Сложность',
    startAdventure: 'Начать приключение',
    loadGame: 'Загрузить игру',
    loadFromFile: 'Загрузить из файла',
    randomizeTooltip: 'Сгенерировать случайный вариант',
    
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
    describeInDetail: 'Описать детально',
    randomEventCounter: 'Ходов до случайного события',
    contactGMTitle: 'Связаться с Гейм-мастером (OOC)',

    // CharacterStatus
    status: 'Статус',
    update: 'Обновить',
    uploadAvatar: 'Загрузить аватар',
    avatar: 'Аватар',
    upload: 'Загрузить',
    statusUpdatePrompt: 'Нажмите "Обновить" или введите "статус", чтобы увидеть информацию.',
    inventory: 'Инвентарь',
    restartConfirmation: 'Вы уверены, что хотите начать заново? Весь несохраненный прогресс будет потерян.',

    // ImageGenerationPanel
    sceneVisualization: 'Визуализация сцены',
    generating: 'Генерация...',
    clickToEnlarge: 'Нажмите, чтобы увеличить',
    imageWillAppearHere: 'Здесь появится изображение текущей сцены.',
    imageGeneratedAutomatically: 'Изображение генерируется автоматически после каждого хода.',

    // Modals
    close: 'Закрыть',
    // ImageViewerModal
    enlargedSceneImage: 'Увеличенное изображение сцены',
    // GMContactModal
    contactGM: 'Связь с Гейм-мастером',
    gmThinks: 'ГМ думает...',
    gmInputPlaceholder: 'Ваш вопрос к ГМ...',
    
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
    narrativeStyleLabel: 'Narrative Style',
    narrativeStylePlaceholder: 'e.g., In the style of Terry Pratchett, with irony',
    turnsUntilRandomEvent: 'Turns until random event',
    difficulty: 'Difficulty',
    startAdventure: 'Start Adventure',
    loadGame: 'Load Game',
    loadFromFile: 'Load from File',
    randomizeTooltip: 'Generate a random option',
    
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
    describeInDetail: 'Describe in detail',
    randomEventCounter: 'Turns until random event',
    contactGMTitle: 'Contact Game Master (OOC)',
    
    // CharacterStatus
    status: 'Status',
    update: 'Update',
    uploadAvatar: 'Upload avatar',
    avatar: 'Avatar',
    upload: 'Upload',
    statusUpdatePrompt: 'Click "Update" or type "status" to see information.',
    inventory: 'Inventory',
    restartConfirmation: 'Are you sure you want to restart? All unsaved progress will be lost.',

    // ImageGenerationPanel
    sceneVisualization: 'Scene Visualization',
    generating: 'Generating...',
    clickToEnlarge: 'Click to enlarge',
    imageWillAppearHere: 'The image of the current scene will appear here.',
    imageGeneratedAutomatically: 'The image is generated automatically after each turn.',

    // Modals
    close: 'Close',
    // ImageViewerModal
    enlargedSceneImage: 'Enlarged scene image',
    // GMContactModal
    contactGM: 'Contact Game Master',
    gmThinks: 'GM is thinking...',
    gmInputPlaceholder: 'Your question to the GM...',

    // Difficulties
    Normal: 'Normal',
    Hardcore: 'Hardcore',
  }
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.ru;

export const useTranslation = (language: Language) => {
  return (key: TranslationKey): string => {
    const langDict = translations[language] || translations.en;
    return langDict[key] || key;
  };
};