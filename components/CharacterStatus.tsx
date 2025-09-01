import React, { useRef } from 'react';
import type { CharacterStatus as CharacterStatusType } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface CharacterStatusProps {
  status: CharacterStatusType | null;
  avatarUrl: string | null;
  onAvatarChange: (file: File) => void;
  onUpdate: () => void;
  isLoading: boolean;
}

const CharacterStatus: React.FC<CharacterStatusProps> = ({ status, avatarUrl, onAvatarChange, onUpdate, isLoading }) => {
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
    <aside className="w-80 flex-shrink-0 bg-gray-800/50 p-4 rounded-lg border border-gray-700 hidden lg:flex flex-col max-h-full">
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
      <div 
        className="w-40 h-40 mx-auto mb-4 bg-gray-700 rounded-lg flex items-center justify-center border-2 border-gray-600 relative group cursor-pointer overflow-hidden"
        onClick={handleAvatarClick}
        title="Загрузить аватар"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="Character Avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="text-gray-500 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm mt-1">Аватар</span>
          </div>
        )}
         <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-white font-bold">Загрузить</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between mb-4 border-b border-gray-600 pb-2">
        <h3 className="text-lg font-bold text-cyan-400">Статус</h3>
        <button 
          onClick={onUpdate} 
          disabled={isLoading}
          className="flex items-center gap-2 text-sm bg-cyan-600/50 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-1 px-3 rounded-md transition-colors"
          title="Обновить статус и инвентарь"
        >
          {isLoading ? <LoadingSpinner/> : 'Обновить'}
        </button>
      </div>
      
      <div className="overflow-y-auto">
        {!hasStatus && !hasInventory ? (
          <div className="flex-grow flex items-center justify-center h-full pt-8">
            <p className="text-gray-400 text-sm text-center">Нажмите "Обновить" или введите "статус", чтобы увидеть информацию.</p>
          </div>
        ) : (
          <>
            {hasStatus && (
              <dl className="space-y-2 text-sm">
                {generalStatusEntries.map(([key, value]) => (
                  <div key={key} className="flex justify-between items-start gap-4">
                    <dt className="font-semibold text-gray-400 whitespace-nowrap">{key}:</dt>
                    <dd className="text-gray-200 text-right break-words">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            )}

            {hasInventory && (
              <>
                <h4 className="text-md font-bold text-cyan-400 mt-6 mb-2 border-t border-gray-600 pt-3">Инвентарь</h4>
                <ul className="space-y-1 text-sm">
                  {inventory.map((item, index) => (
                    <li key={index} className="flex justify-between items-center gap-2 p-2 rounded-md hover:bg-gray-700/50 transition-colors">
                      <span className="text-gray-300 break-words">{item.name}</span>
                      <span className="text-gray-400 font-mono bg-gray-900 px-2 py-0.5 rounded text-xs flex-shrink-0">x{item.quantity}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </aside>
  );
};

export default CharacterStatus;