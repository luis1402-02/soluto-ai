'use client';

import { useState } from 'react';
import { ChevronDownIcon, LoaderIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';
import { Markdown } from './markdown';

interface MessageReasoningProps {
  isLoading: boolean;
  reasoning: string | undefined;
}

// Tipos de agentes suportados no formato de raciocínio
type AgentType = 'Analista' | 'Especialista' | 'Crítico' | 'Consolidador';

export function MessageReasoning({
  isLoading,
  reasoning = '',
}: MessageReasoningProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const variants = {
    collapsed: {
      height: 0,
      opacity: 0,
      marginTop: 0,
      marginBottom: 0,
    },
    expanded: {
      height: 'auto',
      opacity: 1,
      marginTop: '1rem',
      marginBottom: '0.5rem',
    },
  };

  // Function to enhance agent texts with improved styling
  const enhanceAgentFormatting = (text: string): string => {
    // First, let's identify agent sections and enhance their formatting
    // Match patterns like "**Analista:** text" 
    return text.replace(
      /\*\*(Analista|Especialista|Crítico|Consolidador):\*\*/g, 
      (match, agentName: string) => {
        const colorClass = getAgentColorClass(agentName as AgentType);
        return `<div class="agent-header ${colorClass}">**${agentName}:**</div>`
      }
    );
  };

  // Get CSS class by agent type
  const getAgentColorClass = (agentName: AgentType): string => {
    switch (agentName) {
      case 'Analista': return 'text-blue-600 dark:text-blue-400';
      case 'Especialista': return 'text-green-600 dark:text-green-400';
      case 'Crítico': return 'text-amber-600 dark:text-amber-400';
      case 'Consolidador': return 'text-purple-600 dark:text-purple-400';
      default: return '';
    }
  };

  // The enhanced reasoning with custom formatting
  const enhancedReasoning = reasoning ? enhanceAgentFormatting(reasoning) : '';

  return (
    <div className="flex flex-col">
      {isLoading ? (
        <div className="flex flex-row gap-2 items-center">
          <div className="font-medium">Raciocínando...</div>
          <div className="animate-spin">
            <LoaderIcon />
          </div>
        </div>
      ) : (
        <div className="flex flex-row gap-2 items-center">
          <div className="font-medium">Raciocínio colaborativo disponível</div>
          <button
            data-testid="message-reasoning-toggle"
            type="button"
            className="cursor-pointer"
            onClick={() => {
              setIsExpanded(!isExpanded);
            }}
          >
            <ChevronDownIcon />
          </button>
        </div>
      )}

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            data-testid="message-reasoning"
            key="content"
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={variants}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
            className="pl-4 text-zinc-600 dark:text-zinc-400 border-l border-zinc-300 dark:border-zinc-700 flex flex-col gap-4"
          >
            <div className="reasoning-wrapper">
              <Markdown>{enhancedReasoning}</Markdown>
            </div>
            <style jsx global>{`
              .reasoning-wrapper {
                font-size: 0.95rem;
              }
              .reasoning-wrapper .agent-header {
                font-weight: bold;
                margin-top: 0.75rem;
                margin-bottom: 0.25rem;
                padding-bottom: 0.25rem;
                border-bottom: 1px solid rgba(125, 125, 125, 0.2);
              }
              .reasoning-wrapper p {
                margin-bottom: 0.5rem;
              }
            `}</style>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}