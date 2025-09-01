import React, { useState, useCallback, useEffect } from 'react';
import type { GameSettings, GameTurn, CharacterStatus as CharacterStatusType, InventoryItem, SaveState } from './types';
import { GameDifficulty } from './types';
import { initGameSession, sendPlayerAction, recreateChatSession } from './services/geminiService';
import type { Chat } from '@google/genai';
import GameSetup from './components/GameSetup';
import GameWindow from './components/GameWindow';
import CharacterStatus from './components/CharacterStatus';
import ImageGenerationModal from './components/ImageGenerationModal';

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
  const [hasSaveData, setHasSaveData] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isVisualizeModalOpen, setIsVisualizeModalOpen] = useState(false);

  useEffect(() => {
    const savedGame = localStorage.getItem(SAVE_KEY);
    setHasSaveData(!!savedGame);
  }, []);

  const handleStartGame = useCallback(async (settings: GameSettings) => {
    setIsLoading(true);
    setError(null);
    setGameHistory([]);
    setCharacterStatus(null);
    setEventCounter(3);
    setAvatarUrl(null);
    try {
      const { chat, initialResponse } = await initGameSession(settings);
      setChatSession(chat);
      setGameHistory([{ type: 'game', content: initialResponse }]);
      setIsGameStarted(true);
    } catch (err) {
      setError(err instanceof Error ? `Failed to start game: ${err.message}` : 'An unknown error occurred.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      setEventCounter(3); // Reset
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
      if (command === 'статус' || command === 'инвентарь' || command === 'здоровье') {
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
  }, [chatSession, gameHistory, eventCounter]);
  
  const handleRestart = () => {
    setIsGameStarted(false);
    setGameHistory([]);
    setChatSession(null);
    setError(null);
    setCharacterStatus(null);
    setEventCounter(3);
    setAvatarUrl(null);
  };

  const handleAvatarChange = useCallback((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
          setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
  }, []);

  const handleSaveGame = async () => {
    if (!chatSession || !isGameStarted) return;
    try {
        // FIX: Use the public getHistory() method instead of accessing the private history property.
        const chatHistory = await chatSession.getHistory();
        const gameState: SaveState = {
            gameHistory,
            characterStatus,
            avatarUrl,
            eventCounter,
            chatHistory,
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
        setSaveMessage('Игра сохранена!');
        setTimeout(() => setSaveMessage(''), 3000);
        setHasSaveData(true);
    } catch (e) {
        setError('Не удалось сохранить игру.');
        console.error(e);
    }
  };

  const handleLoadGame = useCallback(() => {
    const savedGameJSON = localStorage.getItem(SAVE_KEY);
    if (!savedGameJSON) {
        setError("Сохраненные данные не найдены.");
        return;
    }
    try {
        const savedState: SaveState = JSON.parse(savedGameJSON);
        const { gameHistory, characterStatus, avatarUrl, eventCounter, chatHistory } = savedState;
        
        const chat = recreateChatSession(chatHistory);

        setGameHistory(gameHistory);
        setCharacterStatus(characterStatus);
        setAvatarUrl(avatarUrl);
        setEventCounter(eventCounter);
        setChatSession(chat);
        setIsGameStarted(true);
        setError(null);
    } catch (e) {
        setError("Не удалось загрузить игру. Данные могут быть повреждены.");
        console.error(e);
        localStorage.removeItem(SAVE_KEY); 
        setHasSaveData(false);
    }
  }, []);

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
                  saveMessage={saveMessage}
                  onOpenVisualizeModal={() => setIsVisualizeModalOpen(true)}
                />
              </div>
            </div>
          )}
          {error && <div className="mt-4 p-4 bg-red-900/50 text-red-300 border border-red-500 rounded-lg flex-shrink-0">{error}</div>}
        </main>
      </div>
       <ImageGenerationModal 
            isOpen={isVisualizeModalOpen}
            onClose={() => setIsVisualizeModalOpen(false)}
        />
    </div>
  );
};

export default App;