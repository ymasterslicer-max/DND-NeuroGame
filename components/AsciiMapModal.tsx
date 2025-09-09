import React, { useState, useMemo } from 'react';
import type { InfoType, InfoItem, BestiaryEntry } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface InfoPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  surroundings: InfoItem[];
  locations: InfoItem[];
  bestiary: BestiaryEntry[];
  quests: InfoItem[];
  isLoading: Record<InfoType, boolean>;
  onUpdate: (type: InfoType) => void;
  onItemClick: (item: InfoItem | BestiaryEntry, type: InfoType) => void;
  t: (key: any) => string;
}

const InfoPanelModal: React.FC<InfoPanelModalProps> = ({ 
    isOpen, 
    onClose, 
    surroundings, 
    locations, 
    bestiary,
    quests,
    isLoading, 
    onUpdate, 
    onItemClick, 
    t 
}) => {
  // Hooks and their dependencies must be called unconditionally at the top level.
  const [activeTab, setActiveTab] = useState<InfoType>('surroundings');
  
  // FIX: Explicitly typing dataMap to create an array of a union type `(InfoItem | BestiaryEntry)[]`
  // instead of a union of array types `InfoItem[] | BestiaryEntry[]`. This allows methods like
  // `reduce` to work correctly on `currentData` without TypeScript inferring incorrect types for its parameters.
  const dataMap: Record<InfoType, (InfoItem | BestiaryEntry)[]> = {
    surroundings: surroundings,
    locations: locations,
    bestiary: bestiary,
    quests: quests,
  };

  const currentData = dataMap[activeTab];

  const groupedData = useMemo(() => {
    // The initial value for reduce must be typed for TypeScript to correctly infer the accumulator's type.
    return currentData.reduce((acc, item) => {
        (acc[item.category] = acc[item.category] || []).push(item);
        return acc;
    }, {} as Record<string, (InfoItem | BestiaryEntry)[]>);
  }, [currentData]);

  // Conditional returns are only allowed AFTER all hooks have been called.
  if (!isOpen) return null;

  const TabButton: React.FC<{ infoType: InfoType; labelKey: string }> = ({ infoType, labelKey }) => (
    <button
      onClick={() => setActiveTab(infoType)}
      className={`flex-1 py-2 px-4 text-sm font-medium transition-colors rounded-md disabled:opacity-50 ${
        activeTab === infoType
          ? 'bg-cyan-600/20 dark:bg-cyan-500/30 text-cyan-700 dark:text-cyan-300'
          : 'text-gray-500 hover:bg-gray-200/50 dark:text-gray-400 dark:hover:bg-gray-700/50'
      }`}
    >
      {t(labelKey)}
    </button>
  );

  const isCurrentTabLoading = isLoading[activeTab];

  const NoDataMessage = () => {
    const messageKeyMap = {
        surroundings: 'noSurroundings',
        locations: 'noLocations',
        bestiary: 'noBestiary',
        quests: 'noQuests'
    }
    const messageKey = messageKeyMap[activeTab];
    return (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 p-8">
            <p>{t(messageKey as any)}</p>
        </div>
    )
  };

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
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-4xl h-[85vh] flex flex-col transition-transform duration-300 transform scale-95 animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-cyan-700 dark:text-cyan-400 font-cinzel">{t('infoPanelTitle')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 dark:hover:text-white text-3xl leading-none" aria-label={t('close')}>&times;</button>
        </header>

        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4">
            <div className="flex flex-grow bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 p-1 space-x-1">
                <TabButton infoType="surroundings" labelKey="surroundings" />
                <TabButton infoType="locations" labelKey="locations" />
                <TabButton infoType="bestiary" labelKey="bestiary" />
                <TabButton infoType="quests" labelKey="quests" />
            </div>
             <button
                onClick={() => onUpdate(activeTab)}
                disabled={isCurrentTabLoading}
                className="flex-shrink-0 flex items-center gap-2 text-sm bg-cyan-600/20 dark:bg-cyan-600/50 hover:bg-cyan-600/40 dark:hover:bg-cyan-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-cyan-800 dark:text-white font-bold py-2 px-4 rounded-md transition-colors"
                title={t('updateInfo')}
                >
                {isCurrentTabLoading ? <LoadingSpinner/> : t('update')}
            </button>
        </div>
        
        <main className="p-6 flex-grow overflow-y-auto bg-gray-50 dark:bg-black/20">
          {currentData.length === 0 && !isCurrentTabLoading ? <NoDataMessage /> : (
            <div className="space-y-6">
                {Object.entries(groupedData).sort(([a], [b]) => a.localeCompare(b)).map(([category, items]) => (
                    <div key={category}>
                        <h3 className="text-lg font-semibold text-cyan-800 dark:text-cyan-300 mb-3 pb-2 border-b-2 border-cyan-600/20 font-cinzel">{category}</h3>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {/* Cast `items` to its expected array type. TypeScript's inference for Object.entries can be imprecise, leading to `unknown` type. */}
                            {(items as (InfoItem | BestiaryEntry)[]).map(item => (
                                <li key={item.id}>
                                    <button 
                                        onClick={() => onItemClick(item, activeTab)}
                                        className="w-full text-left p-3 rounded-md bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors shadow-sm border border-gray-200 dark:border-gray-700"
                                    >
                                        <span className="text-gray-800 dark:text-gray-200">{item.name}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default InfoPanelModal;