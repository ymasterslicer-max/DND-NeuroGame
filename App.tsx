
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { GameSettings, GameTurn, CharacterStatus as CharacterStatusType, InventoryItem, SaveState, Npc, ImageModel, InfoType, InfoItem, BestiaryEntry, GameEngineModel } from './types';
import type { Language } from './i18n';
import { useTranslation, translations } from './i18n';
import { initGameSession, sendPlayerAction, recreateChatSession, generateImage, contactGameMaster, getItemDescription, generateInfoList, getInfoItemDetails, generateImagePrompt } from './services/geminiService';
import type { Chat, Content } from '@google/genai';
import GameSetup from './components/GameSetup';
import GameWindow from './components/GameWindow';
import CharacterStatus from './components/CharacterStatus';
import ImageGenerationPanel from './components/ImageGenerationPanel';
import ImageViewerModal from './components/ImageViewerModal';
import GMContactModal from './components/GMContactModal';
import ItemDetailModal from './components/ItemDetailModal';
import NpcDetailModal from './components/NpcDetailModal';
import InfoPanelModal from './components/AsciiMapModal'; // Repurposed for the new Info Panel
import LoadingSpinner from './components/LoadingSpinner';


const SAVE_KEY = 'gemini-rpg-savegame';
const THEME_KEY = 'gemini-rpg-theme';
const LANGUAGE_KEY = 'gemini-rpg-language';


