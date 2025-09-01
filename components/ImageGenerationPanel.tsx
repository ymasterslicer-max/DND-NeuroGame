import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface ImageGenerationPanelProps {
  imageUrl: string | null;
  isLoading: boolean;
  error: string | null;
  onImageClick: () => void;
}

const ImageGenerationPanel: React.FC<ImageGenerationPanelProps> = ({ imageUrl, isLoading, error, onImageClick }) => {
  return (
    <aside className="w-80 flex-shrink-0 bg-gray-800/50 p-4 rounded-lg border border-gray-700 hidden lg:flex flex-col max-h-full">
      <h3 className="text-lg font-bold text-cyan-400 mb-4 border-b border-gray-600 pb-2 text-center">Визуализация сцены</h3>
      <div className="w-full aspect-square bg-gray-900/50 rounded-md flex items-center justify-center border border-gray-700 overflow-hidden relative group">
        {isLoading && (
          <div className="absolute inset-0 bg-gray-900/80 flex flex-col items-center justify-center text-cyan-300 z-10">
            <LoadingSpinner />
            <span className="mt-2 text-sm">Генерация...</span>
          </div>
        )}
        {error && !isLoading && <p className="text-red-400 text-center p-4">{error}</p>}
        {imageUrl && (
          <button
            onClick={onImageClick}
            className="w-full h-full focus:outline-none"
            title="Нажмите, чтобы увеличить"
          >
            <img src={imageUrl} alt="Визуализация игровой сцены" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white/80" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                  <path d="M5.5 4A2.5 2.5 0 003 6.5v6A2.5 2.5 0 005.5 15h9a2.5 2.5 0 002.5-2.5v-6A2.5 2.5 0 0014.5 4h-9zM8 8a.5.5 0 01.5.5v2a.5.5 0 01-1 0v-2A.5.5 0 018 8zm4 0a.5.5 0 01.5.5v2a.5.5 0 01-1 0v-2A.5.5 0 0112 8z" />
                  <path fillRule="evenodd" d="M9 17a1 1 0 100-2h2a1 1 0 100 2H9z" clipRule="evenodd" />
                </svg>
            </div>
          </button>
        )}
        {!isLoading && !error && !imageUrl && <p className="text-gray-500 text-center p-4">Здесь появится изображение текущей сцены.</p>}
      </div>
      <p className="text-xs text-gray-500 mt-2 text-center flex-grow flex items-end justify-center">
        Изображение генерируется автоматически после каждого хода.
      </p>
    </aside>
  );
};

export default ImageGenerationPanel;