import React, { useState, useRef, useEffect } from 'react';
import type { GameTurn } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface GameWindowProps {
  history: GameTurn[];
  onSendAction: (action: string) => void;
  isLoading: boolean;
  onRestart: () => void;
  eventCounter: number;
  onSaveGame: () => void;
  onDownloadSave: () => void;
  saveMessage: string;
}

const DESCRIBE_PROMPT = "Опиши красочно и во всех деталях текущую обставновку в игре. Не жалей токенов. Сделай это в формате подробнейшего промта для нейросети которая генерирует картинки";

const GameWindow: React.FC<GameWindowProps> = ({ history, onSendAction, isLoading, onRestart, eventCounter, onSaveGame, onDownloadSave, saveMessage }) => {
  const [input, setInput] = useState('');
  const historyEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendAction(input);
      setInput('');
    }
  };
  
  const formatContent = (content: string) => {
    // Make bold text (e.g., **Ход 1**) actually bold
    const boldedContent = (content || '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-cyan-300">$1</strong>');
    // Render newlines
    return boldedContent.replace(/\n/g, '<br />');
  };

  return (
    <div className="relative flex flex-col h-full bg-gray-800/50 rounded-lg shadow-2xl border border-gray-700 overflow-hidden">
       <div className="absolute top-4 right-4 flex gap-2 z-10">
        <div className="flex rounded-md shadow-sm">
            <button
              type="button"
              onClick={onSaveGame}
              disabled={isLoading}
              className="relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-600 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-sm font-medium text-white focus:z-10 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
              title="Сохранить игру в браузере"
            >
              Сохранить
            </button>
            <button
              type="button"
              onClick={onDownloadSave}
              disabled={isLoading}
              className="-ml-px relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-600 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-sm font-medium text-white focus:z-10 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
              title="Скачать файл сохранения"
            >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
        </div>
        <button
          type="button"
          onClick={onRestart}
          disabled={isLoading}
          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition-colors"
          title="Начать новую игру"
        >
          Рестарт
        </button>
      </div>
      {saveMessage && (
        <div className="absolute top-20 right-4 bg-green-600/90 text-white text-sm py-1 px-3 rounded-md z-10 animate-pulse">
            {saveMessage}
        </div>
      )}
      <div className="flex-grow p-4 md:p-6 overflow-y-auto">
        <div className="space-y-6">
          {history.map((turn, index) => (
            <div key={index}>
              {turn.type === 'game' ? (
                <div className="text-gray-300 leading-relaxed prose prose-invert prose-p:text-gray-300" dangerouslySetInnerHTML={{ __html: formatContent(turn.content) }}></div>
              ) : (
                <div className="text-right">
                  <p className="inline-block bg-cyan-900/50 text-cyan-200 px-4 py-2 rounded-lg ml-auto">
                    <em>&gt; {turn.content}</em>
                  </p>
                </div>
              )}
            </div>
          ))}
          {isLoading && history[history.length-1].type === 'player' && (
             <div className="text-gray-300 leading-relaxed flex items-center space-x-2">
                <LoadingSpinner />
                <span>Генерация ответа...</span>
             </div>
          )}
        </div>
        <div ref={historyEndRef} />
      </div>
      <div className="p-4 bg-gray-900/70 border-t border-gray-700">
        <div className="flex justify-center gap-2 mb-3">
           <button
             type="button"
             onClick={() => onSendAction('Продолжи')}
             disabled={isLoading}
             className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition-colors text-sm"
           >
             Продолжи
           </button>
           <button
             type="button"
             onClick={() => onSendAction(DESCRIBE_PROMPT)}
             disabled={isLoading}
             className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition-colors text-sm"
           >
             Опиши детально
           </button>
        </div>
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isLoading ? 'Ожидание ответа...' : 'Что вы делаете?'}
            className="flex-grow bg-gray-800 border border-gray-600 rounded-md py-2 px-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
            disabled={isLoading}
            autoFocus
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition-colors"
          >
            Отправить
          </button>
        </form>
         <p className="text-xs text-gray-500 text-center mt-2">Ходов до случайного события: {eventCounter}</p>
      </div>
    </div>
  );
};

export default GameWindow;