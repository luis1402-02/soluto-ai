import { openai } from '@ai-sdk/openai';
import { AGENT_IDS, AGENTS, ANALYST, CONSOLIDATOR, CRITIC, EXPERT, Agent } from './agents';
import { getRequestPromptFromHints, RequestHints } from '../prompts';
import { UIMessage } from 'ai';

// Default timeout for agent operations (20 seconds)
const DEFAULT_AGENT_TIMEOUT = 20000;

interface SwarmInput {
  messages: UIMessage[];
  requestHints: RequestHints;
  tools?: Record<string, Function>;
}

interface AgentOutput {
  agentId: string;
  content: string;
}

export interface SwarmOutput {
  responseText: string;
  reasoningMarkdown: string;
}

/**
 * Gets the content from a message, handling different content formats
 * @param message The message to extract content from
 * @returns A string representation of the message content
 */
function getMessageContent(message: UIMessage): string {
  if (typeof message.content === 'string') {
    return message.content;
  } else if (Array.isArray(message.content)) {
    // Handle multimodal content
    return message.content
      .map((item: any) => {
        if (typeof item === 'string') return item;
        if (item.type === 'text') return item.text;
        return `[${item.type} content]`; // Placeholder for non-text content
      })
      .join(' ');
  }
  return JSON.stringify(message.content);
}

/**
 * Executes a single agent with proper error handling and timeout
 * @param model The OpenAI model to use
 * @param agent The agent configuration
 * @param prompt The system prompt
 * @param userContent The user content to process
 * @param tools Optional tools for the agent
 * @returns The agent's response
 */
async function executeAgent(
  model: any,
  agent: Agent,
  prompt: string,
  userContent: string,
  tools?: Record<string, Function>
): Promise<string> {
  const messages = [
    { role: 'system', content: `${agent.systemPrompt}\n\n${prompt}` },
    { role: 'user', content: userContent }
  ];

  try {
    // Create a promise with timeout
    const timeoutPromise = new Promise<{ content: string }>((_, reject) => {
      setTimeout(() => reject(new Error(`Agent ${agent.name} timed out after ${DEFAULT_AGENT_TIMEOUT}ms`)), DEFAULT_AGENT_TIMEOUT);
    });

    // Create the model call promise
    const modelPromise = model.complete({
      messages,
      tools: agent.usesTool && tools ? tools : undefined,
      temperature: 0.2, // Lower temperature for more consistent, focused responses
    });

    // Race the promises
    const response = await Promise.race([modelPromise, timeoutPromise]);
    return response.content;
  } catch (error: unknown) {
    console.error(`Error in ${agent.name} agent:`, error);
    if ((error as Error).message?.includes('timed out')) {
      return `O agente ${agent.name} não conseguiu responder no tempo esperado. Continuando com as informações disponíveis.`;
    }
    // Return a fallback response to maintain flow
    return `Não foi possível obter uma resposta completa do agente ${agent.name}. Continuando com informações limitadas.`;
  }
}

/**
 * Executes the swarm orchestration process with multiple specialized agents
 */
