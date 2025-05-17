export const DEFAULT_CHAT_MODEL: string = 'chat-model';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model',
    name: 'Chat Simples',
    description: 'Resposta direta e rápida com um único agente',
  },
  {
    id: 'chat-model-reasoning',
    name: 'Chat Avançado (Raciocínio Coletivo)',
    description: 'Múltiplos agentes especializados colaborando para questões complexas',
  },
];