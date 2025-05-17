# Swarm AI: Raciocínio Coletivo

Este módulo implementa o sistema de "Raciocínio Coletivo" (Swarm) para o SolutoMIND, que permite a colaboração de múltiplos agentes especializados para resolver questões complexas.

## Arquitetura

O sistema utiliza um conjunto de agentes especializados que trabalham juntos em uma sequência predefinida:

1. **Analista**: Decompõe e clarifica o problema, identificando pontos-chave.
2. **Especialista**: Elabora uma solução detalhada com base na análise.
3. **Crítico**: Avalia a solução proposta, identifica falhas e sugere melhorias.
4. **Consolidador**: Integra todas as contribuições em uma resposta final coerente.

## Fluxo de Funcionamento

1. A pergunta do usuário (e contexto da conversa) é enviada para o Analista.
2. A análise e a pergunta original são enviadas para o Especialista.
3. A resposta do Especialista e a pergunta original são enviadas para o Crítico.
4. Todas as contribuições anteriores são enviadas para o Consolidador.
5. A resposta final do Consolidador é apresentada ao usuário.
6. Opcionalmente, o usuário pode ver o raciocínio colaborativo completo, que mostra os passos internos.

## Arquivos

- `agents.ts`: Define os perfis dos agentes e seus prompts especializados.
- `orchestrator.ts`: Implementa a lógica de orquestração que coordena as chamadas aos agentes.

## Integração

O sistema de Swarm está integrado no fluxo principal:

- Quando o usuário seleciona o modo "Chat Avançado (Raciocínio Coletivo)", o sistema aciona a orquestração de swarm.
- O raciocínio colaborativo é formatado e exibido ao usuário como um painel colapsável.
- Os agentes têm acesso às mesmas ferramentas (artefatos) que o modo simples.

## Vantagens

- **Análise Profunda**: Decompõe problemas complexos em etapas mais gerenciáveis.
- **Múltiplas Perspectivas**: Cada agente contribui com seu enfoque especializado.
- **Validação Interna**: O Crítico atua como camada de verificação de qualidade.
- **Transparência**: O usuário pode visualizar o processo de raciocínio interno.

## Desenvolvimento Futuro

Algumas áreas para expansão futura:

- Agentes adicionais (pesquisador, calculador, etc.)
- Execução parcialmente paralela para otimização de performance
- Configurabilidade dos agentes e da sequência de execução
- Personalização de prompts por domínio específico

## Exemplo de Uso

```typescript
const result = await runSwarmOrchestration({
  messages: conversationHistory,
  requestHints: locationContext,
  tools: availableTools
});

const formattedMessage = createSwarmMessage(result);
// formattedMessage contém a resposta final e o raciocínio formatado
```