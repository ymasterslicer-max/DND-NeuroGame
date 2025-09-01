
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { GameSettings, GameTurn, CharacterStatus as CharacterStatusType, InventoryItem, SaveState, Npc } from './types';
import type { Language } from './i18n';
import { useTranslation, translations } from './i18n';
import { initGameSession, sendPlayerAction, recreateChatSession, generateImage, contactGameMaster, getItemDescription, generateMapImage } from './services/geminiService';
import type { Chat } from '@google/genai';
import GameSetup from './components/GameSetup';
import GameWindow from './components/GameWindow';
import CharacterStatus from './components/CharacterStatus';
import ImageGenerationPanel from './components/ImageGenerationPanel';
import ImageViewerModal from './components/ImageViewerModal';
import GMContactModal from './components/GMContactModal';
import ItemDetailModal from './components/ItemDetailModal';

const SAVE_KEY = 'gemini-rpg-savegame';
const THEME_KEY = 'gemini-rpg-theme';
const LANGUAGE_KEY = 'gemini-rpg-language';

const parseGamedata = (text: string): { gameText: string; journalEntry: string | null; newNpcs: { name: string; description: string }[] } => {
    const gameDataRegex = /<gamedata>([\s\S]*?)<\/gamedata>/;
    const gameDataMatch = text.match(gameDataRegex);

    if (!gameDataMatch) {
        return { gameText: text, journalEntry: null, newNpcs: [] };
    }

    const gameText = text.substring(0, gameDataMatch.index).trim();
    const gameDataXml = gameDataMatch[1];

    let journalEntry: string | null = null;
    const journalRegex = /<journal>([\s\S]*?)<\/journal>/;
    const journalMatch = gameDataXml.match(journalRegex);
    if (journalMatch) {
        journalEntry = journalMatch[1].trim();
    }

    const newNpcs: { name: string; description: string }[] = [];
    const npcRegex = /<npc name="([^"]+)" description="([^"]+)"\s*\/>/g;
    let npcMatch;
    while ((npcMatch = npcRegex.exec(gameDataXml)) !== null) {
        newNpcs.push({ name: npcMatch[1], description: npcMatch[2] });
    }

    return { gameText, journalEntry, newNpcs };
};

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
    if (inventoryKeywords.some(kw => line.toLowerCase().includes(kw))) {
      isInventorySection = true;
      return;
    }

    if (isInventorySection) {
      const itemMatch = line.match(/^\s*[-*]\s*(.+?)(?:\s*\((?:x|х)(\d+)\))?\s*$/);
      if (itemMatch) {
        const name = itemMatch[1].trim();
        const quantity = itemMatch[2] ? parseInt(itemMatch[2], 10) : 1;
        inventory.push({ name, quantity });
      } else if (line.trim() === '' || (line.includes(':') && !line.match(/^\s*[-*]/))) {
        isInventorySection = false;
      }
    }
    
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
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
  const [gameHistory, setGameHistory] = useState<GameTurn[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [characterStatus, setCharacterStatus] = useState<CharacterStatusType | null>(null);
  const [eventCounter, setEventCounter] = useState(3);
  const [eventTimerSetting, setEventTimerSetting] = useState(3);
  const [hasSaveData, setHasSaveData] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  // New State
  const [journal, setJournal] = useState<string[]>([]);
  const [npcs, setNpcs] = useState<Npc[]>([]);
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);
  const [isGeneratingMap, setIsGeneratingMap] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemDescription, setItemDescription] = useState('');
  const [isItemDescLoading, setIsItemDescLoading] = useState(false);

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

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    setHasSaveData(!!localStorage.getItem(SAVE_KEY));
  }, []);

  const generateTurnImage = useCallback(async (gameText: string) => {
    setIsGeneratingImage(true);
    setImageGenerationError(null);
    const visualPrompt = t('language') === 'ru'
        ? `Создай яркую, атмосферную иллюстрацию в стиле цифровой живописи, которая показывает следующую сцену: ${gameText}. Сконцентрируйся на окружении и действиях персонажа, избегай текста на изображении.`
        : `Create a vivid, atmospheric illustration in a digital painting style that shows the following scene: ${gameText}. Focus on the environment and character actions, avoid text in the image.`;
    try {
        const imageUrl = await generateImage(visualPrompt);
        setTurnImageUrl(imageUrl);
    } catch (err) {
        setImageGenerationError(err instanceof Error ? err.message : t('unknownError'));
    } finally {
        setIsGeneratingImage(false);
    }
  }, [t]);

  const generateNpcPortrait = useCallback(async (npcName: string, npcDescription: string) => {
    setNpcs(prev => prev.map(n => n.name === npcName ? { ...n, isGeneratingPortrait: true } : n));
    const visualPrompt = t('language') === 'ru'
        ? `Создай портрет персонажа в стиле фэнтези-арта для RPG. Персонаж: ${npcName}. Описание: ${npcDescription}. Стиль: реалистичный, детальный, фокус на лице и характере.`
        : `Create a character portrait in a fantasy art style for an RPG. Character: ${npcName}. Description: ${npcDescription}. Style: realistic, detailed, focus on the face and character.`;
    try {
        const imageUrl = await generateImage(visualPrompt);
        setNpcs(prev => prev.map(n => n.name === npcName ? { ...n, portraitUrl: imageUrl, isGeneratingPortrait: false } : n));
    } catch (err) {
        console.error(`Failed to generate portrait for ${npcName}:`, err);
        setNpcs(prev => prev.map(n => n.name === npcName ? { ...n, isGeneratingPortrait: false } : n)); // Stop loading on error
    }
  }, [t]);

  const generateInitialMap = useCallback(async (setting: string) => {
      setIsGeneratingMap(true);
      try {
          const url = await generateMapImage(setting, language);
          setMapImageUrl(url);
      } catch (err) {
          console.error("Map generation failed:", err);
      } finally {
          setIsGeneratingMap(false);
      }
  }, [language]);


  const handleStartGame = useCallback(async (settings: GameSettings) => {
    setIsLoading(true);
    setError(null);
    setGameHistory([]);
    setCharacterStatus(null);
    setJournal([]);
    setNpcs([]);
    setMapImageUrl(null);
    setEventCounter(settings.eventTimer);
    setEventTimerSetting(settings.eventTimer);
    setTurnImageUrl(null);
    setImageGenerationError(null);
    setGameSettings(settings);
    try {
      const { chat, initialResponse } = await initGameSession(settings, language);
      setChatSession(chat);
      const { gameText, journalEntry, newNpcs: initialNpcs } = parseGamedata(initialResponse);
      setGameHistory([{ type: 'game', content: gameText }]);
      if (journalEntry) setJournal(prev => [...prev, journalEntry]);
      if (initialNpcs.length > 0) {
        const npcsToAdd = initialNpcs.map(npc => ({ ...npc, portraitUrl: null, isGeneratingPortrait: false }));
        setNpcs(prev => [...prev, ...npcsToAdd]);
        npcsToAdd.forEach(npc => generateNpcPortrait(npc.name, npc.description));
      }
      setIsGameStarted(true);
      generateTurnImage(gameText);
      generateInitialMap(settings.setting);
    } catch (err) {
      setError(err instanceof Error ? `Failed to start game: ${err.message}` : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [generateTurnImage, generateNpcPortrait, generateInitialMap, language]);
  
  const statusCommands = useMemo(() => ({
    ru: ['статус', 'инвентарь', 'здоровье'],
    en: ['status', 'inventory', 'health']
  }), []);


  const handleSendAction = useCallback(async (action: string) => {
    if (!chatSession || !action.trim()) return;
    setIsLoading(true);
    setError(null);
    setGameHistory(prev => [...prev, { type: 'player', content: action }]);
    setGameHistory(prev => [...prev, { type: 'game', content: '' }]);
    let fullResponseContent = '';
    const newCounter = eventCounter - 1;
    let actionToSend = action + (newCounter <= 0 ? (language === 'ru' 
        ? "\n\n[СИСТЕМНОЕ СООБЩЕНИЕ: Счетчик случайных событий достиг нуля. Сделай бросок на случайное событие согласно правилам.]"
        : "\n\n[SYSTEM MESSAGE: The random event counter has reached zero. Make a roll for a random event according to the rules.]") : "");
    setEventCounter(newCounter <= 0 ? eventTimerSetting : newCounter);

    try {
      const stream = await sendPlayerAction(chatSession, actionToSend);
      for await (const chunk of stream) {
        fullResponseContent += chunk;
        setGameHistory(prev => {
            const latestHistory = [...prev];
            const lastTurn = latestHistory[latestHistory.length - 1];
            if (lastTurn?.type === 'game') {
                latestHistory[latestHistory.length - 1] = {...lastTurn, content: lastTurn.content + chunk };
            }
            return latestHistory;
        });
      }
      const command = action.trim().toLowerCase();
      const isMetaCommand = statusCommands[language].includes(command);
      
      if (isMetaCommand) {
          const parsedData = parseStatusFromString(fullResponseContent, command);
          if (parsedData) setCharacterStatus(prev => ({...prev, ...parsedData}));
      } else {
          const { gameText, journalEntry, newNpcs: turnNpcs } = parseGamedata(fullResponseContent);
          setGameHistory(prev => {
            const updatedHistory = [...prev];
            updatedHistory[updatedHistory.length-1].content = gameText;
            return updatedHistory;
          });

          if (journalEntry) setJournal(prev => [...prev, journalEntry]);

          const existingNpcNames = new Set(npcs.map(n => n.name));
          const newNpcsToAdd = turnNpcs.filter(n => !existingNpcNames.has(n.name))
              .map(npc => ({ ...npc, portraitUrl: null, isGeneratingPortrait: false }));

          if (newNpcsToAdd.length > 0) {
              setNpcs(prev => [...prev, ...newNpcsToAdd]);
              newNpcsToAdd.forEach(npc => generateNpcPortrait(npc.name, npc.description));
          }
          if (gameText) generateTurnImage(gameText);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? `An error occurred: ${err.message}` : 'An unknown error occurred.';
      setError(errorMessage);
      setGameHistory(prev => [...prev.slice(0, -1)]);
    } finally {
      setIsLoading(false);
    }
  }, [chatSession, gameHistory, eventCounter, eventTimerSetting, generateTurnImage, language, statusCommands, npcs, generateNpcPortrait]);
  
  const handleRestart = useCallback(() => {
    if (window.confirm(t('restartConfirmation'))) {
        window.location.reload();
    }
  }, [t]);

  const getSaveState = async (): Promise<SaveState | null> => {
    if (!chatSession || !isGameStarted) return null;
    try {
      const chatHistory = await chatSession.getHistory();
      return { gameHistory, characterStatus, eventCounter, chatHistory, eventTimerSetting, language, journal, npcs, mapImageUrl, gameSettings };
    } catch (e) {
      setError(t('errorGetDataForSave'));
      console.error(e);
      return null;
    }
  };

  const handleSaveGame = async () => {
    const gameState = await getSaveState();
    if (gameState) {
      localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
      setSaveMessage(t('gameSaved'));
      setTimeout(() => setSaveMessage(''), 3000);
      setHasSaveData(true);
    }
  };
  
  const handleDownloadSave = async () => {
    const gameState = await getSaveState();
    if (gameState) {
      const dataStr = JSON.stringify(gameState, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `gemini-rpg-save-${new Date().toISOString()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      link.remove();
      setSaveMessage(t('saveFileDownloaded'));
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };
  
  const applyLoadedState = useCallback((savedState: SaveState) => {
      const { gameHistory, characterStatus, eventCounter, chatHistory, eventTimerSetting, language: savedLanguage, journal, npcs, mapImageUrl, gameSettings } = savedState;
      const chat = recreateChatSession(chatHistory);
      setGameHistory(gameHistory);
      setCharacterStatus(characterStatus);
      setEventCounter(eventCounter);
      setEventTimerSetting(eventTimerSetting || 3);
      setLanguage(savedLanguage || 'ru');
      setJournal(journal || []);
      setNpcs(npcs || []);
      setMapImageUrl(mapImageUrl || null);
      setGameSettings(gameSettings || null);
      setChatSession(chat);
      setIsGameStarted(true);
      setError(null);
      setTurnImageUrl(null);
      setImageGenerationError(null);
      if (gameHistory.length > 0) {
          const lastTurn = gameHistory[gameHistory.length - 1];
          if (lastTurn.type === 'game' && lastTurn.content) generateTurnImage(lastTurn.content);
      }
  }, [generateTurnImage]);

  const handleLoadGame = useCallback(() => {
    const savedGameJSON = localStorage.getItem(SAVE_KEY);
    if (!savedGameJSON) { setError(t('saveDataNotFound')); return; }
    try {
        applyLoadedState(JSON.parse(savedGameJSON));
    } catch (e) {
        setError(t('errorLoadGame'));
        localStorage.removeItem(SAVE_KEY); 
        setHasSaveData(false);
    }
  }, [applyLoadedState, t]);
  
  const handleLoadFromFile = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const savedState: SaveState = JSON.parse(text);
      if (!savedState.gameHistory || !savedState.chatHistory) throw new Error(t('errorInvalidSaveFile'));
      applyLoadedState(savedState);
    } catch (e) {
      setError(`${t('errorLoadFromFile')}: ${e instanceof Error ? e.message : t('unknownError')}`);
    }
  }, [applyLoadedState, t]);

  const handleContactGM = useCallback(async (message: string) => {
      if (!chatSession) { setError(t('errorGMSessionInactive')); return; }
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
            if (lastTurn?.type === 'gm') {
                latestHistory[latestHistory.length - 1] = {...lastTurn, content: lastTurn.content + chunk };
            }
            return latestHistory;
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? `${t('errorGMContact')}: ${err.message}` : t('unknownError');
        setGmContactHistory(prev => prev.map((item, index) => index === prev.length-1 ? {...item, content: errorMessage} : item));
      } finally {
        setIsGMContactLoading(false);
      }
  }, [chatSession, language, t]);

  const handleItemClick = useCallback(async (item: InventoryItem) => {
      setSelectedItem(item);
      setIsItemModalOpen(true);
      setIsItemDescLoading(true);
      setItemDescription('');
      try {
          const desc = await getItemDescription(item.name, characterStatus, gameSettings, language);
          setItemDescription(desc);
      } catch (err) {
          setItemDescription(t('errorGetItemDesc'));
      } finally {
          setIsItemDescLoading(false);
      }
  }, [characterStatus, gameSettings, language, t]);

  const handleItemAction = (action: string) => {
      if (selectedItem) {
          const command = language === 'ru' ? `${action} ${selectedItem.name}` : `${action} ${selectedItem.name}`;
          handleSendAction(command);
      }
      setIsItemModalOpen(false);
      setSelectedItem(null);
  }

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
                onUpdate={() => handleSendAction(language === 'ru' ? 'статус' : 'status')}
                isLoading={isLoading}
                onRestart={handleRestart}
                journal={journal}
                onItemClick={handleItemClick}
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
                npcs={npcs}
                mapImageUrl={mapImageUrl}
                isGeneratingMap={isGeneratingMap}
                t={t}
              />
            </div>
          )}
          {error && <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-400 dark:border-red-500 rounded-lg flex-shrink-0">{error}</div>}
        </main>
      </div>
      <ImageViewerModal 
        isOpen={isImageViewerOpen}
        imageUrl={turnImageUrl || mapImageUrl}
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
       <ItemDetailModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        item={selectedItem}
        description={itemDescription}
        isLoading={isItemDescLoading}
        onAction={handleItemAction}
        t={t}
      />
    </div>
  );
};

export default App;
