import React, { useState, useRef, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface GMContactHistoryItem {
  type: 'user' | 'gm';
  content: string;
}

interface GMContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (message: string, mode: 'gm' | 'expert') => void;
  history: GMContactHistoryItem[];
  isLoading: boolean;
  isLearningModeActive: boolean;
  t: (key: any) => string;
}

const GMContactModal: React.FC<GMContactModalProps> = ({ isOpen, onClose, onSendMessage, history, isLoading, isLearningModeActive, t }) => {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'gm' | 'expert'>('gm');
  const historyEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [history, isOpen]);

  useEffect(() => {
      if (!isOpen) {
          setInput(''); // Clear input when modal closes
          setMode('gm'); // Reset to default mode
      }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input, mode);
      setInput('');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
       <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
            from { transform: scale(0.95); }
            to { transform: scale(1); }
        }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .animate-scale-in { animation: scaleIn 0.3s ease-out forwards; }
      `}</style>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl h-[80vh] flex flex-col transition-transform duration-300 transform scale-95 animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-cyan-700 dark:text-cyan-400 font-cinzel">{t('contactGM')}</h2>
            {isLearningModeActive && (
              <div className="flex bg-gray-200 dark:bg-gray-900 rounded-lg p-1 space-x-1">
                <button 
                  onClick={() => setMode('gm')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${mode === 'gm' ? 'bg-cyan-600 text-white shadow' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}
                >
                  {t('contactGM')}
                </button>
                <button 
                  onClick={() => setMode('expert')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${mode === 'expert' ? 'bg-purple-600 text-white shadow' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}
                >
                  {t('expert')}
                </button>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 dark:hover:text-white text-3xl leading-none" aria-label={t('close')}>&times;</button>
        </header>
        
        <main className="p-4 flex-grow overflow-y-auto">
          <div className="space-y-6">
            {history.map((turn, index) => (
              <div key={index}>
                {turn.type === 'gm' ? (
                  <div className="text-gray-700 dark:text-gray-300 leading-relaxed prose prose-invert prose-p:text-gray-300" dangerouslySetInnerHTML={{ __html: turn.content.replace(/\n/g, '<br />') }}></div>
                ) : (
                  <div className="text-right">
                    <p className="inline-block bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-200 px-4 py-2 rounded-lg ml-auto">
                      <em>{turn.content}</em>
                    </p>
                  </div>
                )}
              </div>
            ))}
             {isLoading && history.length > 0 && history[history.length - 1].type === 'gm' && history[history.length - 1].content === '' && (
             <div className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-center space-x-2">
                <LoadingSpinner />
                <span>{t('gmThinks')}</span>
             </div>
            )}
          </div>
          <div ref={historyEndRef} />
        </main>

        <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex items-center space-x-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                }
              }}
              className="flex-grow bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition resize-none"
              placeholder={isLoading ? t('inputPlaceholderWaiting') : t('gmInputPlaceholder')}
              rows={2}
              disabled={isLoading}
              autoFocus
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition-colors self-stretch"
            >
              {t('send')}
            </button>
          </form>
        </footer>
      </div>
    </div>
  );
};

export default GMContactModal;