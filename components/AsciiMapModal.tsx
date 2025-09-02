
import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface AsciiMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string | null;
  isLoading: boolean;
  t: (key: any) => string;
}

const AsciiMapModal: React.FC<AsciiMapModalProps> = ({ isOpen, onClose, content, isLoading, t }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
       <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.95); } to { transform: scale(1); } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .animate-scale-in { animation: scaleIn 0.3s ease-out forwards; }
      `}</style>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl h-[80vh] flex flex-col transition-transform duration-300 transform scale-95 animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-cyan-700 dark:text-cyan-400 font-cinzel">{t('asciiMapModalTitle')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 dark:hover:text-white text-3xl leading-none" aria-label={t('close')}>&times;</button>
        </header>
        
        <main className="p-4 flex-grow overflow-auto bg-gray-50 dark:bg-black/50 text-gray-800 dark:text-gray-200 font-mono">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner />
              <span className="ml-4 text-gray-500">{t('generating')}</span>
            </div>
          ) : (
            <pre className="text-xs sm:text-sm whitespace-pre-wrap break-all leading-tight sm:leading-normal">
              {content}
            </pre>
          )}
        </main>

        <footer className="p-2 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500">{t('mapGeneratedOnRequest')}</p>
        </footer>
      </div>
    </div>
  );
};

export default AsciiMapModal;
