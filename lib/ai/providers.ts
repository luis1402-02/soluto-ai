import { customProvider, extractReasoningMiddleware, wrapLanguageModel } from 'ai';
import { openai } from '@ai-sdk/openai';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

// Configuração simplificada para máxima compatibilidade
export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
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