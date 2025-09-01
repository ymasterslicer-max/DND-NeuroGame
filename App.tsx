import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { GameSettings, GameTurn, CharacterStatus as CharacterStatusType, InventoryItem, SaveState } from './types';
import { GameDifficulty } from './types';
import { initGameSession, sendPlayerAction, recreateChatSession, generateImage } from './services/geminiService';
import type { Chat } from '@google/genai';
import GameSetup from './components/GameSetup';
import GameWindow from './components/GameWindow';
import CharacterStatus from './components/CharacterStatus';
import ImageGenerationPanel from './components/ImageGenerationPanel';
import ImageViewerModal from './components/ImageViewerModal';

const SAVE_KEY = 'gemini-rpg-savegame';

const parseStatusFromString = (text: string, command: string): Partial<CharacterStatusType> | null => {
  if (command !== 'статус' && command !== 'инвентарь' && command !== 'здоровье') {
    return null;
  }

  const combinedStatus: Partial<CharacterStatusType> = {};
  const lines = text.split('\n');
  let isInventorySection = false;
  const inventory: InventoryItem[] = [];
  const status: { [key: string]: string } = {};

  lines.forEach(line => {
    // Check for the start of the inventory section
    if (line.toLowerCase().includes('инвентарь')) {
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
            if (key && value && !key.toLowerCase().includes('инвентарь')) {
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
      const { chat, initialResponse } = await initGameSession(settings);
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
  }, [generateTurnImage]);

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
      actionToSend += "\n\n[СИСТЕМНОЕ СООБЩЕНИЕ: Счетчик случайных событий достиг нуля. Сделай бросок на случайное событие согласно правилам.]";
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
      const isMetaCommand = command === 'статус' || command === 'инвентарь' || command === 'здоровье';
      
      if (fullResponseContent && !isMetaCommand) {
          generateTurnImage(fullResponseContent);
      }
      
      if (isMetaCommand) {
          const parsedData = parseStatusFromString(fullResponseContent, command);
          if (parsedData) {
              setCharacterStatus(parsedData);
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
  }, [chatSession, gameHistory, eventCounter, eventTimerSetting, generateTurnImage]);
  
  const handleRestart = () => {
    setIsGameStarted(false);
    setGameHistory([]);
    setChatSession(null);
    setError(null);
    setCharacterStatus(null);
    setEventCounter(3);
    setEventTimerSetting(3);
    setAvatarUrl(null);
    setTurnImageUrl(null);
    setImageGenerationError(null);
  };

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
    setSaveMessage('Игра сохранена!');
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
    setSaveMessage('Файл сохранения скачан!');
    setTimeout(() => setSaveMessage(''), 3000);
  };
  
  const applyLoadedState = useCallback((savedState: SaveState) => {
      const { gameHistory, characterStatus, avatarUrl, eventCounter, chatHistory, eventTimerSetting } = savedState;
      
      const chat = recreateChatSession(chatHistory);

      setGameHistory(gameHistory);
      setCharacterStatus(characterStatus);
      setAvatarUrl(avatarUrl);
      setEventCounter(eventCounter);
      setEventTimerSetting(eventTimerSetting || 3);
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

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-mono flex flex-col items-center p-4">
      <div className="w-full max-w-7xl flex flex-col h-screen">
        <header className="text-center py-4 border-b border-gray-700 flex-shrink-0">
          <h1 className="text-2xl md:text-4xl font-bold text-cyan-400 tracking-wider">
            Gemini Text Adventure RPG
          </h1>
          <p className="text-sm text-gray-400 mt-1">Your story, shaped by your choices.</p>
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
              />
            </div>
          ) : (
            <div className="flex-grow flex gap-4 min-h-0">
              <CharacterStatus 
                status={characterStatus} 
                avatarUrl={avatarUrl} 
                onAvatarChange={handleAvatarChange}
                onUpdate={() => handleSendAction('статус')}
                isLoading={isLoading}
              />
              <div className="flex-grow min-w-0 h-full">
                <GameWindow
                  history={gameHistory}
                  onSendAction={handleSendAction}
                  isLoading={isLoading}
                  onRestart={handleRestart}
                  eventCounter={eventCounter}
                  onSaveGame={handleSaveGame}
                  onDownloadSave={handleDownloadSave}
                  saveMessage={saveMessage}
                />
              </div>
              <ImageGenerationPanel 
                imageUrl={turnImageUrl}
                isLoading={isGeneratingImage}
                error={imageGenerationError}
                onImageClick={() => setIsImageViewerOpen(true)}
              />
            </div>
          )}
          {error && <div className="mt-4 p-4 bg-red-900/50 text-red-300 border border-red-500 rounded-lg flex-shrink-0">{error}</div>}
        </main>
      </div>
      <ImageViewerModal 
        isOpen={isImageViewerOpen}
        imageUrl={turnImageUrl}
        onClose={() => setIsImageViewerOpen(false)}
      />
    </div>
  );
};

export default App;