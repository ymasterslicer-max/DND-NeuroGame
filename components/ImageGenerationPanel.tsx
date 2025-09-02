
import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
import type { Npc, ImageModel } from '../types';

interface ImageGenerationPanelProps {
  imageUrl: string | null;
  isGenerating: boolean;
  isGameLoading: boolean;
  error: string | null;
  onImageClick: (url: string | null) => void;
  onSaveGame: () => void;
  onDownloadSave: () => void;
  saveMessage: string;
  onContactGM: () => void;
  npcs: Npc[];
  onNpcClick: (npc: Npc) => void;
  onShowAsciiMap: () => void;
  imageGenerationModel: ImageModel;
  setImageGenerationModel: (model: ImageModel) => void;
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
  onNpcClick,
  onShowAsciiMap,
  imageGenerationModel,
  setImageGenerationModel,
  t 
}) => {
  const [activeTab, setActiveTab] = useState<'scene' | 'npcs'>('scene');

  const TabButton: React.FC<{ tabId: 'scene' | 'npcs'; children: React.ReactNode }> = ({ tabId, children }) => (
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
      </div>

      <div className="flex-grow overflow-y-auto min-h-0">
        {activeTab === 'scene' && (
          <div className="space-y-3">
            <div>
                <label htmlFor="image-model-select" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('imageModelLabel')}
                </label>
                <select
                    id="image-model-select"
                    value={imageGenerationModel}
                    onChange={(e) => setImageGenerationModel(e.target.value as ImageModel)}
                    disabled={isGenerating || isGameLoading}
                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md py-1.5 px-2 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                >
                    <option value="imagen-4.0-generate-001">{t('imagen4')}</option>
                    <option value="gemini-2.5-flash-image-preview">{t('geminiFlashImage')}</option>
                    <option value="none">{t('imageModelNone')}</option>
                </select>
            </div>
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
                  onClick={() => onImageClick(imageUrl)}
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
          </div>
        )}
        {activeTab === 'npcs' && (
          <div className="grid grid-cols-2 gap-2">
            {npcs.length === 0 && <p className="text-gray-400 dark:text-gray-500 text-center p-4 col-span-2">{t('noNpcsMet')}</p>}
            {npcs.map(npc => (
              <button key={npc.name} onClick={() => onNpcClick(npc)} className="relative aspect-square bg-gray-100 dark:bg-gray-900/50 rounded-md flex items-center justify-center border border-gray-200 dark:border-gray-700 overflow-hidden group focus:outline-none focus:ring-2 focus:ring-cyan-500">
                {npc.isGeneratingPortrait && <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-10"><LoadingSpinner/></div>}
                {npc.portraitUrl ? (
                   <img src={npc.portraitUrl} alt={npc.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-gray-400 dark:text-gray-500 p-1 text-center text-sm">{npc.isGeneratingPortrait ? '' : t('noPortrait')}</div>
                )}
                 <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs text-center p-1 truncate group-hover:whitespace-normal group-hover:text-clip">{npc.name}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 space-y-3">
        {saveMessage && (
            <div className="bg-green-600/90 text-white text-sm py-1.5 px-3 rounded-md z-10 text-center animate-pulse">
                {saveMessage}
            </div>
        )}
        <button
            type="button"
            onClick={onShowAsciiMap}
            disabled={isGameLoading}
            className="w-full flex justify-center items-center gap-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-400 dark:disabled:bg-gray-800 disabled:cursor-not-allowed text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-md transition-colors"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.527-2.119l.002.002c.07.07.158.14.24.206.082.065.17.12.25.167.08.046.162.08.24.102l.002.001c.08.02.16.03.24.032l.002.001c.08.004.16.004.24.002l.002-.001a1 1 0 01.992.992l-.001.002c-.002.08-.002.16-.004.24l-.001.002c-.002.08-.012.16-.032.24l-.001.002c-.022.08-.056.16-.102.24a5.04 5.04 0 01-.167.25c-.066.08-.13.168-.206.24l-.002.002a6.012 6.012 0 01-2.119 1.527c.23.68.64 1.28 1.14 1.78l.002.002c.07.07.158.14.24.206.082.065.17.12.25.167.08.046.162.08.24.102l.002.001c.08.02.16.03.24.032l.002.001c.08.004.16.004.24.002l.002-.001a1 1 0 11-.004 2.004l-.002-.001c-.08-.002-.16-.002-.24-.004l-.002-.001c-.08-.002-.16-.012-.24-.032l-.002-.001c-.08-.022-.16-.056-.24-.102a5.04 5.04 0 01-.25-.167c-.08-.066-.168-.13-.24-.206l-.002-.002a6.012 6.012 0 01-1.78-1.14c-.68.23-1.28.64-1.78 1.14l-.002.002c-.07.07-.14.158-.206.24-.065.082-.12.17-.167.25-.046.08-.08.162-.102.24l-.001.002c-.02.08-.03.16-.032.24l-.001.002c-.004.08-.004.16-.002.24l.001.002a1 1 0 11-2.004-.004l.001-.002c.002-.08.002-.16.004-.24l.001-.002c.002-.08.012-.16.032-.24l.001-.002c.022-.08.056-.16.102-.24.047-.08.102-.167.167-.25.065-.082.13-.158.206-.24l.002-.002a6.012 6.012 0 011.14-1.78c-.23-.68-.64-1.28-1.14-1.78l-.002-.002a5.04 5.04 0 01-.206-.24c-.082-.065-.17-.12-.25-.167-.046-.08-.08-.162-.102-.24l-.002-.001c-.02-.08-.03-.16-.032-.24l-.002-.001c-.004-.08-.004-.16-.002-.24l.001-.002a1 1 0 011.992-.004l.001.002zM10 6a4 4 0 100 8 4 4 0 000-8z" clipRule="evenodd" />
                <path d="M10 11a1 1 0 100-2 1 1 0 000 2z" />
            </svg>
            <span>{t('showAsciiMap')}</span>
        </button>

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