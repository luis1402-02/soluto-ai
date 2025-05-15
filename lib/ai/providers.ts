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

// Middleware personalizado para induzir o modelo a mostrar seu raciocínio
const reasoningPromptMiddleware = () => {
  return (params) => {
    // Modifica as mensagens do sistema para solicitar raciocínio explícito
    const messages = params.messages.map(msg => {
      if (msg.role === 'system') {
        return {
          ...msg,
          content: `${msg.content}\n\nIMPORTANTE: Ao responder, SEMPRE primeiro pense passo a passo usando a seguinte estrutura:
          <thinking>
          [Seu raciocínio detalhado aqui, explorando todas as possibilidades e explicando seu processo de pensamento]
          </thinking>
          
          Depois, forneça sua resposta final. Este formato é obrigatório para TODAS as respostas.`
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
        // Modelo padrão - GPT-4o
        'chat-model': openai('gpt-4.1-2025-04-14'),
        
        // Modelo de raciocínio com middleware personalizado
        'chat-model-reasoning': wrapLanguageModel({
          model: openai('gpt-4.1-2025-04-14', {
            temperature: 0.2, // Temperatura baixa para raciocínio mais determinístico
          }),
          middleware: [
            // Primeiro, injeta a instrução para mostrar o raciocínio
            reasoningPromptMiddleware(),
            // Depois, extrai o raciocínio das tags
            extractReasoningMiddleware({ tagName: 'thinking' })
          ],
        }),
        
        // Modelos auxiliares
        'title-model': openai('gpt-4.1-mini-2025-04-14'),
        'artifact-model': openai('gpt-4.1-2025-04-14'),
      },
      
      imageModels: {
        'small-model': openai.image('gpt-image-1')
      },
    });