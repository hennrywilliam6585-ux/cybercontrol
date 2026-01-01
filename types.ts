
export interface AIVariation {
  type: string;
  title: string;
  body: string;
}

export interface AIResponse {
  variations: AIVariation[];
}

export interface NotificationConfig {
  title: string;
  body: string;
  icon: string;
  badge: string;
  tag: string;
  requireInteraction: boolean;
  silent: boolean;
  dir: 'auto' | 'ltr' | 'rtl';
}

export interface BroadcastMessage {
  companyName: string;
  logo: string;
  message: string;
  timestamp: number;
}

export enum Platform {
  WINDOWS = 'Windows',
  MACOS = 'macOS',
  BROWSER = 'Generic Browser'
}