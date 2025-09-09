
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
  onShowInfoPanel: () => void;
  imageGenerationModel: ImageModel;
  setImageGenerationModel: (model: ImageModel) => void;
  isSceneImageGenEnabled: boolean;
  setIsSceneImageGenEnabled: (enabled: boolean) => void;
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
  onShowInfoPanel,
  imageGenerationModel,
  setImageGenerationModel,
  isSceneImageGenEnabled,
  setIsSceneImageGenEnabled,
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
      <div className="mb-4">
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
      
      <div className="flex w-full bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 mb-4">
          <TabButton tabId="scene">{t('scene')}</TabButton>
          <div className="w-px bg-gray-200 dark:bg-gray-700"></div>
          <TabButton tabId="npcs">{t('npcs')}</TabButton>
      </div>

      <div className="flex-grow overflow-y-auto min-h-0">
        {activeTab === 'scene' && (
          <div className="space-y-3">
             <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-900/50 p-2 rounded-md">
                <label htmlFor="scene-gen-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('sceneImageGeneration')}
                </label>
                <button
                    id="scene-gen-toggle"
                    onClick={() => setIsSceneImageGenEnabled(!isSceneImageGenEnabled)}
                    disabled={isGameLoading}
                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 dark:focus:ring-offset-gray-800 disabled:cursor-not-allowed disabled:opacity-50 ${isSceneImageGenEnabled ? 'bg-cyan-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isSceneImageGenEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
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
            onClick={onShowInfoPanel}
            disabled={isGameLoading}
            className="w-full flex justify-center items-center gap-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-400 dark:disabled:bg-gray-800 disabled:cursor-not-allowed text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-md transition-colors"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>{t('info')}</span>
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
