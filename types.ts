export enum AppView {
  DASHBOARD = 'DASHBOARD',
  VIBRATION = 'VIBRATION',
  LIVE_MONITOR = 'LIVE_MONITOR',
  CHAT_ASSISTANT = 'CHAT_ASSISTANT'
}

export enum Severity {
  NORMAL = 'Normal',
  PREWARNING = 'Prewarning',
  WARNING = 'Warning',
  ALARM = 'Alarm'
}

export interface VibrationDataPoint {
  time: number;
  amplitude: number;
}

export interface AnalysisResult {
  faults: string[];
  severity: Severity;
  recommendations: string[];
  rawAnalysis: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}