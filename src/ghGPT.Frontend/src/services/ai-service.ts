import { api } from './api-client';

export interface OllamaSettings {
  baseUrl: string;
  model: string;
}

export interface OllamaStatus {
  online: boolean;
  baseUrl: string;
  model: string;
}

export interface OllamaModelInfo {
  name: string;
  size: number;
  modifiedAt: string;
}

export const aiService = {
  getStatus: () => api.get<OllamaStatus>('/ai/status'),
  getModels: () => api.get<OllamaModelInfo[]>('/ai/models'),
  saveSettings: (settings: OllamaSettings) => api.put<void>('/ai/settings', settings),
};
