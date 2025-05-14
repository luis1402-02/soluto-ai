import type { UIMessage } from 'ai';

// Função para extrair o raciocínio de uma mensagem
export function extractReasoningFromMessage(message: UIMessage): string | null {
  // Verifica se o campo reasoning já existe (adicionado pelo middleware)
  if (message.reasoning) {
    return message.reasoning as string;
  }
  
  // Se não existe, tenta extrair das tags <think>
  if (typeof message.content === 'string') {
    const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
    const matches = [...message.content.matchAll(thinkRegex)];
    
    if (matches.length > 0) {
      return matches.map(match => match[1]).join('\n\n');
    }
  }
  
  return null;
}

// Função para verificar se uma mensagem tem raciocínio
export function hasReasoning(message: UIMessage): boolean {
  return extractReasoningFromMessage(message) !== null;
}

// Função para verificar se a mensagem é do assistente e se ela tem raciocínio
export function isAssistantMessageWithReasoning(message: UIMessage): boolean {
  return message.role === 'assistant' && hasReasoning(message);
}