export async function runSwarmOrchestration({
  messages,
  requestHints,
  tools = {}
}: SwarmInput): Promise<SwarmOutput> {
  // Validate inputs
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw new Error('Messages array is required and must not be empty');
  }

  // Extract the user's last message
  const userMessage = messages[messages.length - 1];
  if (userMessage.role !== 'user') {
    throw new Error('Last message must be from the user');
  }

  // Get the user content, handling different content types
  const userContent = getMessageContent(userMessage);

  // Extract conversation history for context (excluding the last user message)
  const conversationHistory = messages
    .slice(0, -1)
    .map(m => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${getMessageContent(m)}`)
    .join('\n\n');

  // Location context from request hints
  const locationContext = getRequestPromptFromHints(requestHints);
  
  // Initialize the model (GPT-4.1)
  const model = openai('gpt-4.1-2025-04-14');
  
  // Storage for agent outputs
  const agentOutputs: AgentOutput[] = [];
  
  // Log execution start
  console.log(`[Swarm] Starting orchestration for user message: "${userContent ? userContent.substring(0, 100) + (userContent.length > 100 ? '...' : '') : 'empty'}"`);
  
  // Format the user input with conversation history
  const userInput = conversationHistory 
    ? `Contexto da conversa anterior:\n${conversationHistory}\n\nPergunta atual do usuário:\n${userContent}` 
    : userContent;
  
  try {
    // 1. Analyst agent - analyze the question
    console.log('[Swarm] Running Analyst agent...');
    const analysisOutput = await executeAgent(
      model,
      ANALYST,
      locationContext,
      userInput
    );
  
    agentOutputs.push({
      agentId: ANALYST.id,
      content: analysisOutput
    });
    
    // 2. Expert agent - provide initial solution
    console.log('[Swarm] Running Expert agent...');
    const expertInput = `Pergunta do usuário:\n${userContent}\n\nAnálise do problema:\n${analysisOutput}`;
    
    const expertOutput = await executeAgent(
      model,
      EXPERT,
      locationContext,
      expertInput
    );
  
    agentOutputs.push({
      agentId: EXPERT.id,
      content: expertOutput
    });
    
    // 3. Critic agent - review solution
    console.log('[Swarm] Running Critic agent...');
    const criticInput = `Pergunta do usuário:\n${userContent}\n\nResposta proposta pelo Especialista:\n${expertOutput}`;
    
    const criticOutput = await executeAgent(
      model,
      CRITIC,
      locationContext,
      criticInput
    );
  
    agentOutputs.push({
      agentId: CRITIC.id,
      content: criticOutput
    });
    
    // 4. Consolidator agent - create final response
    console.log('[Swarm] Running Consolidator agent...');
    // For the consolidator, we include artifact prompt if tools are needed
    const artifactsPrompt = `
  Você tem acesso a ferramentas especiais que podem ser usadas quando apropriado:
  
  1. createDocument: Use para criar documentos de texto, código ou outros conteúdos extensos (mais de 10 linhas).
  2. updateDocument: Use para atualizar documentos já criados.
  3. getWeather: Use para obter informações de clima quando relevante.
  4. requestSuggestions: Use para sugerir próximos passos ao usuário.
  
  Quando criar documentos de código, especifique a linguagem nos backticks, ex: \`\`\`python
  seu_codigo_aqui
  \`\`\`
  
  IMPORTANTE:
  - Use createDocument para código com mais de 10 linhas
  - Use createDocument para conteúdo que o usuário pode querer salvar/reutilizar
  - NÃO atualize documentos imediatamente após criá-los
  - Espere feedback do usuário antes de atualizar documentos
  `;
  
    const consolidatorInput = `Pergunta do usuário:\n${userContent}\n\n` +
                 `Análise do problema:\n${agentOutputs[0].content}\n\n` +
                 `Resposta do Especialista:\n${agentOutputs[1].content}\n\n` +
                 `Críticas e sugestões de melhoria:\n${agentOutputs[2].content}`;
    
    const consolidatorPrompt = `${locationContext}\n\n${artifactsPrompt}`;
    
    // The consolidator produces the final answer with tools enabled
    const consolidatorOutput = await executeAgent(
      model,
      CONSOLIDATOR,
      consolidatorPrompt,
      consolidatorInput,
      tools
    );
  
    console.log('[Swarm] Orchestration complete');
  
    // Format the reasoning section in markdown
    const reasoningMarkdown = agentOutputs.map(output => {
      const agent = AGENTS.find(a => a.id === output.agentId);
      return `**${agent?.name}:** ${output.content.trim()}`;
    }).join('\n\n');
  
    // Return final response and reasoning
    return {
      responseText: consolidatorOutput,
      reasoningMarkdown
    };
  } catch (error: unknown) {
    console.error('[Swarm] Orchestration failed:', error);
    throw new Error(`Falha na orquestração do swarm: ${(error as Error).message}`);
  }
}

/**
 * Creates a complete message for the assistant that includes both the reasoning and the final answer
 */
export function createSwarmMessage(swarmOutput: SwarmOutput): string {
  return `<thinking>\n${swarmOutput.reasoningMarkdown}\n</thinking>\n\n${swarmOutput.responseText}`;
}