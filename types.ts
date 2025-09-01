import type { Content } from '@google/genai';

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
  // FIX: Corrected typo from CharacterStatusType to CharacterStatus.
  characterStatus: CharacterStatus | null;
  avatarUrl: string | null;
  eventCounter: number;
  chatHistory: Content[];
  eventTimerSetting: number;
}