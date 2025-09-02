
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { GameSettings, GameTurn, CharacterStatus as CharacterStatusType, InventoryItem, SaveState, Npc, ImageModel } from './types';
import type { Language } from './i18n';
import { useTranslation, translations } from './i18n';
import { initGameSession, sendPlayerAction, recreateChatSession, generateImage, contactGameMaster, getItemDescription, generateAsciiMap } from './services/geminiService';
import type { Chat } from '@google/genai';
import GameSetup from './components/GameSetup';
import GameWindow from './components/GameWindow';
import CharacterStatus from './components/CharacterStatus';
import ImageGenerationPanel from './components/ImageGenerationPanel';
import ImageViewerModal from './components/ImageViewerModal';
import GMContactModal from './components/GMContactModal';
import ItemDetailModal from './components/ItemDetailModal';
import NpcDetailModal from './components/NpcDetailModal';
import AsciiMapModal from './components/AsciiMapModal';

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

const parseStatusAndXML = (responseText: string): { humanText: string; statusData: Partial<CharacterStatusType> | null } => {
    const statusDataRegex = /<statusdata>([\s\S]*?)<\/statusdata>/;
    const match = responseText.match(statusDataRegex);

    if (!match) {
        return { humanText: responseText, statusData: null };
    }

    const humanText = responseText.substring(0, match.index).trim();
    const xmlContent = match[1];
    
    const combinedStatus: Partial<CharacterStatusType> = {};
    const inventory: InventoryItem[] = [];
    const effects: string[] = [];
    const status: { [key: string]: string } = {};

    // Parse status key-value pairs
    const statusRegex = /<status>([\s\S]*?)<\/status>/;
    const statusMatch = xmlContent.match(statusRegex);
    if (statusMatch) {
        const statusContent = statusMatch[1];
        const propertyRegex = /<([a-zA-Zа-яА-Я\s_.-]+)>([\s\S]*?)<\/\1>/g;
        let propMatch;
        while ((propMatch = propertyRegex.exec(statusContent)) !== null) {
            const key = propMatch[1].trim();
            const value = propMatch[2].trim();
            if (key && value) {
                status[key] = value;
            }
        }
    }

    // Parse inventory
    const inventoryRegex = /<inventory>([\s\S]*?)<\/inventory>/;
    const inventoryMatch = xmlContent.match(inventoryRegex);
    if (inventoryMatch) {
        const inventoryContent = inventoryMatch[1];
        const itemRegex = /<item\s+name="([^"]+)"\s+quantity="(\d+)"\s*\/>/g;
        let itemMatch;
        while ((itemMatch = itemRegex.exec(inventoryContent)) !== null) {
            inventory.push({
                name: itemMatch[1],
                quantity: parseInt(itemMatch[2], 10),
            });
        }
    }
    
    // Parse effects
    const effectsRegex = /<effects>([\s\S]*?)<\/effects>/;
    const effectsMatch = xmlContent.match(effectsRegex);
    if (effectsMatch) {
        const effectsContent = effectsMatch[1];
        const effectRegex = /<effect\s+name="([^"]+)"(?:\s+duration="([^"]+)")?\s*\/>/g;
        let effectMatch;
        while ((effectMatch = effectRegex.exec(effectsContent)) !== null) {
            const name = effectMatch[1];
            const duration = effectMatch[2];
            effects.push(duration ? `${name} (${duration})` : name);
        }
    }
    
    if (Object.keys(status).length > 0) {
        Object.assign(combinedStatus, status);
    }
    if (inventory.length > 0) {
        combinedStatus.inventory = inventory;
    }
    if (effects.length > 0) {
        combinedStatus.effects = effects;
    }
    
    const statusData = Object.keys(combinedStatus).length > 0 ? combinedStatus : null;
    return { humanText, statusData };
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
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemDescription, setItemDescription] = useState('');
  const [isItemDescLoading, setIsItemDescLoading] = useState(false);
  const [selectedNpc, setSelectedNpc] = useState<Npc | null>(null);
  const [isNpcModalOpen, setIsNpcModalOpen] = useState(false);
  
  const [isAsciiMapModalOpen, setIsAsciiMapModalOpen] = useState(false);
  const [asciiMapContent, setAsciiMapContent] = useState<string | null>(null);
  const [isAsciiMapLoading, setIsAsciiMapLoading] = useState(false);


  const [turnImageUrl, setTurnImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageGenerationError, setImageGenerationError] = useState<string | null>(null);
  const [imageGenerationModel, setImageGenerationModel] = useState<ImageModel>('imagen-4.0-generate-001');
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [imageToView, setImageToView] = useState<string | null>(null);
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

  const openImageViewer = (url: string | null) => {
    if (url) {
      setImageToView(url);
      setIsImageViewerOpen(true);
    }
  };

  const generateTurnImage = useCallback(async (gameText: string) => {
    if (imageGenerationModel === 'none') {
        setTurnImageUrl(null);
        setImageGenerationError(null);
        return;
    }
    setIsGeneratingImage(true);
    setImageGenerationError(null);
    const visualPrompt = t('language') === 'ru'
        ? `Создай яркую, атмосферную иллюстрацию в стиле цифровой живописи, которая показывает следующую сцену: ${gameText}. Сконцентрируйся на окружении и действиях персонажа, избегай текста на изображении.`
        : `Create a vivid, atmospheric illustration in a digital painting style that shows the following scene: ${gameText}. Focus on the environment and character actions, avoid text in the image.`;
    try {
        const imageUrl = await generateImage(visualPrompt, imageGenerationModel);
        setTurnImageUrl(imageUrl);
    } catch (err) {
        setImageGenerationError(err instanceof Error ? err.message : t('unknownError'));
    } finally {
        setIsGeneratingImage(false);
    }
  }, [t, imageGenerationModel]);

  const generateNpcPortrait = useCallback(async (npcName: string, npcDescription: string) => {
    setNpcs(prev => prev.map(n => n.name === npcName ? { ...n, isGeneratingPortrait: true } : n));
    const visualPrompt = t('language') === 'ru'
        ? `Создай портрет персонажа в стиле фэнтези-арта для RPG. Персонаж: ${npcName}. Описание: ${npcDescription}. Стиль: реалистичный, детальный, фокус на лице и характере.`
        : `Create a character portrait in a fantasy art style for an RPG. Character: ${npcName}. Description: ${npcDescription}. Style: realistic, detailed, focus on the face and character.`;
    try {
        const modelForNpc = imageGenerationModel === 'none' ? 'imagen-4.0-generate-001' : imageGenerationModel;
        const imageUrl = await generateImage(visualPrompt, modelForNpc);
        setNpcs(prev => prev.map(n => n.name === npcName ? { ...n, portraitUrl: imageUrl, isGeneratingPortrait: false } : n));
    } catch (err) {
        console.error(`Failed to generate portrait for ${npcName}:`, err);
        setNpcs(prev => prev.map(n => n.name === npcName ? { ...n, isGeneratingPortrait: false } : n)); // Stop loading on error
    }
  }, [t, imageGenerationModel]);

  const handleShowAsciiMap = useCallback(async () => {
      setIsAsciiMapModalOpen(true);
      setIsAsciiMapLoading(true);
      setAsciiMapContent(null);
      try {
          // Provide last 5 turns for context
          const mapContext = gameHistory.slice(-5);
          const mapText = await generateAsciiMap(mapContext, language);
          // Clean up potential markdown code blocks
          const cleanedMapText = mapText.replace(/```/g, '').trim();
          setAsciiMapContent(cleanedMapText);
      } catch (err) {
          setAsciiMapContent(t('errorGeneratingMap'));
          console.error("ASCII Map generation failed:", err);
      } finally {
          setIsAsciiMapLoading(false);
      }
  }, [gameHistory, language, t]);


  const handleStartGame = useCallback(async (settings: GameSettings) => {
    setIsLoading(true);
    setError(null);
    setGameHistory([]);
    setCharacterStatus(null);
    setJournal([]);
    setNpcs([]);
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
    } catch (err) {
      setError(err instanceof Error ? `Failed to start game: ${err.message}` : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [generateTurnImage, generateNpcPortrait, language]);
  
  const statusCommands = useMemo(() => ({
    ru: ['статус', 'инвентарь', 'здоровье'],
    en: ['status', 'inventory', 'health']
  }), []);


  const handleSendAction = useCallback(async (action: string) => {
    if (!chatSession || !action.trim()) return;

    setIsLoading(true);
    setError(null);
    
    const command = action.trim().toLowerCase();
    const isMetaCommand = statusCommands[language].includes(command);

    let actionToDisplay = action;
    let actionToSend = action;

    if (isMetaCommand) {
        actionToSend = language === 'ru'
            ? `[СИСТЕМНОЕ СООБЩЕНИЕ ДЛЯ GM]
Это системный запрос на обновление данных персонажа для интерфейса игры. Твой ответ ДОЛЖЕН состоять из ДВУХ частей:
1.  **Текстовое описание:** Сначала напиши краткий, художественный абзац (2-3 предложения) о состоянии персонажа для игрока.
2.  **Блок данных (XML):** СРАЗУ ПОСЛЕ текстового описания, без пустых строк или другого текста, добавь блок данных в СТРОГОМ формате XML. Этот блок будет скрыт от игрока и используется только для парсинга.

**ПРИМЕР ПОЛНОГО ОТВЕТА (Текст + XML):**
Ты чувствуешь себя отдохнувшим, хотя легкая рана на руке все еще ноет. Твои карманы приятно оттягивают несколько полезных вещей.
<statusdata>
  <status>
    <Имя>Иона</Имя>
    <Здоровье>95/100</Здоровье>
    <Сила>12</Сила>
    <Ловкость>14</Ловкость>
    <Класс_Брони>15</Класс_Брони>
    <Золото>50</Золото>
  </status>
  <inventory>
    <item name="Лечебное зелье" quantity="2" />
    <item name="Стальной меч" quantity="1" />
  </inventory>
  <effects>
    <effect name="Легкое ранение" duration="1 час" />
  </effects>
</statusdata>`
            : `[SYSTEM MESSAGE FOR GM]
This is a system request to update character data for the game interface. Your response MUST have TWO parts:
1.  **Narrative Description:** First, write a brief, flavorful paragraph (2-3 sentences) about the character's condition for the player.
2.  **Data Block (XML):** IMMEDIATELY AFTER the narrative text, with no blank lines or other text, add a data block in STRICT XML format. This block will be hidden from the player and is used only for parsing.

**EXAMPLE OF A COMPLETE RESPONSE (Text + XML):**
You feel well-rested, though the slight wound on your arm still aches. Your pockets feel heavy with a few useful items.
<statusdata>
  <status>
    <Name>Ion</Name>
    <Health>95/100</Health>
    <Strength>12</Strength>
    <Dexterity>14</Dexterity>
    <Armor_Class>15</Armor_Class>
    <Gold>50</Gold>
  </status>
  <inventory>
    <item name="Healing Potion" quantity="2" />
    <item name="Steel Sword" quantity="1" />
  </inventory>
  <effects>
    <effect name="Minor Wound" duration="1 hour" />
  </effects>
</statusdata>`;
        actionToDisplay = action; // Show original command in chat for better UX
    } else {
        const newCounter = eventCounter - 1;
        actionToSend = action + (newCounter <= 0 ? (language === 'ru' 
            ? "\n\n[СИСТЕМНОЕ СООБЩЕНИЕ: Счетчик случайных событий достиг нуля. Сделай бросок на случайное событие согласно правилам.]"
            : "\n\n[SYSTEM MESSAGE: The random event counter has reached zero. Make a roll for a random event according to the rules.]") : "");
        setEventCounter(newCounter <= 0 ? eventTimerSetting : newCounter);
    }

    setGameHistory(prev => [...prev, { type: 'player', content: actionToDisplay }]);
    setGameHistory(prev => [...prev, { type: 'game', content: '' }]);
    let fullResponseContent = '';

    try {
      const stream = await sendPlayerAction(chatSession, actionToSend);
      for await (const chunk of stream) {
        fullResponseContent += chunk;
        // For meta commands, we wait for the full response to parse it, avoiding UI flicker of the XML block.
        if (!isMetaCommand) {
             setGameHistory(prev => {
                const latestHistory = [...prev];
                const lastTurn = latestHistory[latestHistory.length - 1];
                if (lastTurn?.type === 'game') {
                    latestHistory[latestHistory.length - 1] = {...lastTurn, content: lastTurn.content + chunk };
                }
                return latestHistory;
            });
        }
      }
      
      if (isMetaCommand) {
          const { humanText, statusData } = parseStatusAndXML(fullResponseContent);
          if (statusData) {
              setCharacterStatus(prev => ({...prev, ...statusData}));
          }
          // Update history with only the human-readable part
          setGameHistory(prev => {
            const updatedHistory = [...prev];
            updatedHistory[updatedHistory.length-1].content = humanText;
            return updatedHistory;
          });

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
      return { gameHistory, characterStatus, eventCounter, chatHistory, eventTimerSetting, language, journal, npcs, gameSettings };
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
      const { gameHistory, characterStatus, eventCounter, chatHistory, eventTimerSetting, language: savedLanguage, journal, npcs, gameSettings } = savedState;
      const chat = recreateChatSession(chatHistory);
      setGameHistory(gameHistory);
      setCharacterStatus(characterStatus);
      setEventCounter(eventCounter);
      setEventTimerSetting(eventTimerSetting || 3);
      setLanguage(savedLanguage || 'ru');
      setJournal(journal || []);
      setNpcs(npcs || []);
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

  const handleNpcClick = useCallback((npc: Npc) => {
      setSelectedNpc(npc);
      setIsNpcModalOpen(true);
  }, []);

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
                onImageClick={openImageViewer}
                onSaveGame={handleSaveGame}
                onDownloadSave={handleDownloadSave}
                saveMessage={saveMessage}
                onContactGM={() => setIsGMContactModalOpen(true)}
                npcs={npcs}
                onNpcClick={handleNpcClick}
                onShowAsciiMap={handleShowAsciiMap}
                imageGenerationModel={imageGenerationModel}
                setImageGenerationModel={setImageGenerationModel}
                t={t}
              />
            </div>
          )}
          {error && <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-400 dark:border-red-500 rounded-lg flex-shrink-0">{error}</div>}
        </main>
      </div>
      <ImageViewerModal 
        isOpen={isImageViewerOpen}
        imageUrl={imageToView}
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
      <NpcDetailModal
        isOpen={isNpcModalOpen}
        onClose={() => setIsNpcModalOpen(false)}
        npc={selectedNpc}
        t={t}
      />
       <AsciiMapModal
        isOpen={isAsciiMapModalOpen}
        onClose={() => setIsAsciiMapModalOpen(false)}
        content={asciiMapContent}
        isLoading={isAsciiMapLoading}
        t={t}
      />
    </div>
  );
};

export default App;