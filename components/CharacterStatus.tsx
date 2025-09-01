import React, { useRef } from 'react';
import type { CharacterStatus as CharacterStatusType } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface CharacterStatusProps {
  status: CharacterStatusType | null;
  avatarUrl: string | null;
  onAvatarChange: (file: File) => void;
  onUpdate: () => void;
  isLoading: boolean;
  onRestart: () => void;
  t: (key: any) => string;
}

const CharacterStatus: React.FC<CharacterStatusProps> = ({ status, avatarUrl, onAvatarChange, onUpdate, isLoading, onRestart, t }) => {
  const generalStatusEntries = status ? Object.entries(status).filter(([key]) => key !== 'inventory') : [];
  const inventory = status?.inventory ?? [];
  const hasStatus = generalStatusEntries.length > 0;
  const hasInventory = inventory.length > 0;
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onAvatarChange(event.target.files[0]);
    }
  };

  return (
    <aside className="w-80 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hidden lg:flex flex-col max-h-full transition-colors duration-300">
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
      <div 
        className="w-40 h-40 mx-auto mb-4 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center border-2 border-gray-300 dark:border-gray-600 relative group cursor-pointer overflow-hidden"
        onClick={handleAvatarClick}
        title={t('uploadAvatar')}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="Character Avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="text-gray-500 dark:text-gray-400 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm mt-1">{t('avatar')}</span>
          </div>
        )}
         <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-white font-bold">{t('upload')}</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between mb-4 border-b border-gray-200 dark:border-gray-600 pb-2">
        <h3 className="text-lg font-bold text-cyan-700 dark:text-cyan-400 font-cinzel">{t('status')}</h3>
        <button 
          onClick={onUpdate} 
          disabled={isLoading}
          className="flex items-center gap-2 text-sm bg-cyan-600/20 dark:bg-cyan-600/50 hover:bg-cyan-600/40 dark:hover:bg-cyan-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-cyan-800 dark:text-white font-bold py-1 px-3 rounded-md transition-colors"
          title={t('update')}
        >
          {isLoading ? <LoadingSpinner/> : t('update')}
        </button>
      </div>
      
      <div className="overflow-y-auto">
        {!hasStatus && !hasInventory ? (
          <div className="flex-grow flex items-center justify-center h-full pt-8">
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center">{t('statusUpdatePrompt')}</p>
          </div>
        ) : (
          <>
            {hasStatus && (
              <dl className="space-y-2 text-sm">
                {generalStatusEntries.map(([key, value]) => (
                  <div key={key} className="flex justify-between items-start gap-4">
                    <dt className="font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">{key}:</dt>
                    <dd className="text-gray-800 dark:text-gray-200 text-right break-words">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            )}

            {hasInventory && (
              <>
                <h4 className="text-md font-bold text-cyan-700 dark:text-cyan-400 mt-6 mb-2 border-t border-gray-200 dark:border-gray-600 pt-3 font-cinzel">{t('inventory')}</h4>
                <ul className="space-y-1 text-sm">
                  {inventory.map((item, index) => (
                    <li key={index} className="flex justify-between items-center gap-2 p-2 rounded-md hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors">
                      <span className="text-gray-700 dark:text-gray-300 break-words">{item.name}</span>
                      <span className="text-gray-500 dark:text-gray-400 font-mono bg-gray-200 dark:bg-gray-900 px-2 py-0.5 rounded text-xs flex-shrink-0">x{item.quantity}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
       <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-600">
          <button
              onClick={onRestart}
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 bg-red-600/10 hover:bg-red-600/20 text-red-700 dark:text-red-400 font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              {t('restart')}
          </button>
      </div>
    </aside>
  );
};

export default CharacterStatus;