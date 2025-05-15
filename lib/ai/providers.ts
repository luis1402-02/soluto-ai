import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { openai } from '@ai-sdk/openai';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

// Middleware personalizado para forçar o modelo a mostrar seu raciocínio
const forceReasoningMiddleware = () => {
  return (params) => {
    // Encontra e modifica a mensagem do sistema para incluir instruções de raciocínio
    const messages = params.messages.map(msg => {
      if (msg.role === 'system') {
        return {
          ...msg,
          content: `${msg.content}\n\nIMPORTANTE: Antes de responder qualquer pergunta, pense passo a passo através do problema e mostre seu raciocínio detalhado usando a tag <thinking>. Analise cuidadosamente a questão, considere diferentes abordagens, e avalie as possíveis soluções. Após seu raciocínio completo, então forneça sua resposta final.</thinking>`
        };
      }
      return msg;
    });
    
    return {
      ...params,
      messages
    };
  };
};

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
        // Modelo padrão de chat - GPT-4.1
        'chat-model': openai('gpt-4.1-2025-04-14'),
        
        // Modelo com raciocínio - GPT-4.1 com middleware para extrair raciocínio
        'chat-model-reasoning': wrapLanguageModel({
          model: openai('gpt-4.1-2025-04-14', {
            temperature: 0.2, // Temperatura baixa para respostas mais consistentes
          }),
          middleware: [
            // Primeiro, injetamos as instruções para exibir o raciocínio
            forceReasoningMiddleware(),
            // Depois, extraímos o raciocínio das tags <thinking>
            extractReasoningMiddleware({ tagName: 'thinking' })
          ]
        }),
        
        // Modelos para tarefas auxiliares - usando o mini para eficiência
        'title-model': openai('gpt-4.1-mini-2025-04-14'),
        'artifact-model': openai('gpt-4.1-mini-2025-04-14'),
      },
      
      // Modelo para geração de imagens
      imageModels: {
        'small-model': openai.image('gpt-image-1'),
      },
    });