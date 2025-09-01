import React, { useState, useRef } from 'react';
import type { GameSettings } from '../types';
import { GameDifficulty } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { generateEnhancedSetting, generateCharacter } from '../services/geminiService';


interface GameSetupProps {
  onStartGame: (settings: GameSettings) => void;
  isLoading: boolean;
  onLoadGame: () => void;
  onLoadFromFile: (file: File) => void;
  hasSaveData: boolean;
}

const GameSetup: React.FC<GameSetupProps> = ({ onStartGame, isLoading, onLoadGame, onLoadFromFile, hasSaveData }) => {
  const [setting, setSetting] = useState('Киберпанк-мегаполис под вечным дождем');
  const [description, setDescription] = useState('Бывший корпоративный детектив с кибернетической рукой, ищущий правду о своем прошлом.');
  const [difficulty, setDifficulty] = useState<GameDifficulty>(GameDifficulty.Normal);
  const [narrativeStyle, setNarrativeStyle] = useState('Нуарный детектив с элементами экзистенциализма.');
  const [eventTimer, setEventTimer] = useState(3);
  
  const [isEnhancingSetting, setIsEnhancingSetting] = useState(false);
  const [isGeneratingCharacter, setIsGeneratingCharacter] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (setting.trim() && description.trim() && narrativeStyle.trim()) {
      onStartGame({ setting, description, difficulty, narrativeStyle, eventTimer });
    }
  };

  const handleEnhanceSetting = async () => {
    if (!setting.trim() || isEnhancingSetting) return;
    setIsEnhancingSetting(true);
    setGenerationError(null);
    try {
      const enhancedSetting = await generateEnhancedSetting(setting);
      setSetting(enhancedSetting);
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setIsEnhancingSetting(false);
    }
  };

  const handleGenerateCharacter = async () => {
    if (!setting.trim() || isGeneratingCharacter) return;
    setIsGeneratingCharacter(true);
    setGenerationError(null);
    try {
      const generatedCharacter = await generateCharacter(setting);
      setDescription(generatedCharacter);
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setIsGeneratingCharacter(false);
    }
  };

  const handleFileLoadClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onLoadFromFile(event.target.files[0]);
      // Reset input value to allow loading the same file again
      event.target.value = ''; 
    }
  };


  return (
    <div className="w-full max-w-2xl mx-auto bg-gray-800/50 p-6 md:p-8 rounded-lg shadow-2xl border border-gray-700 backdrop-blur-sm">
       <input 
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="application/json,.json"
      />
      <h2 className="text-2xl font-bold text-center text-cyan-300 mb-6">Создайте свое приключение</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="setting" className="block text-sm font-medium text-gray-300 mb-2">
            Сеттинг (где происходит история?)
          </label>
          <div className="flex items-start gap-2">
            <textarea
              id="setting"
              value={setting}
              onChange={(e) => setSetting(e.target.value)}
              className="flex-grow w-full bg-gray-900 border border-gray-600 rounded-md py-2 px-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
              placeholder="Например: Забытое королевство в облаках"
              rows={4}
              required
              disabled={isLoading || isEnhancingSetting}
            />
            <button
                type="button"
                onClick={handleEnhanceSetting}
                disabled={isEnhancingSetting || isLoading || !setting.trim()}
                className="flex-shrink-0 flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed rounded-md transition-colors"
                title="Улучшить сеттинг с помощью ИИ"
            >
              {isEnhancingSetting ? <LoadingSpinner /> : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-300">
              Описание персонажа (кто вы?)
            </label>
             <button
                type="button"
                onClick={handleGenerateCharacter}
                disabled={isGeneratingCharacter || isLoading || !setting.trim()}
                className="flex items-center gap-2 text-xs bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold py-1 px-3 rounded-md transition-colors"
              >
              {isGeneratingCharacter ? <LoadingSpinner/> : 'Придумать персонажа'}
            </button>
          </div>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-md py-2 px-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
            placeholder="Например: Старый волшебник, потерявший память"
            rows={4}
            required
            disabled={isLoading || isGeneratingCharacter}
          />
        </div>
        <div>
          <label htmlFor="narrativeStyle" className="block text-sm font-medium text-gray-300 mb-2">
            Стиль повествования
          </label>
          <input
            id="narrativeStyle"
            type="text"
            value={narrativeStyle}
            onChange={(e) => setNarrativeStyle(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-md py-2 px-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
            placeholder="Например: В стиле Терри Пратчетта, с иронией"
            required
            disabled={isLoading}
          />
        </div>
         <div>
          <label htmlFor="event-timer" className="block text-sm font-medium text-gray-300 mb-2">
            Ходов до случайного события
          </label>
          <input
            id="event-timer"
            type="number"
            value={eventTimer}
            onChange={(e) => setEventTimer(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-full bg-gray-900 border border-gray-600 rounded-md py-2 px-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
            min="1"
            required
            disabled={isLoading}
          />
        </div>
        <div>
          <span className="block text-sm font-medium text-gray-300 mb-2">Сложность</span>
          <div className="flex space-x-4">
            {/* FIX: Use Object.keys to iterate over enum keys, not values, to fix the TypeScript error on line 61. */}
            {(Object.keys(GameDifficulty) as Array<keyof typeof GameDifficulty>).map((key) => (
              <label key={key} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="difficulty"
                  value={GameDifficulty[key]}
                  checked={difficulty === GameDifficulty[key]}
                  onChange={() => setDifficulty(GameDifficulty[key])}
                  className="form-radio h-4 w-4 text-cyan-500 bg-gray-700 border-gray-600 focus:ring-cyan-600"
                  disabled={isLoading}
                />
                <span className="text-gray-300">{GameDifficulty[key]}</span>
              </label>
            ))}
          </div>
        </div>
        
        {generationError && (
          <div className="text-sm text-red-400 bg-red-900/50 border border-red-700 p-3 rounded-md">
              <strong>Ошибка генерации:</strong> {generationError}
          </div>
        )}

        <div className="pt-2 space-y-4">
          <button
            type="submit"
            disabled={isLoading || isEnhancingSetting || isGeneratingCharacter}
            className="w-full flex justify-center items-center bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-md transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-cyan-500/50"
          >
            {isLoading ? <LoadingSpinner /> : 'Начать приключение'}
          </button>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={onLoadGame}
              disabled={!hasSaveData || isLoading}
              className="w-full flex justify-center items-center bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-gray-500/50"
            >
              Загрузить игру
            </button>
             <button
              type="button"
              onClick={handleFileLoadClick}
              disabled={isLoading}
              className="w-full flex justify-center items-center bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-gray-500/50"
            >
              Загрузить из файла
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default GameSetup;