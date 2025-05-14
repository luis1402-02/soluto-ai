'use client';

import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { memo } from 'react';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { VisibilityType } from './visibility-selector';

interface SuggestedActionsProps {
  chatId: string;
  append: UseChatHelpers['append'];
  selectedVisibilityType: VisibilityType;
}

function PureSuggestedActions({
  chatId,
  append,
  selectedVisibilityType,
}: SuggestedActionsProps) {
const suggestedActions = [
  {
    title: 'Como usar IA para',
    label: 'análise de legislação regulatória',
    action: 'Como usar inteligência artificial para otimizar a análise de legislação regulatória recente da ANVISA?',
  },
  {
    title: 'Gere um modelo de',
    label: 'relatório técnico para submissão regulatória',
    action: 'Gere um modelo de relatório técnico para submissão regulatória de dispositivos médicos junto à ANVISA',
  },
  {
    title: 'Resuma as principais',
    label: 'mudanças regulatórias do último trimestre',
    action: 'Resuma as principais mudanças regulatórias da ANVISA no setor de dispositivos médicos do último trimestre',
  },
  {
    title: 'Como estruturar',
    label: 'uma estratégia regulatória ágil',
    action: 'Como estruturar uma estratégia regulatória ágil para aceleração da entrada de produtos inovadores no mercado brasileiro?',
  },
];

  return (
    <div
      data-testid="suggested-actions"
      className="grid sm:grid-cols-2 gap-2 w-full"
    >
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * index }}
          key={`suggested-action-${suggestedAction.title}-${index}`}
          className={index > 1 ? 'hidden sm:block' : 'block'}
        >
          <Button
            variant="ghost"
            onClick={async () => {
              window.history.replaceState({}, '', `/chat/${chatId}`);

              append({
                role: 'user',
                content: suggestedAction.action,
              });
            }}
            className="text-left border rounded-xl px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start"
          >
            <span className="font-medium">{suggestedAction.title}</span>
            <span className="text-muted-foreground">
              {suggestedAction.label}
            </span>
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) return false;
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType)
      return false;

    return true;
  },
);
