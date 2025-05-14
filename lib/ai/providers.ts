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
        'chat-model': openai('gpt-4.1'),
        'chat-model-reasoning': wrapLanguageModel({
          model: openai('gpt-4.1', {
            systemPrompt: "Primeiro, pense sobre a resposta usando tags <think></think>. Em seguida, forneça sua resposta final fora dessas tags.",
          }),
          middleware: extractReasoningMiddleware({
            tagName: 'think',
            startWithReasoning: false, // Mudamos para false para não forçar tudo como raciocínio
            separator: '\n\n', // Adicionar separação clara entre pensamento e resposta
          }),
        }),
        'title-model': openai('gpt-4.1-mini'),
        'artifact-model': openai('gpt-4.1'),
      },
      imageModels: {
        'small-model': openai.image('gpt-image-1'),
      },
    });