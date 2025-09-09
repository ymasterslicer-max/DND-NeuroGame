
import type { Content } from '@google/genai';
import type { Language } from './i18n';

export enum GameDifficulty {
  Normal = 'Обычная',
  Hardcore = 'Хардкор',
}

export type GameEngineModel = 'gemini-2.5-flash' | 'gemini-2.5-pro';

export interface GameSettings {
  setting: string;
  description: string;
  difficulty: GameDifficulty;
  narrativeStyle: string;
  eventTimer: number;
  language: Language;
  gameEngineModel: GameEngineModel;
  learningTopic?: string;
}

export interface GameTurn {
  type: 'game' | 'player';
  content: string;
}

export interface InventoryItem {
  name: string;
  quantity: number;
}

export interface CharacterStatus {
  [key:string]: string | any; // Allow for inventory array
  inventory?: InventoryItem[];
  effects?: string[];
}

export interface Npc {
  name: string;
  description: string;
  portraitUrl: string | null;
  isGeneratingPortrait: boolean;
}

export interface InfoItem {
  id: string; // name slugified, e.g. "old_wooden_chest"
  name: string;
  category: string;
  description?: string;
}

export interface BestiaryEntry extends InfoItem {
    stats?: string;
}


export interface SaveState {
  gameHistory: GameTurn[];
  characterStatus: CharacterStatus | null;
  eventCounter: number;
  chatHistory: Content[];
  eventTimerSetting: number;
  language: Language;
  journal: string[];
  npcs: Npc[];
  gameSettings: GameSettings | null;
  surroundings: InfoItem[];
  locations: InfoItem[];
  bestiary: BestiaryEntry[];
  quests: InfoItem[];
  gameEngineModel: GameEngineModel;
  isSceneImageGenEnabled: boolean;
}

export type ImageModel = 'imagen-4.0-generate-001' | 'gemini-2.5-flash-image-preview' | 'none';

export type InfoType = 'surroundings' | 'locations' | 'bestiary' | 'quests';
