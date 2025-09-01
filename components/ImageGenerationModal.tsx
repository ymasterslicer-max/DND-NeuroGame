import React, { useState, useEffect } from 'react';
import { generateImage } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';

interface ImageGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ImageGenerationModal: React.FC<ImageGenerationModalProps> = ({ isOpen, onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal is closed to ensure a clean slate
      setTimeout(() => {
        setPrompt('');
        setImage(null);
        setIsLoading(false);
        setError(null);
      }, 300); // Delay to allow for closing animation
    }
  }, [isOpen]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setImage(null);
    try {
      const imageUrl = await generateImage(prompt);
      setImage(imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла неизвестная ошибка.');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity duration-300" 
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-2xl border border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col transition-transform duration-300 transform scale-95" 
        onClick={e => e.stopPropagation()}
        style={{ transform: isOpen ? 'scale(1)' : 'scale(0.95)' }} // Simple animation
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-cyan-400">Визуализировать сцену</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
        </header>
        
        <main className="p-4 flex-grow overflow-y-auto">
          <div className="w-full aspect-square bg-gray-900/50 rounded-md mb-4 flex items-center justify-center border border-gray-700 overflow-hidden">
            {isLoading && (
              <div className="flex flex-col items-center text-cyan-300">
                <LoadingSpinner />
                <span className="mt-2 text-sm">Генерация...</span>
              </div>
            )}
            {error && <p className="text-red-400 text-center p-4">{error}</p>}
            {image && <img src={image} alt="Сгенерированное изображение" className="w-full h-full object-contain" />}
            {!isLoading && !error && !image && <p className="text-gray-500">Здесь появится ваше изображение.</p>}
          </div>
        </main>

        <footer className="p-4 border-t border-gray-700 flex-shrink-0">
          <form onSubmit={handleSubmit}>
            <label htmlFor="image-prompt" className="block text-sm font-medium text-gray-300 mb-2">
              Что вы хотите увидеть?
            </label>
            <textarea
              id="image-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-md py-2 px-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
              rows={3}
              disabled={isLoading}
              placeholder="Например: Одинокий киборг смотрит на неоновый город под проливным дождем..."
            />
            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="w-full mt-4 flex justify-center items-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-md transition-colors"
            >
              {isLoading ? <><LoadingSpinner /> <span>Создание...</span></> : 'Сгенерировать'}
            </button>
          </form>
        </footer>
      </div>
    </div>
  );
};

export default ImageGenerationModal;