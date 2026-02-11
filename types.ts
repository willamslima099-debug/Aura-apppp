
export enum Emotion {
  NEUTRAL = 'neutral',
  HAPPY = 'happy',
  SAD = 'sad',
  CURIOUS = 'curious',
  CONCERNED = 'concerned',
  EXCITED = 'excited'
}

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  auraMoodScore: number; // 0 a 100
  lastInteraction: number;
  firstInteraction: number; // Timestamp do primeiro acesso
}

export interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'aura';
  text: string;
  timestamp: number;
  emotion?: Emotion;
}

export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
}
