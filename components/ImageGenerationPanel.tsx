import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
import type { Npc } from '../types';

interface ImageGenerationPanelProps {
  imageUrl: string | null;
  isGenerating: boolean;
  isGameLoading: boolean;
  error: string | null;
  onImageClick: () => void;
  onSaveGame: () => void;
  onDownloadSave: () => void;
  saveMessage: string;
  onContactGM: () => void;
  npcs: Npc[];
  mapImageUrl: string | null;
  isGeneratingMap: boolean;
  t: (key: any) => string;
}

const ImageGenerationPanel: React.FC<ImageGenerationPanelProps> = ({ 
  imageUrl, 
  isGenerating, 
  isGameLoading,
  error, 
  onImageClick,
  onSaveGame,
  onDownloadSave,
  saveMessage,
  onContactGM,
  npcs,
  mapImageUrl,
  isGeneratingMap,
  t 
}) => {
  const [activeTab, setActiveTab] = useState<'scene' | 'npcs' | 'map'>('scene');

  const TabButton: React.FC<{ tabId: 'scene' | 'npcs' | 'map'; children: React.ReactNode }> = ({ tabId, children }) => (
    <button
      onClick={() => setActiveTab(tabId)}
      className={`flex-1 py-2 px-2 text-sm font-medium transition-colors ${
        activeTab === tabId
          ? 'bg-cyan-600/20 dark:bg-cyan-500/30 text-cyan-700 dark:text-cyan-300'
          : 'text-gray-500 hover:bg-gray-200/50 dark:text-gray-400 dark:hover:bg-gray-700/50'
      }`}
    >
      {children}
    </button>
  );
  
  return (
    <aside className="w-80 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hidden lg:flex flex-col max-h-full transition-colors duration-300">
      <div className="flex w-full bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 mb-4">
          <TabButton tabId="scene">{t('scene')}</TabButton>
          <div className="w-px bg-gray-200 dark:bg-gray-700"></div>
          <TabButton tabId="npcs">{t('npcs')}</TabButton>
          <div className="w-px bg-gray-200 dark:bg-gray-700"></div>
          <TabButton tabId="map">{t('map')}</TabButton>
      </div>

      <div className="flex-grow overflow-y-auto">
        {activeTab === 'scene' && (
          <div className="w-full aspect-square bg-gray-100 dark:bg-gray-900/50 rounded-md flex items-center justify-center border border-gray-200 dark:border-gray-700 overflow-hidden relative group">
            {isGenerating && (
              <div className="absolute inset-0 bg-gray-100/80 dark:bg-gray-900/80 flex flex-col items-center justify-center text-cyan-600 dark:text-cyan-300 z-10">
                <LoadingSpinner />
                <span className="mt-2 text-sm">{t('generating')}</span>
              </div>
            )}
            {error && !isGenerating && <p className="text-red-500 dark:text-red-400 text-center p-4">{error}</p>}
            {imageUrl && (
              <button
                onClick={onImageClick}
                className="w-full h-full focus:outline-none"
                title={t('clickToEnlarge')}
              >
                <img src={imageUrl} alt={t('sceneVisualization')} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white/80" viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" /><path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                </div>
              </button>
            )}
            {!isGenerating && !error && !imageUrl && <p className="text-gray-400 dark:text-gray-500 text-center p-4">{t('imageWillAppearHere')}</p>}
          </div>
        )}
        {activeTab === 'npcs' && (
          <div className="grid grid-cols-2 gap-2">
            {npcs.length === 0 && <p className="text-gray-400 dark:text-gray-500 text-center p-4 col-span-2">{t('noNpcsMet')}</p>}
            {npcs.map(npc => (
              <div key={npc.name} className="relative aspect-square bg-gray-100 dark:bg-gray-900/50 rounded-md flex items-center justify-center border border-gray-200 dark:border-gray-700 overflow-hidden group">
                {npc.isGeneratingPortrait && <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-10"><LoadingSpinner/></div>}
                {npc.portraitUrl ? (
                   <img src={npc.portraitUrl} alt={npc.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-gray-400 dark:text-gray-500 p-1 text-center text-sm">{npc.isGeneratingPortrait ? '' : t('noPortrait')}</div>
                )}
                 <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs text-center p-1 truncate group-hover:whitespace-normal group-hover:text-clip">{npc.name}</div>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'map' && (
          <div className="w-full aspect-square bg-gray-100 dark:bg-gray-900/50 rounded-md flex items-center justify-center border border-gray-200 dark:border-gray-700 overflow-hidden relative group">
            {isGeneratingMap && <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-10"><LoadingSpinner/></div>}
            {mapImageUrl && (
               <button onClick={onImageClick} className="w-full h-full focus:outline-none" title={t('clickToEnlarge')}>
                <img src={mapImageUrl} alt={t('worldMap')} className="w-full h-full object-cover" />
               </button>
            )}
             {!isGeneratingMap && !mapImageUrl && <p className="text-gray-400 dark:text-gray-500 text-center p-4">{t('mapWillAppearHere')}</p>}
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 space-y-3">
        {saveMessage && (
            <div className="bg-green-600/90 text-white text-sm py-1.5 px-3 rounded-md z-10 text-center animate-pulse">
                {saveMessage}
            </div>
        )}
        <div className="flex rounded-md shadow-sm w-full">
            <button
              type="button"
              onClick={onSaveGame}
              disabled={isGameLoading}
              className="relative inline-flex items-center justify-center w-full px-4 py-2 rounded-l-md border border-cyan-700 dark:border-gray-600 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-500 dark:disabled:bg-gray-600 text-sm font-medium text-white focus:z-10 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
              title={t('saveGame')}
            >
              {t('saveGame')}
            </button>
            <button
              type="button"
              onClick={onDownloadSave}
              disabled={isGameLoading}
              className="-ml-px relative inline-flex items-center px-3 py-2 rounded-r-md border border-cyan-700 dark:border-gray-600 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-500 dark:disabled:bg-gray-600 text-sm font-medium text-white focus:z-10 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
              title={t('downloadSave')}
            >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
        </div>
        <button
            type="button"
            onClick={onContactGM}
            disabled={isGameLoading}
            className="w-full flex justify-center items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 dark:disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition-colors"
            title={t('contactGMTitle')}
          >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                  <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h1a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
              </svg>
              <span>{t('contactGM')}</span>
        </button>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
        {t('imageGeneratedAutomatically')}
      </p>
    </aside>
  );
};

export default ImageGenerationPanel;
