import React, { useState, useRef, useEffect } from 'react';
import type { GameTurn } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface GameWindowProps {
  history: GameTurn[];
  onSendAction: (action: string) => void;
  isLoading: boolean;
  eventCounter: number;
  onOpenImagePrompt: () => void;
  t: (key: any) => string;
}

const GameWindow: React.FC<GameWindowProps> = ({ history, onSendAction, isLoading, eventCounter, onOpenImagePrompt, t }) => {
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
    const boldedContent = (content || '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-cyan-600 dark:text-cyan-300 font-semibold">$1</strong>');
    return boldedContent.replace(/\n/g, '<br />');
  };

  return (
    <div className="relative flex flex-col h-full bg-gray-50 dark:bg-gray-800/50 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-300">
      <div className="flex-grow p-4 md:p-6 overflow-y-auto">
        <div className="space-y-6">
          {history.map((turn, index) => (
            <div key={index}>
              {turn.type === 'game' ? (
                <div className="text-gray-700 dark:text-gray-300 leading-relaxed prose prose-invert prose-p:text-gray-300" dangerouslySetInnerHTML={{ __html: formatContent(turn.content) }}></div>
              ) : (
                <div className="text-right">
                  <p className="inline-block bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-200 px-4 py-2 rounded-lg ml-auto">
                    <em>&gt; {turn.content}</em>
                  </p>
                </div>
              )}
            </div>
          ))}
          {isLoading && history.length > 0 && history[history.length-1].type === 'player' && (
             <div className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-center space-x-2">
                <LoadingSpinner />
                <span>{t('generatingResponse')}</span>
             </div>
          )}
        </div>
        <div ref={historyEndRef} />
      </div>
      <div className="p-4 bg-white/70 dark:bg-gray-900/70 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-center gap-2 mb-3">
           <button
             type="button"
             onClick={() => onSendAction(t('continue'))}
             disabled={isLoading}
             className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-800 dark:text-white font-bold py-2 px-4 rounded-md transition-colors text-sm"
           >
             {t('continue')}
           </button>
           <button
             type="button"
             onClick={onOpenImagePrompt}
             disabled={isLoading}
             className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-800 dark:text-white font-bold py-2 px-4 rounded-md transition-colors text-sm"
           >
             {t('imagePrompt')}
           </button>
        </div>
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isLoading ? t('inputPlaceholderWaiting') : t('inputPlaceholderAction')}
            className="flex-grow bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
            disabled={isLoading}
            autoFocus
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition-colors"
          >
            {t('send')}
          </button>
        </form>
         <p className="text-xs text-gray-500 text-center mt-2">{t('randomEventCounter')}: {eventCounter}</p>
      </div>
    </div>
  );
};

export default GameWindow;
