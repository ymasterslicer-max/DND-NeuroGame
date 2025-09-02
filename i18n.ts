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
    showAsciiMap: 'Показать карту',

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
    // AsciiMapModal
    asciiMapModalTitle: 'Карта местности',
    errorGeneratingMap: 'Не удалось сгенерировать карту. Попробуйте позже.',
    mapGeneratedOnRequest: 'Карта генерируется по запросу.',


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
    showAsciiMap: 'Show Map',

    // Modals
    close: 'Close',
    // ImageViewerModal
    enlargedSceneImage: 'Enlarged scene image',
    // GMContactModal
    contactGM: 'Contact Game Master',
    gmThinks: 'GM is thinking...',
    gmInputPlaceholder: 'Your question to the GM...',
    errorGMSessionInactive: "Game session is not active to contact GM.",
    errorGMContact: "Error contacting GM",
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
    // AsciiMapModal
    asciiMapModalTitle: 'Area Map',
    errorGeneratingMap: 'Could not generate map. Please try again later.',
    mapGeneratedOnRequest: 'Map is generated on request.',


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