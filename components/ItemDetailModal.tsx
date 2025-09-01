import React from 'react';
import type { InventoryItem } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface ItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  description: string;
  isLoading: boolean;
  onAction: (action: 'use' | 'drop') => void;
  t: (key: any) => string;
}

const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ isOpen, onClose, item, description, isLoading, onAction, t }) => {
  if (!isOpen || !item) return null;

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
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md flex flex-col transition-transform duration-300 transform scale-95 animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-cyan-700 dark:text-cyan-400 font-cinzel">{t('itemDetails')}</h2>
            <p className="text-gray-600 dark:text-gray-300">{item.name} <span className="text-sm text-gray-400">(x{item.quantity})</span></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 dark:hover:text-white text-3xl leading-none" aria-label={t('close')}>&times;</button>
        </header>
        
        <main className="p-6 flex-grow overflow-y-auto">
           <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('description')}</h3>
           {isLoading ? (
             <div className="flex items-center space-x-2 text-gray-500">
                <LoadingSpinner />
                <span>{t('loading')}</span>
             </div>
           ) : (
            <p className="text-gray-600 dark:text-gray-400 italic leading-relaxed">{description}</p>
           )}
        </main>

        <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-3 text-center">{t('actions')}</h3>
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => onAction('use')}
                    className="w-full flex justify-center items-center bg-green-600/20 hover:bg-green-600/30 text-green-800 dark:text-green-300 font-bold py-2 px-4 rounded-md transition-colors"
                >
                    {t('use')}
                </button>
                 <button
                    onClick={() => onAction('drop')}
                    className="w-full flex justify-center items-center bg-red-600/10 hover:bg-red-600/20 text-red-700 dark:text-red-400 font-bold py-2 px-4 rounded-md transition-colors"
                >
                    {t('drop')}
                </button>
            </div>
        </footer>
      </div>
    </div>
  );
};

export default ItemDetailModal;
