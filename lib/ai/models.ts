export const DEFAULT_CHAT_MODEL: string = 'chat-model';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model',
    name: 'Chat normal',
    description: 'Modelo primário para todos os tipos de conversa',
  },
  {
    id: 'chat-model-reasoning',
    name: 'Chat com racíocinio',
    description: 'Usa racíocinio avançado para questões complexas',
  },
];
