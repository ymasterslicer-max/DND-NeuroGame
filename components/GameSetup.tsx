import React, { useState, useRef, useMemo } from 'react';
import type { GameSettings } from '../types';
import { GameDifficulty } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { generateEnhancedSetting, generateCharacter, summarizeSettingFromFile, generateRandomIdea } from '../services/geminiService';
import type { Language } from '../i18n';
import { styles } from '../styles';
import type { AuthorStyle } from '../styles';


interface GameSetupProps {
  onStartGame: (settings: GameSettings) => void;
  isLoading: boolean;
  onLoadGame: () => void;
  onLoadFromFile: (file: File) => void;
  hasSaveData: boolean;
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  t: (key: any) => string;
}

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-600 dark:text-cyan-400" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2l4.485 1.121a1 1 0 01.547 1.621l-3.238 3.524 1.183 4.876a1 1 0 01-1.447 1.057L12 16.798l-4.225 2.599a1 1 0 01-1.447-1.057l1.183-4.876-3.238-3.524a1 1 0 01.547-1.621L6.854 7.2 8.033 2.744A1 1 0 019 2h3z" clipRule="evenodd" />
    </svg>
);

const GameSetup: React.FC<GameSetupProps> = ({ 
  onStartGame, 
  isLoading, 
  onLoadGame, 
  onLoadFromFile, 
  hasSaveData,
  language,
  setLanguage,
  theme,
  setTheme,
  t 
}) => {
  const [setting, setSetting] = useState('Киберпанк-мегаполис под вечным дождем');
  const [description, setDescription] = useState('Бывший корпоративный детектив с кибернетической рукой, ищущий правду о своем прошлом.');
  const [difficulty, setDifficulty] = useState<GameDifficulty>(GameDifficulty.Normal);
  const [eventTimer, setEventTimer] = useState(3);
  
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [customStyle, setCustomStyle] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>(Object.keys(styles.ru)[0]);
  
  const [isEnhancingSetting, setIsEnhancingSetting] = useState(false);
  const [isGeneratingCharacter, setIsGeneratingCharacter] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const [isRandomizingSetting, setIsRandomizingSetting] = useState(false);
  const [isRandomizingDescription, setIsRandomizingDescription] = useState(false);

  const styleLibrary = useMemo(() => styles[language], [language]);

  const saveFileInputRef = useRef<HTMLInputElement>(null);
  const settingFileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalNarrativeStyle = '';
    if (customStyle.trim()) {
      finalNarrativeStyle = customStyle;
    } else if (selectedStyleId) {
      for (const genre of Object.values(styleLibrary)) {
        const found = genre.find((author: AuthorStyle) => author.id === selectedStyleId);
        if (found) {
          finalNarrativeStyle = found.prompt;
          break;
        }
      }
    }
    
    if (setting.trim() && description.trim()) {
      onStartGame({ setting, description, difficulty, narrativeStyle: finalNarrativeStyle, eventTimer, language });
    }
  };
  
  const handleStyleSelect = (author: AuthorStyle | null) => {
      setSelectedStyleId(author ? author.id : null);
      setCustomStyle('');
  };

  const handleCustomStyleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCustomStyle(e.target.value);
      setSelectedStyleId(null);
  }

  const handleEnhanceSetting = async () => {
    if (!setting.trim() || isEnhancingSetting) return;
    setIsEnhancingSetting(true);
    setGenerationError(null);
    try {
      const enhancedSetting = await generateEnhancedSetting(setting, language);
      setSetting(enhancedSetting);
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setIsEnhancingSetting(false);
    }
  };

  const handleGenerateCharacter = async () => {
    if (!setting.trim() || isGeneratingCharacter) return;
    setIsGeneratingCharacter(true);
    setGenerationError(null);
    try {
      const generatedCharacter = await generateCharacter(setting, language);
      setDescription(generatedCharacter);
    } catch (err)
 {
      setGenerationError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setIsGeneratingCharacter(false);
    }
  };

  const createRandomHandler = (
    type: 'setting' | 'description',
    setLoading: (loading: boolean) => void,
    setValue: (value: string) => void
  ) => async () => {
    setLoading(true);
    setGenerationError(null);
    try {
      const randomValue = await generateRandomIdea(type, language);
      setValue(randomValue);
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Unknown error during randomization');
    } finally {
      setLoading(false);
    }
  };

  const handleRandomSetting = createRandomHandler('setting', setIsRandomizingSetting, setSetting);
  const handleRandomDescription = createRandomHandler('description', setIsRandomizingDescription, setDescription);


  const handleSaveFileLoadClick = () => {
    saveFileInputRef.current?.click();
  };
  
  const handleSaveFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onLoadFromFile(event.target.files[0]);
      event.target.value = ''; 
    }
  };

  const handleSettingFileLoadClick = () => {
    settingFileInputRef.current?.click();
  };

  const handleSettingFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsSummarizing(true);
    setGenerationError(null);
    try {
      const text = await file.text();
      if (text.trim().length === 0) {
        throw new Error("Файл пуст.");
      }
      const summarizedSetting = await summarizeSettingFromFile(text, language);
      setSetting(summarizedSetting);
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Неизвестная ошибка при обработке файла.');
    } finally {
      setIsSummarizing(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const anyLoading = isLoading || isEnhancingSetting || isSummarizing || isGeneratingCharacter || isRandomizingSetting || isRandomizingDescription;


  return (
    <div className="w-full max-w-2xl mx-auto bg-gray-100/80 dark:bg-gray-800/50 p-6 md:p-8 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
       <input 
        type="file"
        ref={saveFileInputRef}
        onChange={handleSaveFileChange}
        className="hidden"
        accept="application/json,.json"
      />
      <input
        type="file"
        ref={settingFileInputRef}
        onChange={handleSettingFileChange}
        className="hidden"
        accept=".txt,text/plain"
      />

      <div className="flex justify-between items-center mb-6 -mt-2">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('language')}:</span>
          <div className="flex rounded-md shadow-sm">
            <button onClick={() => setLanguage('ru')} className={`px-3 py-1 text-sm rounded-l-md ${language === 'ru' ? 'bg-cyan-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>RU</button>
            <button onClick={() => setLanguage('en')} className={`px-3 py-1 text-sm rounded-r-md -ml-px ${language === 'en' ? 'bg-cyan-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>EN</button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('theme')}:</span>
           <div className="flex rounded-md shadow-sm">
            <button onClick={() => setTheme('light')} className={`px-3 py-1 text-sm rounded-l-md ${theme === 'light' ? 'bg-cyan-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>{t('light')}</button>
            <button onClick={() => setTheme('dark')} className={`px-3 py-1 text-sm rounded-r-md -ml-px ${theme === 'dark' ? 'bg-cyan-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>{t('dark')}</button>
          </div>
        </div>
      </div>


      <h2 className="text-2xl font-bold text-center text-cyan-700 dark:text-cyan-300 mb-6 font-cinzel">{t('createYourAdventure')}</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="setting" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('settingLabel')}
          </label>
          <div className="flex items-start gap-2">
            <textarea
              id="setting"
              value={setting}
              onChange={(e) => setSetting(e.target.value)}
              className="flex-grow w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
              placeholder={t('settingPlaceholder')}
              rows={4}
              required
              disabled={anyLoading}
            />
            <div className="flex flex-col gap-2">
                <button
                    type="button"
                    onClick={handleSettingFileLoadClick}
                    disabled={anyLoading}
                    className="flex-shrink-0 flex items-center justify-center p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-400 dark:disabled:bg-gray-800 disabled:cursor-not-allowed rounded-md transition-colors"
                    title={t('createSettingFromFile')}
                >
                  {isSummarizing ? <LoadingSpinner /> : (
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-600 dark:text-cyan-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                <button
                    type="button"
                    onClick={handleEnhanceSetting}
                    disabled={isEnhancingSetting || isLoading || !setting.trim() || isSummarizing}
                    className="flex-shrink-0 flex items-center justify-center p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-400 dark:disabled:bg-gray-800 disabled:cursor-not-allowed rounded-md transition-colors"
                    title={t('enhanceSettingAI')}
                >
                  {isEnhancingSetting ? <LoadingSpinner /> : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-600 dark:text-cyan-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                 <button
                    type="button"
                    onClick={handleRandomSetting}
                    disabled={anyLoading}
                    className="flex-shrink-0 flex items-center justify-center p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-400 dark:disabled:bg-gray-800 disabled:cursor-not-allowed rounded-md transition-colors"
                    title={t('randomizeTooltip')}
                >
                  {isRandomizingSetting ? <LoadingSpinner /> : <SparklesIcon />}
                </button>
            </div>
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('characterDescriptionLabel')}
            </label>
             <button
                type="button"
                onClick={handleGenerateCharacter}
                disabled={isGeneratingCharacter || isLoading || !setting.trim() || isSummarizing}
                className="flex items-center gap-2 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-400 dark:disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-gray-800 dark:text-white font-semibold py-1 px-3 rounded-md transition-colors"
              >
              {isGeneratingCharacter ? <LoadingSpinner/> : t('inventCharacter')}
            </button>
          </div>
          <div className="flex items-start gap-2">
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full flex-grow bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
              placeholder={t('characterDescriptionPlaceholder')}
              rows={4}
              required
              disabled={anyLoading}
            />
            <div className="flex flex-col gap-2">
              <button
                  type="button"
                  onClick={handleRandomDescription}
                  disabled={anyLoading}
                  className="flex-shrink-0 flex items-center justify-center p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-400 dark:disabled:bg-gray-800 disabled:cursor-not-allowed rounded-md transition-colors"
                  title={t('randomizeTooltip')}
              >
                {isRandomizingDescription ? <LoadingSpinner /> : <SparklesIcon />}
              </button>
            </div>
          </div>
        </div>
        
        {/* New Style Selection UI */}
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('styleSelectionTitle')}</label>
            <div className="bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-md p-3">
                <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-3 mb-3">
                    {Object.keys(styleLibrary).map(genre => (
                        <button
                            key={genre}
                            type="button"
                            onClick={() => setSelectedGenre(genre)}
                            disabled={anyLoading}
                            className={`px-3 py-1 text-sm rounded-md transition-colors disabled:opacity-50 ${selectedGenre === genre ? 'bg-cyan-600 text-white font-semibold' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                        >
                            {genre}
                        </button>
                    ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                     <button
                        type="button"
                        onClick={() => handleStyleSelect(null)}
                        disabled={anyLoading}
                        title={t('noneStyleTooltip')}
                        className={`w-full text-left p-2 rounded-md border-2 transition-colors ${!selectedStyleId && !customStyle.trim() ? 'border-cyan-500 bg-cyan-500/10' : 'border-transparent bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    >
                       <span className="font-semibold text-gray-800 dark:text-gray-200">{t('none')}</span>
                    </button>
                    {styleLibrary[selectedGenre]?.map((authorStyle: AuthorStyle) => (
                        <button
                            key={authorStyle.id}
                            type="button"
                            onClick={() => handleStyleSelect(authorStyle)}
                            disabled={anyLoading}
                            title={authorStyle.tooltip}
                            className={`w-full text-left p-2 rounded-md border-2 transition-colors ${selectedStyleId === authorStyle.id ? 'border-cyan-500 bg-cyan-500/10' : 'border-transparent bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                        >
                            <span className="font-semibold text-gray-800 dark:text-gray-200">{authorStyle.author}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>

        <div>
            <label htmlFor="custom-style" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('customStyleLabel')}</label>
            <textarea
                id="custom-style"
                value={customStyle}
                onChange={handleCustomStyleChange}
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
                placeholder={t('customStylePlaceholder')}
                rows={3}
                disabled={anyLoading}
            />
        </div>
        
        <div>
          <label htmlFor="event-timer" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('turnsUntilRandomEvent')}
          </label>
          <input
            id="event-timer"
            type="number"
            value={eventTimer}
            onChange={(e) => setEventTimer(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
            min="1"
            required
            disabled={anyLoading}
          />
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('difficulty')}</span>
          <div className="flex space-x-4">
            {(Object.keys(GameDifficulty) as Array<keyof typeof GameDifficulty>).map((key) => (
              <label key={key} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="difficulty"
                  value={GameDifficulty[key]}
                  checked={difficulty === GameDifficulty[key]}
                  onChange={() => setDifficulty(GameDifficulty[key])}
                  className="form-radio h-4 w-4 text-cyan-600 bg-gray-200 dark:bg-gray-700 border-gray-400 dark:border-gray-600 focus:ring-cyan-500 dark:focus:ring-cyan-600"
                  disabled={anyLoading}
                />
                <span className="text-gray-700 dark:text-gray-300">{t(key as any)}</span>
              </label>
            ))}
          </div>
        </div>
        
        {generationError && (
          <div className="text-sm text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 p-3 rounded-md">
              <strong>{t('error')}:</strong> {generationError}
          </div>
        )}

        <div className="pt-2 space-y-4">
          <button
            type="submit"
            disabled={anyLoading}
            className="w-full flex justify-center items-center bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-md transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-cyan-500/50"
          >
            {isLoading ? <LoadingSpinner /> : t('startAdventure')}
          </button>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={onLoadGame}
              disabled={!hasSaveData || anyLoading}
              className="w-full flex justify-center items-center bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-gray-500/50"
            >
              {t('loadGame')}
            </button>
             <button
              type="button"
              onClick={handleSaveFileLoadClick}
              disabled={anyLoading}
              className="w-full flex justify-center items-center bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-gray-500/50"
            >
              {t('loadFromFile')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default GameSetup;