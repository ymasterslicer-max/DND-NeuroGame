
import React from 'react';
import type { Npc } from '../types';

interface NpcDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  npc: Npc | null;
  t: (key: any) => string;
}

const NpcDetailModal: React.FC<NpcDetailModalProps> = ({ isOpen, onClose, npc, t }) => {
  if (!isOpen || !npc) return null;

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
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg flex flex-col transition-transform duration-300 transform scale-95 animate-scale-in max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <h2 className="text-xl font-bold text-cyan-700 dark:text-cyan-400 font-cinzel">{npc.name}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-800 dark:hover:text-white text-3xl leading-none" aria-label={t('close')}>&times;</button>
        </header>
        
        <main className="p-6 flex-grow overflow-y-auto">
          {npc.portraitUrl && (
            <div className="w-full aspect-square bg-gray-100 dark:bg-gray-900/50 rounded-md flex items-center justify-center border border-gray-200 dark:border-gray-700 overflow-hidden mb-4">
               <img src={npc.portraitUrl} alt={npc.name} className="w-full h-full object-cover" />
            </div>
          )}
           <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('description')}</h3>
           <p className="text-gray-600 dark:text-gray-400 italic leading-relaxed">{npc.description}</p>
        </main>
      </div>
    </div>
  );
};

export default NpcDetailModal;
