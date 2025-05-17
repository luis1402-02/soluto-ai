import { simulateReadableStream } from 'ai';
import { MockLanguageModelV1 } from 'ai/test';

// Mock functions to simulate responses without external dependencies
function getSimpleChunks(prompt?: string, withReasoning = false) {
  let responseText = prompt?.includes('weather') 
    ? 'O clima está ensolarado hoje.' 
    : 'Resposta simulada para testes.';
  
  if (withReasoning) {
    responseText = `<thinking>Analisando a pergunta...</thinking>\n${responseText}`;
  }
  
  // Simple chunking for tests
  const chunks = [];
  if (responseText.length > 0) {
    chunks.push({ type: 'text-delta', textDelta: responseText });
  }
  chunks.push({
    type: 'finish',
    finishReason: 'stop',
    usage: { completionTokens: 10, promptTokens: 5 }
  });
  
  return chunks;
}

export const chatModel = new MockLanguageModelV1({
  doGenerate: async () => ({
    rawCall: { rawPrompt: null, rawSettings: {} },
    finishReason: 'stop',
    usage: { promptTokens: 10, completionTokens: 20 },
    text: `Resposta simulada para testes`,
  }),
  doStream: async ({ prompt }) => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 50,
      initialDelayInMs: 100,
      chunks: getSimpleChunks(prompt),
    }),
    rawCall: { rawPrompt: null, rawSettings: {} },
  }),
});

export const reasoningModel = new MockLanguageModelV1({
  doGenerate: async () => ({
    rawCall: { rawPrompt: null, rawSettings: {} },
    finishReason: 'stop',
    usage: { promptTokens: 10, completionTokens: 20 },
    text: `Resposta simulada para testes`,
  }),
  doStream: async ({ prompt }) => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 50,
      initialDelayInMs: 100,
      chunks: getSimpleChunks(prompt, true),
    }),
    rawCall: { rawPrompt: null, rawSettings: {} },
  }),
});

export const titleModel = new MockLanguageModelV1({
  doGenerate: async () => ({
    rawCall: { rawPrompt: null, rawSettings: {} },
    finishReason: 'stop',
    usage: { promptTokens: 10, completionTokens: 20 },
    text: `Título simulado para testes`,
  }),
  doStream: async () => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 50,
      initialDelayInMs: 100,
      chunks: [
        { type: 'text-delta', textDelta: 'Título simulado para testes' },
        {
          type: 'finish',
          finishReason: 'stop',
          usage: { completionTokens: 5, promptTokens: 3 },
        },
      ],
    }),
    rawCall: { rawPrompt: null, rawSettings: {} },
  }),
});

export const artifactModel = new MockLanguageModelV1({
  doGenerate: async () => ({
    rawCall: { rawPrompt: null, rawSettings: {} },
    finishReason: 'stop',
    usage: { promptTokens: 10, completionTokens: 20 },
    text: `Artefato simulado para testes`,
  }),
  doStream: async ({ prompt }) => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 50,
      initialDelayInMs: 100,
      chunks: getSimpleChunks(prompt),
    }),
    rawCall: { rawPrompt: null, rawSettings: {} },
  }),
});
