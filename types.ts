
import type { Content } from '@google/genai';
import type { Language } from './i18n';

export enum GameDifficulty {
  Normal = 'Обычная',
  Hardcore = 'Хардкор',
}

export interface GameSettings {
  setting: string;
  description: string;
  difficulty: GameDifficulty;
  narrativeStyle: string;
  eventTimer: number;
  language: Language;
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
}

export type ImageModel = 'imagen-4.0-generate-001' | 'gemini-2.5-flash-image-preview' | 'none';