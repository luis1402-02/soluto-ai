import { customProvider, extractReasoningMiddleware, wrapLanguageModel } from 'ai';
import { openai } from '@ai-sdk/openai';
import { isTestEnvironment } from '../constants';
import * as mockModelsImport from './models.test';

// Modelos mock embutidos para não depender de models.test em produção
const mockModels = {
  chatModel: {
    doGenerate: async () => ({
      rawCall: { rawPrompt: null, rawSettings: {} },
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 20 },
      text: `Resposta simulada para testes`,
    }),
    doStream: async () => ({
      stream: { getReader: () => ({ read: async () => ({ done: true }) }) },
      rawCall: { rawPrompt: null, rawSettings: {} },
    }),
  },
  reasoningModel: {
    doGenerate: async () => ({
      rawCall: { rawPrompt: null, rawSettings: {} },
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 20 },
      text: `Resposta simulada para testes`,
    }),
    doStream: async () => ({
      stream: { getReader: () => ({ read: async () => ({ done: true }) }) },
      rawCall: { rawPrompt: null, rawSettings: {} },
    }),
  },
  titleModel: {
    doGenerate: async () => ({
      rawCall: { rawPrompt: null, rawSettings: {} },
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 20 },
      text: `Título simulado para testes`,
    }),
    doStream: async () => ({
      stream: { getReader: () => ({ read: async () => ({ done: true }) }) },
      rawCall: { rawPrompt: null, rawSettings: {} },
    }),
  },
  artifactModel: {
    doGenerate: async () => ({
      rawCall: { rawPrompt: null, rawSettings: {} },
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 20 },
      text: `Artefato simulado para testes`,
    }),
    doStream: async () => ({
      stream: { getReader: () => ({ read: async () => ({ done: true }) }) },
      rawCall: { rawPrompt: null, rawSettings: {} },
    }),
  }
};

// Configuração simplificada para máxima compatibilidade
export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': mockModelsImport.chatModel,
        'chat-model-reasoning': mockModelsImport.reasoningModel,
        'title-model': mockModelsImport.titleModel,
        'artifact-model': mockModelsImport.artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        // Modelo principal
        'chat-model': openai('gpt-4.1-2025-04-14'),
        
        // Modelo de raciocínio usando middleware para extração de markup <thinking>
        // Agora apenas para compatibilidade com o modo simples
        // A orquestração do modo avançado acontece diretamente na rota
        'chat-model-reasoning': wrapLanguageModel({
          model: openai('gpt-4.1-2025-04-14'),
          middleware: extractReasoningMiddleware({ 
            tagName: 'thinking',
          })
        }),
        
        // Modelos auxiliares
        'title-model': openai('gpt-4.1-mini-2025-04-14'),
        'artifact-model': openai('gpt-4.1-2025-04-14'),
      },
      
      // Modelo de imagem
      imageModels: {
        'small-model': openai.image('gpt-image-1'),
      },
    });