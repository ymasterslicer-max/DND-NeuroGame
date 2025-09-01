import React, { useState } from 'react';
import type { GameSettings } from '../types';
import { GameDifficulty } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface GameSetupProps {
  onStartGame: (settings: GameSettings) => void;
  isLoading: boolean;
  onLoadGame: () => void;
  hasSaveData: boolean;
}

const GameSetup: React.FC<GameSetupProps> = ({ onStartGame, isLoading, onLoadGame, hasSaveData }) => {
  const [setting, setSetting] = useState('Киберпанк-мегаполис под вечным дождем');
  const [description, setDescription] = useState('Бывший корпоративный детектив с кибернетической рукой, ищущий правду о своем прошлом.');
  const [difficulty, setDifficulty] = useState<GameDifficulty>(GameDifficulty.Normal);
  const [narrativeStyle, setNarrativeStyle] = useState('Нуарный детектив с элементами экзистенциализма.');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (setting.trim() && description.trim() && narrativeStyle.trim()) {
      onStartGame({ setting, description, difficulty, narrativeStyle });
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-gray-800/50 p-6 md:p-8 rounded-lg shadow-2xl border border-gray-700 backdrop-blur-sm">
      <h2 className="text-2xl font-bold text-center text-cyan-300 mb-6">Создайте свое приключение</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="setting" className="block text-sm font-medium text-gray-300 mb-2">
            Сеттинг (где происходит история?)
          </label>
          <input
            id="setting"
            type="text"
            value={setting}
            onChange={(e) => setSetting(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-md py-2 px-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
            placeholder="Например: Забытое королевство в облаках"
            required
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
            Описание персонажа (кто вы?)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-md py-2 px-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
            placeholder="Например: Старый волшебник, потерявший память"
            rows={3}
            required
            disabled={isLoading}
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
        <div className="pt-2 space-y-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-md transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-cyan-500/50"
          >
            {isLoading ? <LoadingSpinner /> : 'Начать приключение'}
          </button>
           <button
            type="button"
            onClick={onLoadGame}
            disabled={!hasSaveData || isLoading}
            className="w-full flex justify-center items-center bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-gray-500/50"
          >
            Загрузить игру
          </button>
        </div>
      </form>
    </div>
  );
};

export default GameSetup;