// New InfoDetailModal component defined inside App.tsx to avoid creating new files.
const InfoDetailModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    item: InfoItem | BestiaryEntry | null;
    isLoading: boolean;
    t: (key: any) => string;
}> = ({ isOpen, onClose, item, isLoading, t }) => {
    if (!isOpen || !item) return null;

    const isBestiary = 'stats' in item;

    return (
        <div
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes scaleIn { from { transform: scale(0.95); } to { transform: scale(1); } }
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
                .animate-scale-in { animation: scaleIn 0.3s ease-out forwards; }
            `}</style>
            <div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg flex flex-col transition-transform duration-300 transform scale-95 animate-scale-in max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-cyan-700 dark:text-cyan-400 font-cinzel">{t('infoDetails')}</h2>
                        <p className="text-gray-600 dark:text-gray-300">{item.name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 dark:hover:text-white text-3xl leading-none" aria-label={t('close')}>&times;</button>
                </header>

                <main className="p-6 flex-grow overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full space-x-2 text-gray-500">
                            <LoadingSpinner />
                            <span>{t('loading')}</span>
                        </div>
                    ) : (
                        <div>
                            <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('description')}</h3>
                            <p className="text-gray-600 dark:text-gray-400 italic leading-relaxed">{item.description || t('noDescription')}</p>
                            {isBestiary && item.stats && (
                                <>
                                    <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mt-4 mb-2">{t('stats')}</h3>
                                    <p className="text-gray-600 dark:text-gray-400">{item.stats}</p>
                                </>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

// New ImagePromptModal component (repurposed from SceneDetailModal)
const ImagePromptModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    promptText: string;
    isLoading: boolean;
    t: (key: any) => string;
}> = ({ isOpen, onClose, promptText, isLoading, t }) => {
    const [copyButtonText, setCopyButtonText] = useState(t('copyPrompt'));
    const promptTextAreaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isOpen) {
            setCopyButtonText(t('copyPrompt')); // Reset on open
        }
    }, [isOpen, t]);

    if (!isOpen) return null;

    const handleCopyClick = () => {
        if (promptTextAreaRef.current) {
            navigator.clipboard.writeText(promptTextAreaRef.current.value);
            setCopyButtonText(t('promptCopied'));
            setTimeout(() => setCopyButtonText(t('copyPrompt')), 2000);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes scaleIn { from { transform: scale(0.95); } to { transform: scale(1); } }
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
                .animate-scale-in { animation: scaleIn 0.3s ease-out forwards; }
            `}</style>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-3xl h-[85vh] flex flex-col transition-transform duration-300 transform scale-95 animate-scale-in" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h2 className="text-xl font-bold text-cyan-700 dark:text-cyan-400 font-cinzel">{t('imagePromptTitle')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 dark:hover:text-white text-3xl leading-none" aria-label={t('close')}>&times;</button>
                </header>
                <main className="p-4 flex-grow overflow-y-auto flex flex-col">
                    {isLoading ? (
                        <div className="flex-grow flex flex-col items-center justify-center text-gray-500 space-y-3">
                            <LoadingSpinner />
                            <span>{t('generatingPrompt')}</span>
                        </div>
                    ) : (
                         <textarea
                            ref={promptTextAreaRef}
                            value={promptText}
                            readOnly
                            className="w-full h-full flex-grow bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition resize-none font-mono text-sm"
                            />
                    )}
                </main>
                <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50">
                     <button
                      type="button"
                      onClick={handleCopyClick}
                      disabled={isLoading || !promptText}
                      className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white font-bold py-2 px-6 rounded-md transition-colors"
                    >
                      {copyButtonText}
                    </button>
                </footer>
            </div>
        </div>
    );
};


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
  const [gameEngineModel, setGameEngineModel] = useState<GameEngineModel>('gemini-2.5-flash');

  // Info Panel State
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [surroundings, setSurroundings] = useState<InfoItem[]>([]);
  const [locations, setLocations] = useState<InfoItem[]>([]);
  const [bestiary, setBestiary] = useState<BestiaryEntry[]>([]);
  const [quests, setQuests] = useState<InfoItem[]>([]);
  const [isInfoLoading, setIsInfoLoading] = useState<Record<InfoType, boolean>>({ surroundings: false, locations: false, bestiary: false, quests: false });
  const [selectedInfoItem, setSelectedInfoItem] = useState<{item: InfoItem | BestiaryEntry, type: InfoType} | null>(null);
  const [isInfoDetailModalOpen, setIsInfoDetailModalOpen] = useState(false);
  const [isInfoDetailLoading, setIsInfoDetailLoading] = useState(false);

  // Image Prompt Modal State (repurposed from Scene Detail)
  const [isImagePromptModalOpen, setIsImagePromptModalOpen] = useState(false);
  const [imagePromptText, setImagePromptText] = useState('');
  const [isImagePromptLoading, setIsImagePromptLoading] = useState(false);

  // FIX: Add missing state for NPC modal
  const [selectedNpc, setSelectedNpc] = useState<Npc | null>(null);
  const [isNpcModalOpen, setIsNpcModalOpen] = useState(false);


  const [turnImageUrl, setTurnImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageGenerationError, setImageGenerationError] = useState<string | null>(null);
  const [imageGenerationModel, setImageGenerationModel] = useState<ImageModel>('imagen-4.0-generate-001');
  const [isSceneImageGenEnabled, setIsSceneImageGenEnabled] = useState(true);
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

  const handleEngineModelChange = useCallback(async (newModel: GameEngineModel) => {
    if (newModel === gameEngineModel || !isGameStarted || !chatSession) return;

    const originalModel = gameEngineModel;
    setGameEngineModel(newModel); // Optimistic UI update
    setIsLoading(true);
    try {
        const currentHistory = await chatSession.getHistory();
        const newChat = recreateChatSession(currentHistory, newModel);
        setChatSession(newChat);
    } catch (e) {
        setError(t('errorSwitchingModel'));
        setGameEngineModel(originalModel); // Revert on error
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  }, [gameEngineModel, isGameStarted, chatSession, t]);

  const generateTurnImage = useCallback(async (gameText: string) => {
    if (imageGenerationModel === 'none' || !isSceneImageGenEnabled) {
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
  }, [t, imageGenerationModel, isSceneImageGenEnabled]);

  const generateNpcPortrait = useCallback(async (npcName: string, npcDescription: string) => {
    if (imageGenerationModel === 'none') return;
    setNpcs(prev => prev.map(n => n.name === npcName ? { ...n, isGeneratingPortrait: true } : n));
    const visualPrompt = t('language') === 'ru'
        ? `Создай портрет персонажа в стиле фэнтези-арта для RPG. Персонаж: ${npcName}. Описание: ${npcDescription}. Стиль: реалистичный, детальный, фокус на лице и характере.`
        : `Create a character portrait in a fantasy art style for an RPG. Character: ${npcName}. Description: ${npcDescription}. Style: realistic, detailed, focus on the face and character.`;
    try {
        const imageUrl = await generateImage(visualPrompt, imageGenerationModel);
        setNpcs(prev => prev.map(n => n.name === npcName ? { ...n, portraitUrl: imageUrl, isGeneratingPortrait: false } : n));
    } catch (err) {
        console.error(`Failed to generate portrait for ${npcName}:`, err);
        setNpcs(prev => prev.map(n => n.name === npcName ? { ...n, isGeneratingPortrait: false } : n)); // Stop loading on error
    }
  }, [t, imageGenerationModel]);

  const handleUpdateInfo = useCallback(async (type: InfoType) => {
      setIsInfoLoading(prev => ({ ...prev, [type]: true }));
      try {
          const stateMap = {
              surroundings: surroundings,
              locations: locations,
              bestiary: bestiary,
              quests: quests,
          };
          const setStateMap = {
              surroundings: setSurroundings,
              locations: setLocations,
              bestiary: setBestiary,
              quests: setQuests,
          };

          const existingItems = stateMap[type];
          const newItems = await generateInfoList(type, gameHistory, language, existingItems, gameEngineModel);
          
          if (newItems.length > 0) {
              const setState = setStateMap[type] as React.Dispatch<React.SetStateAction<(InfoItem | BestiaryEntry)[]>>;
              setState(prev => {
                  const existingIds = new Set(prev.map(i => i.id));
                  const trulyNewItems = newItems.filter(newItem => !existingIds.has(newItem.id));
                  return [...prev, ...trulyNewItems];
              });
          }
      } catch (err) {
          const errorMessage = err instanceof Error ? err.message : t('unknownError');
          setError(`Info Update Error: ${errorMessage}`);
      } finally {
          setIsInfoLoading(prev => ({ ...prev, [type]: false }));
      }
  }, [gameHistory, language, surroundings, locations, bestiary, quests, t, gameEngineModel]);

  const handleInfoItemClick = useCallback(async (item: InfoItem | BestiaryEntry, type: InfoType) => {
    setSelectedInfoItem({ item, type });
    setIsInfoDetailModalOpen(true);

    if (item.description) {
        return;
    }
    
    setIsInfoDetailLoading(true);
    try {
      const details = await getInfoItemDetails(item.name, type, gameHistory, language, gameEngineModel);
      const workingItem = { ...item, description: details.description };

      if ('stats' in workingItem && 'stats' in details) {
          (workingItem as BestiaryEntry).stats = details.stats;
      }
      
      const setStateMap = { surroundings: setSurroundings, locations: setLocations, bestiary: setBestiary, quests: setQuests };
      const setState = setStateMap[type] as React.Dispatch<React.SetStateAction<(InfoItem | BestiaryEntry)[]>>;
      
      setState(prev => prev.map(i => i.id === workingItem.id ? workingItem : i));
      setSelectedInfoItem({ item: workingItem, type });

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : t('unknownError');
        setError(`Info Detail Error: ${errorMessage}`);
    } finally {
        setIsInfoDetailLoading(false);
    }
  }, [gameHistory, language, t, gameEngineModel]);


  const handleStartGame = useCallback(async (settings: GameSettings) => {
    setIsLoading(true);
    setError(null);
    setGameHistory([]);
    setCharacterStatus(null);
    setJournal([]);
    setNpcs([]);
    setSurroundings([]);
    setLocations([]);
    setBestiary([]);
    setQuests([]);
    setEventCounter(settings.eventTimer);
    setEventTimerSetting(settings.eventTimer);
    setGameEngineModel(settings.gameEngineModel);
    setTurnImageUrl(null);
    setImageGenerationError(null);
    setIsSceneImageGenEnabled(true);
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
      setSurroundings([]); // Invalidate surroundings cache on new turn
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
  
    const handleGenerateImagePrompt = useCallback(async () => {
        setIsImagePromptModalOpen(true);
        setIsImagePromptLoading(true);
        setImagePromptText('');

        try {
            const prompt = await generateImagePrompt(gameHistory, language);
            setImagePromptText(prompt);
        } catch (err) {
            const errorMessage = err instanceof Error ? `Error: ${err.message}` : t('unknownError');
            setImagePromptText(errorMessage);
        } finally {
            setIsImagePromptLoading(false);
        }
    }, [gameHistory, language, t]);

  const getSaveState = async (): Promise<SaveState | null> => {
    if (!chatSession || !isGameStarted) return null;
    try {
      const chatHistory = await chatSession.getHistory();
      return { gameHistory, characterStatus, eventCounter, chatHistory, eventTimerSetting, language, journal, npcs, gameSettings, surroundings, locations, bestiary, quests, gameEngineModel, isSceneImageGenEnabled };
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
      const { gameHistory, characterStatus, eventCounter, chatHistory, eventTimerSetting, language: savedLanguage, journal, npcs, gameSettings, surroundings, locations, bestiary, quests, gameEngineModel: savedEngineModel, isSceneImageGenEnabled: savedIsSceneImageGenEnabled } = savedState;
      const modelToLoad = savedEngineModel || 'gemini-2.5-flash';
      const chat = recreateChatSession(chatHistory, modelToLoad);
      setGameHistory(gameHistory);
      setCharacterStatus(characterStatus);
      setEventCounter(eventCounter);
      setEventTimerSetting(eventTimerSetting || 3);
      setLanguage(savedLanguage || 'ru');
      setJournal(journal || []);
      setNpcs(npcs || []);
      setGameSettings(gameSettings || null);
      setGameEngineModel(modelToLoad);
      setIsSceneImageGenEnabled(savedIsSceneImageGenEnabled ?? true);
      setSurroundings(surroundings || []);
      setLocations(locations || []);
      setBestiary(bestiary || []);
      setQuests(quests || []);
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

  const handleContactGM = useCallback(async (message: string, mode: 'gm' | 'expert') => {
      if (!chatSession) { setError(t('errorGMSessionInactive')); return; }
      setIsGMContactLoading(true);
      setGmContactHistory(prev => [...prev, { type: 'user', content: message }]);
      setGmContactHistory(prev => [...prev, { type: 'gm', content: '' }]);
      try {
        const gameApiHistory = await chatSession.getHistory();
        const stream = await contactGameMaster(gameApiHistory, message, language, gameEngineModel, mode);
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
  }, [chatSession, language, t, gameEngineModel]);

  const handleItemClick = useCallback(async (item: InventoryItem) => {
      setSelectedItem(item);
      setIsItemModalOpen(true);
      setIsItemDescLoading(true);
      setItemDescription('');
      try {
          const desc = await getItemDescription(item.name, characterStatus, gameSettings, language, gameEngineModel);
          setItemDescription(desc);
      } catch (err) {
          setItemDescription(t('errorGetItemDesc'));
      } finally {
          setIsItemDescLoading(false);
      }
  }, [characterStatus, gameSettings, language, t, gameEngineModel]);

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
        <header className="text-center py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 flex items-center justify-center relative">
          <div className="flex-grow">
            <h1 className="text-2xl md:text-4xl font-bold text-cyan-600 dark:text-cyan-400 tracking-wider font-cinzel">
              {t('appTitle')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('appSubtitle')}</p>
          </div>
          {isGameStarted && (
            <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center gap-1 bg-gray-200 dark:bg-gray-800 p-1 rounded-lg shadow-md">
                <button
                    onClick={() => handleEngineModelChange('gemini-2.5-flash')}
                    disabled={isLoading}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${gameEngineModel === 'gemini-2.5-flash' ? 'bg-cyan-600 text-white' : 'bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}
                    title={t('fast')}
                >
                    ⚡️
                </button>
                <button
                    onClick={() => handleEngineModelChange('gemini-2.5-pro')}
                    disabled={isLoading}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${gameEngineModel === 'gemini-2.5-pro' ? 'bg-purple-600 text-white' : 'bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}
                    title={t('quality')}
                >
                    💎
                </button>
            </div>
          )}
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
                gameEngineModel={gameEngineModel}
                setGameEngineModel={setGameEngineModel}
                t={t}
              />
            </div>
          ) : (
            <div className="flex-grow flex gap-4 min-h-0">
              <CharacterStatus 
                status={characterStatus} 
                onUpdate={() => handleSendAction(language === 'ru' ? 'статус' : 'status')}
                isLoading={isLoading}
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
                  onOpenImagePrompt={handleGenerateImagePrompt}
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
                onShowInfoPanel={() => setIsInfoPanelOpen(true)}
                imageGenerationModel={imageGenerationModel}
                setImageGenerationModel={setImageGenerationModel}
                isSceneImageGenEnabled={isSceneImageGenEnabled}
                setIsSceneImageGenEnabled={setIsSceneImageGenEnabled}
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
        isLearningModeActive={!!gameSettings?.learningTopic}
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
      <InfoPanelModal
        isOpen={isInfoPanelOpen}
        onClose={() => setIsInfoPanelOpen(false)}
        surroundings={surroundings}
        locations={locations}
        bestiary={bestiary}
        quests={quests}
        isLoading={isInfoLoading}
        onUpdate={handleUpdateInfo}
        onItemClick={handleInfoItemClick}
        t={t}
      />
      <InfoDetailModal
        isOpen={isInfoDetailModalOpen}
        onClose={() => {
            setIsInfoDetailModalOpen(false);
            setSelectedInfoItem(null);
        }}
        item={selectedInfoItem?.item || null}
        isLoading={isInfoDetailLoading}
        t={t}
      />
      <ImagePromptModal
        isOpen={isImagePromptModalOpen}
        onClose={() => setIsImagePromptModalOpen(false)}
        promptText={imagePromptText}
        isLoading={isImagePromptLoading}
        t={t}
      />
    </div>
  );
};

export default App;
