import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { GameSettings, GameTurn, CharacterStatus as CharacterStatusType, InventoryItem, SaveState } from './types';
import type { Language } from './i18n';
import { useTranslation, translations } from './i18n';
import { GameDifficulty } from './types';
import { initGameSession, sendPlayerAction, recreateChatSession, generateImage, contactGameMaster } from './services/geminiService';
import type { Chat } from '@google/genai';
import GameSetup from './components/GameSetup';
import GameWindow from './components/GameWindow';
import CharacterStatus from './components/CharacterStatus';
import ImageGenerationPanel from './components/ImageGenerationPanel';
import ImageViewerModal from './components/ImageViewerModal';
import GMContactModal from './components/GMContactModal';

const SAVE_KEY = 'gemini-rpg-savegame';
const THEME_KEY = 'gemini-rpg-theme';
const LANGUAGE_KEY = 'gemini-rpg-language';

const parseStatusFromString = (text: string, command: string): Partial<CharacterStatusType> | null => {
  if (command !== 'статус' && command !== 'инвентарь' && command !== 'здоровье' && command !== 'status' && command !== 'inventory' && command !== 'health') {
    return null;
  }

  const combinedStatus: Partial<CharacterStatusType> = {};
  const lines = text.split('\n');
  let isInventorySection = false;
  const inventory: InventoryItem[] = [];
  const status: { [key: string]: string } = {};
  
  const inventoryKeywords = ['инвентарь', 'inventory'];

  lines.forEach(line => {
    // Check for the start of the inventory section
    if (inventoryKeywords.some(kw => line.toLowerCase().includes(kw))) {
      isInventorySection = true;
      return; // Skip the header line itself
    }

    // If we're in the inventory section, parse items
    if (isInventorySection) {
      const itemMatch = line.match(/^\s*[-*]\s*(.+?)(?:\s*\((?:x|х)(\d+)\))?\s*$/);
      if (itemMatch) {
        const name = itemMatch[1].trim();
        const quantity = itemMatch[2] ? parseInt(itemMatch[2], 10) : 1;
        inventory.push({ name, quantity });
      } else if (line.trim() === '' || (line.includes(':') && !line.match(/^\s*[-*]/))) {
        // Stop parsing inventory if we hit an empty line or a new status-like line
        isInventorySection = false;
      }
    }
    
    // Parse status attributes (if not in inventory section or if parsing continues)
    if (!isInventorySection) {
       const parts = line.split(':');
        if (parts.length >= 2) {
            const key = parts[0].trim().replace(/^[-*]\s*/, '').trim();
            const value = parts.slice(1).join(':').trim();
            if (key && value && !inventoryKeywords.some(kw => key.toLowerCase().includes(kw))) {
                status[key] = value;
            }
        }
    }
  });

  if (Object.keys(status).length > 0) {
      Object.assign(combinedStatus, status);
  }
  if (inventory.length > 0) {
      combinedStatus.inventory = inventory;
  }

  return Object.keys(combinedStatus).length > 0 ? combinedStatus : null;
};


