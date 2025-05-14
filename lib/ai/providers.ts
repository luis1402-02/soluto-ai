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
          'chat-model': openai('gpt-4.1-2025-04-14'),
          'chat-model-reasoning': wrapLanguageModel({
            model: openai('o4-mini-2025-04-16'),
            middleware: extractReasoningMiddleware({ tagName: 'think' }),
          }),
          'title-model': openai('gpt-4.1-mini-2025-04-14'),
          'artifact-model': openai('gpt-4.1-2025-04-14'),
        },
        imageModels: {
          'small-model': openai.image('gpt-image-1'),
        },
      });