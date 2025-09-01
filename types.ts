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
  [key: string]: string | any; // Allow for inventory array
  inventory?: InventoryItem[];
}

export interface SaveState {
  gameHistory: GameTurn[];
  characterStatus: CharacterStatus | null;
  avatarUrl: string | null;
  eventCounter: number;
  chatHistory: Content[];
  eventTimerSetting: number;
  language: Language;
}