const App: React.FC = () => {
  const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
  const [gameHistory, setGameHistory] = useState<GameTurn[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [characterStatus, setCharacterStatus] = useState<CharacterStatusType | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [eventCounter, setEventCounter] = useState(3);
  const [eventTimerSetting, setEventTimerSetting] = useState(3);
  const [hasSaveData, setHasSaveData] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [turnImageUrl, setTurnImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageGenerationError, setImageGenerationError] = useState<string | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [isGMContactModalOpen, setIsGMContactModalOpen] = useState(false);
  const [gmContactHistory, setGmContactHistory] = useState<{type: 'user' | 'gm', content: string}[]>([]);
  const [isGMContactLoading, setIsGMContactLoading] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem(THEME_KEY) as 'light' | 'dark') || 'dark');
  const [language, setLanguage] = useState<Language>(() => {
      const savedLang = localStorage.getItem(LANGUAGE_KEY);
      return (savedLang && Object.keys(translations).includes(savedLang)) ? savedLang as Language : 'ru';
  });
  const t = useTranslation(language);

  // Effect for persisting and applying theme
  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Effect for persisting language
  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
  }, [language]);


  useEffect(() => {
    const savedGame = localStorage.getItem(SAVE_KEY);
    setHasSaveData(!!savedGame);
  }, []);
  
  const generateTurnImage = useCallback(async (gameText: string) => {
    setIsGeneratingImage(true);
    setImageGenerationError(null);

    const visualPrompt = `Создай яркую, атмосферную иллюстрацию в стиле цифровой живописи, которая показывает следующую сцену: ${gameText}. Сконцентрируйся на окружении и действиях персонажа, избегай текста на изображении.`;

    try {
        const imageUrl = await generateImage(visualPrompt);
        setTurnImageUrl(imageUrl);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Неизвестная ошибка.';
        setImageGenerationError(message);
    } finally {
        setIsGeneratingImage(false);
    }
  }, []);

  const handleStartGame = useCallback(async (settings: GameSettings) => {
    setIsLoading(true);
    setError(null);
    setGameHistory([]);
    setCharacterStatus(null);
    setEventCounter(settings.eventTimer);
    setEventTimerSetting(settings.eventTimer);
    setAvatarUrl(null);
    setTurnImageUrl(null);
    setImageGenerationError(null);
    try {
      const { chat, initialResponse } = await initGameSession(settings, language);
      setChatSession(chat);
      setGameHistory([{ type: 'game', content: initialResponse }]);
      setIsGameStarted(true);
      generateTurnImage(initialResponse);
    } catch (err) {
      setError(err instanceof Error ? `Failed to start game: ${err.message}` : 'An unknown error occurred.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [generateTurnImage, language]);
  
  const statusCommands = useMemo(() => ({
    ru: ['статус', 'инвентарь', 'здоровье'],
    en: ['status', 'inventory', 'health']
  }), []);


  const handleSendAction = useCallback(async (action: string) => {
    if (!chatSession || !action.trim()) return;

    setIsLoading(true);
    setError(null);
    const newHistory: GameTurn[] = [...gameHistory, { type: 'player', content: action }];
    setGameHistory(newHistory);
    
    setGameHistory(prev => [...prev, { type: 'game', content: '' }]);

    let fullResponseContent = '';
    
    let actionToSend = action;
    const newCounter = eventCounter - 1;

    if (newCounter <= 0) {
      actionToSend += language === 'ru' 
        ? "\n\n[СИСТЕМНОЕ СООБЩЕНИЕ: Счетчик случайных событий достиг нуля. Сделай бросок на случайное событие согласно правилам.]"
        : "\n\n[SYSTEM MESSAGE: The random event counter has reached zero. Make a roll for a random event according to the rules.]";
      setEventCounter(eventTimerSetting); // Reset
    } else {
      setEventCounter(newCounter);
    }

    try {
      const stream = await sendPlayerAction(chatSession, actionToSend);
      for await (const chunk of stream) {
        fullResponseContent += chunk;
        setGameHistory(prev => {
            const latestHistory = [...prev];
            const lastTurn = latestHistory[latestHistory.length - 1];
            if (lastTurn && lastTurn.type === 'game') {
                latestHistory[latestHistory.length - 1] = {...lastTurn, content: lastTurn.content + chunk };
            }
            return latestHistory;
        });
      }

      const command = action.trim().toLowerCase();
      const isMetaCommand = statusCommands[language].includes(command);
      
      if (fullResponseContent && !isMetaCommand) {
          generateTurnImage(fullResponseContent);
      }
      
      if (isMetaCommand) {
          const parsedData = parseStatusFromString(fullResponseContent, command);
          if (parsedData) {
              setCharacterStatus(prev => ({...prev, ...parsedData}));
          }
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? `An error occurred: ${err.message}` : 'An unknown error occurred.';
      setError(errorMessage);
      console.error(err);
       setGameHistory(prev => [...prev.slice(0, -1)]);
    } finally {
      setIsLoading(false);
    }
  }, [chatSession, gameHistory, eventCounter, eventTimerSetting, generateTurnImage, language, statusCommands]);
  
  const handleRestart = useCallback(() => {
    if (window.confirm(t('restartConfirmation'))) {
        // A full page reload is a simple and foolproof way to restart the app.
        window.location.reload();
    }
  }, [t]);

  const handleAvatarChange = useCallback((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
          setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
  }, []);

  const getSaveState = async (): Promise<SaveState | null> => {
    if (!chatSession || !isGameStarted) return null;
    try {
      const chatHistory = await chatSession.getHistory();
      return {
        gameHistory,
        characterStatus,
        avatarUrl,
        eventCounter,
        chatHistory,
        eventTimerSetting,
        language
      };
    } catch (e) {
      setError('Не удалось получить данные для сохранения.');
      console.error(e);
      return null;
    }
  };

  const handleSaveGame = async () => {
    const gameState = await getSaveState();
    if (!gameState) return;
    localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
    setSaveMessage(t('gameSaved'));
    setTimeout(() => setSaveMessage(''), 3000);
    setHasSaveData(true);
  };
  
  const handleDownloadSave = async () => {
    const gameState = await getSaveState();
    if (!gameState) return;

    const dataStr = JSON.stringify(gameState, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gemini-rpg-save-${new Date().toISOString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSaveMessage(t('saveFileDownloaded'));
    setTimeout(() => setSaveMessage(''), 3000);
  };
  
  const applyLoadedState = useCallback((savedState: SaveState) => {
      const { gameHistory, characterStatus, avatarUrl, eventCounter, chatHistory, eventTimerSetting, language: savedLanguage } = savedState;
      
      const chat = recreateChatSession(chatHistory);

      setGameHistory(gameHistory);
      setCharacterStatus(characterStatus);
      setAvatarUrl(avatarUrl);
      setEventCounter(eventCounter);
      setEventTimerSetting(eventTimerSetting || 3);
      setLanguage(savedLanguage || 'ru');
      setChatSession(chat);
      setIsGameStarted(true);
      setError(null);
      setTurnImageUrl(null);
      setImageGenerationError(null);
      
      if (gameHistory.length > 0) {
          const lastTurn = gameHistory[gameHistory.length - 1];
          if (lastTurn.type === 'game' && lastTurn.content) {
              generateTurnImage(lastTurn.content);
          }
      }
  }, [generateTurnImage]);

  const handleLoadGame = useCallback(() => {
    const savedGameJSON = localStorage.getItem(SAVE_KEY);
    if (!savedGameJSON) {
        setError("Сохраненные данные не найдены.");
        return;
    }
    try {
        const savedState: SaveState = JSON.parse(savedGameJSON);
        applyLoadedState(savedState);
    } catch (e) {
        setError("Не удалось загрузить игру. Данные могут быть повреждены.");
        console.error(e);
        localStorage.removeItem(SAVE_KEY); 
        setHasSaveData(false);
    }
  }, [applyLoadedState]);
  
  const handleLoadFromFile = useCallback(async (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== 'string') {
          throw new Error("Не удалось прочитать файл.");
        }
        const savedState: SaveState = JSON.parse(text);
        // Basic validation
        if (!savedState.gameHistory || !savedState.chatHistory) {
            throw new Error("Файл сохранения имеет неверный формат.");
        }
        applyLoadedState(savedState);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Неизвестная ошибка";
        setError(`Не удалось загрузить игру из файла: ${message}`);
        console.error(e);
      }
    };
    reader.onerror = () => {
      setError("Ошибка при чтении файла сохранения.");
    };
    reader.readAsText(file);
  }, [applyLoadedState]);

  const handleContactGM = useCallback(async (message: string) => {
      if (!chatSession) {
        setError("Игровая сессия не активна для связи с ГМ.");
        return;
      }
      setIsGMContactLoading(true);
      setGmContactHistory(prev => [...prev, { type: 'user', content: message }]);
      
      setGmContactHistory(prev => [...prev, { type: 'gm', content: '' }]);

      try {
        const gameApiHistory = await chatSession.getHistory();
        const stream = await contactGameMaster(gameApiHistory, message, language);

        for await (const chunk of stream) {
          setGmContactHistory(prev => {
            const latestHistory = [...prev];
            const lastTurn = latestHistory[latestHistory.length - 1];
            if (lastTurn && lastTurn.type === 'gm') {
                latestHistory[latestHistory.length - 1] = {...lastTurn, content: lastTurn.content + chunk };
            }
            return latestHistory;
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? `Ошибка связи с ГМ: ${err.message}` : 'Произошла неизвестная ошибка.';
        setGmContactHistory(prev => {
            const latestHistory = [...prev];
            const lastTurn = latestHistory[latestHistory.length - 1];
            if (lastTurn && lastTurn.type === 'gm') {
                latestHistory[latestHistory.length - 1] = {...lastTurn, content: errorMessage };
            }
            return latestHistory;
        });
      } finally {
        setIsGMContactLoading(false);
      }
  }, [chatSession, language]);


  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-lora flex flex-col items-center p-4 transition-colors duration-300">
      <div className="w-full max-w-7xl flex flex-col h-screen">
        <header className="text-center py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h1 className="text-2xl md:text-4xl font-bold text-cyan-600 dark:text-cyan-400 tracking-wider font-cinzel">
            {t('appTitle')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('appSubtitle')}</p>
        </header>
        <main className="flex-grow flex flex-col py-4 min-h-0">
          {!isGameStarted ? (
            <div className="flex-grow flex items-center justify-center">
              <GameSetup 
                onStartGame={handleStartGame} 
                isLoading={isLoading} 
                onLoadGame={handleLoadGame}
                onLoadFromFile={handleLoadFromFile}
                hasSaveData={hasSaveData}
                language={language}
                setLanguage={setLanguage}
                theme={theme}
                setTheme={setTheme}
                t={t}
              />
            </div>
          ) : (
            <div className="flex-grow flex gap-4 min-h-0">
              <CharacterStatus 
                status={characterStatus} 
                avatarUrl={avatarUrl} 
                onAvatarChange={handleAvatarChange}
                onUpdate={() => handleSendAction(language === 'ru' ? 'статус' : 'status')}
                isLoading={isLoading}
                onRestart={handleRestart}
                t={t}
              />
              <div className="flex-grow min-w-0 h-full">
                <GameWindow
                  history={gameHistory}
                  onSendAction={handleSendAction}
                  isLoading={isLoading}
                  eventCounter={eventCounter}
                  t={t}
                />
              </div>
              <ImageGenerationPanel 
                imageUrl={turnImageUrl}
                isGenerating={isGeneratingImage}
                isGameLoading={isLoading}
                error={imageGenerationError}
                onImageClick={() => setIsImageViewerOpen(true)}
                onSaveGame={handleSaveGame}
                onDownloadSave={handleDownloadSave}
                saveMessage={saveMessage}
                onContactGM={() => setIsGMContactModalOpen(true)}
                t={t}
              />
            </div>
          )}
          {error && <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-400 dark:border-red-500 rounded-lg flex-shrink-0">{error}</div>}
        </main>
      </div>
      <ImageViewerModal 
        isOpen={isImageViewerOpen}
        imageUrl={turnImageUrl}
        onClose={() => setIsImageViewerOpen(false)}
        t={t}
      />
      <GMContactModal
        isOpen={isGMContactModalOpen}
        onClose={() => setIsGMContactModalOpen(false)}
        history={gmContactHistory}
        isLoading={isGMContactLoading}
        onSendMessage={handleContactGM}
        t={t}
      />
    </div>
  );
};

export default App;