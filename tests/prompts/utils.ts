/**
 * Utilitários para simulação de respostas em testes
 */

import { ChunkData } from 'ai';

/**
 * Retorna um array de chunks simulados para testes baseado no prompt
 * Se withReasoning for true, inclui seção de thinking para teste do modelo de raciocínio
 */
export function getResponseChunksByPrompt(
  prompt: string | undefined,
  withReasoning = false
): ChunkData[] {
  let responseText = '';

  // Definir uma resposta padrão
  if (!prompt || prompt.length === 0) {
    responseText = 'Esta é uma resposta padrão para testes.';
  } else if (prompt.includes('weather') || prompt.includes('clima')) {
    responseText = 'De acordo com os dados atuais, o tempo está ensolarado com 25°C.';
  } else if (prompt.includes('código') || prompt.includes('code')) {
    responseText = `Aqui está um exemplo de código:

\`\`\`javascript
function exemplo() {
  console.log("Hello, world!");
  return true;
}
\`\`\`

Você pode usar esse exemplo como ponto de partida.`;
  } else {
    responseText = `Esta é uma resposta simulada para testes. 
O prompt fornecido contém ${prompt.length} caracteres. 
É importante notar que esta é apenas uma resposta de teste.`;
  }

  // Se precisamos de raciocínio, adicionar um bloco de "thinking"
  if (withReasoning) {
    const thinking = `<thinking>
Vamos analisar essa pergunta passo a passo:
1. Primeiro, identifico o que está sendo perguntado
2. Depois, avalio as informações disponíveis
3. Finalmente, formulo uma resposta apropriada

Este é um processo de raciocínio simulado para testes.
</thinking>

`;
    responseText = thinking + responseText;
  }

  // Quebrar a resposta em chunks para simular streaming
  const responseChunks = responseText.match(/.{1,20}/g) || [];
  
  // Criar array de chunks de texto
  const chunks: ChunkData[] = responseChunks.map(chunk => ({
    type: 'text-delta',
    textDelta: chunk
  }));
  
  // Adicionar chunk final
  chunks.push({
    type: 'finish',
    finishReason: 'stop',
    usage: { promptTokens: 10, completionTokens: responseText.length / 4 }
  });
  
  return chunks;
}

/**
 * Mock para teste de ferramentas
 */
export const mockTool = async (): Promise<string> => {
  return "Resultado da ferramenta simulada para teste";
};