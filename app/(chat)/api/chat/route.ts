import {
  appendClientMessage,
  appendResponseMessages,
  createDataStream,
  smoothStream,
  streamText,
} from 'ai';
import { auth, type UserType } from '@/app/(auth)/auth';
import { type RequestHints, systemPrompt } from '@/lib/ai/prompts';
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  getStreamIdsByChatId,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import { generateUUID, getTrailingMessageId } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { geolocation } from '@vercel/functions';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';
import type { Chat } from '@/lib/db/schema';
import { differenceInSeconds } from 'date-fns';
import { createSwarmMessage, runSwarmOrchestration } from '@/lib/ai/swarm/orchestrator';

export const maxDuration = 60;

// Utility function to clean up when the stream is finished
function cleanupStreamContext(streamContext: ResumableStreamContext | null): void {
  if (streamContext) {
    // Free resources or do cleanup
    console.log('Stream context cleanup');
  }
}

// Singleton pattern with cleanup capability
let globalStreamContext: ResumableStreamContext | null = null;

function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes('REDIS_URL')) {
        console.log(
          ' > Resumable streams are disabled due to missing REDIS_URL',
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

// Utility to stream text chunks while preserving formatting
function streamFormattedText(dataStream: any, text: string, delayMs = 5): Promise<void> {
  return new Promise<void>(async (resolve) => {
    if (!text) {
      resolve();
      return;
    }

    // Preserve markdown and formatting in the streaming
    const preserveFormatting = (text: string): Array<string | {isMarker: boolean, text: string}> => {
      // Split on markers that should be preserved
      const markers = [
        '```', '`', '#', '##', '###', '####', '#####', '**', '__', '*', '_',
        '\n', '- ', '1. ', '> '
      ];
      
      let parts: Array<string | {isMarker: boolean, text: string}> = [text];
      
      // For each marker, split all parts and preserve the marker
      markers.forEach(marker => {
        let newParts: Array<string | {isMarker: boolean, text: string}> = [];
        parts.forEach(part => {
          if (typeof part !== 'string') {
            newParts.push(part);
            return;
          }
          
          const split = part.split(marker);
          for (let i = 0; i < split.length; i++) {
            if (i > 0) {
              // Keep the marker as a separate chunk
              newParts.push({ isMarker: true, text: marker });
            }
            if (split[i]) {
              newParts.push(split[i]);
            }
          }
        });
        parts = newParts;
      });
      
      return parts;
    };

    const chunks = preserveFormatting(text);
    
    for (const chunk of chunks) {
      // If it's a marker, send it immediately without delay
      if (typeof chunk === 'object' && chunk.isMarker) {
        dataStream.writeData({ type: 'text', value: chunk.text });
        // Very brief delay so markers don't pile up
        await new Promise(r => setTimeout(r, 1));
      } 
      // For normal text, stream word by word
      else if (typeof chunk === 'string') {
        const words = chunk.split(/(\s+)/);
        for (const word of words) {
          dataStream.writeData({ type: 'text', value: word });
          if (word.trim().length > 0) {
            await new Promise(r => setTimeout(r, delayMs));
          }
        }
      }
    }
    
    resolve();
  });
}

// Keep track of active streams for cleanup
const activeStreams = new Set<string>();

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new Response('Invalid request body', { status: 400 });
  }

  try {
    const { id, message, selectedChatModel, selectedVisibilityType } =
      requestBody;

    const session = await auth();

    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new Response(
        'You have exceeded your maximum number of messages for the day! Please try again later.',
        {
          status: 429,
        },
      );
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
    } else {
      if (chat.userId !== session.user.id) {
        return new Response('Forbidden', { status: 403 });
      }
    }

    const previousMessages = await getMessagesByChatId({ id });

    // Convert DB messages to UI messages format
    const messages = appendClientMessage({
      // @ts-expect-error: todo add type conversion from DBMessage[] to UIMessage[]
      messages: previousMessages,
      message,
    });

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: 'user',
          parts: message.parts,
          attachments: message.experimental_attachments ?? [],
          createdAt: new Date(),
        },
      ],
    });

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });
    
    // Track this stream
    activeStreams.add(streamId);

    // Handle different chat modes
    if (selectedChatModel === 'chat-model-reasoning') {
      // Advanced mode (Swarm) implementation
      const stream = createDataStream({
        execute: async (dataStream) => {
          try {
            // Setup tools with dataStream for the agent
            const toolsWithStream = {
              getWeather,
              createDocument: createDocument({ session, dataStream }),
              updateDocument: updateDocument({ session, dataStream }),
              requestSuggestions: requestSuggestions({
                session,
                dataStream,
              }),
            };

            // Run the swarm orchestration
            console.log('Starting swarm orchestration for chat', id);
            // Converta Message[] para UIMessage[] para satisfazer a tipagem
            const uiMessages = messages.map(msg => ({
              ...msg,
              parts: msg.parts || [{ type: 'text', text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) }],
            }));
            
<<<<<<< HEAD
            // Cast das ferramentas para o tipo esperado pelo orquestrador
            const toolsForSwarm: Record<string, any> = toolsWithStream;
            
=======
>>>>>>> e5dc205079cb0fc279afc281137673d7e3f58e7e
            const swarmResult = await runSwarmOrchestration({
              messages: uiMessages,
              requestHints,
              tools: toolsForSwarm
            });

            // Create the final message with reasoning
            const fullContent = createSwarmMessage(swarmResult);

            // Prepare the response message
            const assistantId = generateUUID();
            const responseMessage = {
              id: assistantId,
              role: 'assistant',
              content: fullContent,
            };

            // Stream the content to the user with proper formatting
            console.log('Streaming formatted swarm response');
            await streamFormattedText(dataStream, swarmResult.responseText);

            // Save the message to the database
            await saveMessages({
              messages: [
                {
                  id: assistantId,
                  chatId: id,
                  role: 'assistant',
                  parts: [fullContent],
                  attachments: [],
                  createdAt: new Date(),
                },
              ],
            });
            
            // Add reasoning indication to stream data
            dataStream.writeData({
              type: 'reasoning',
              value: swarmResult.reasoningMarkdown
            });
            
            console.log('Swarm response complete for chat', id);
          } catch (error) {
            console.error('Error in swarm orchestration:', error);
            dataStream.writeData({
              type: 'text',
              value: 'Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.'
            });
          } finally {
            // Remove from tracking
            activeStreams.delete(streamId);
          }
        },
        onError: (error) => {
          console.error('Stream error:', error);
          activeStreams.delete(streamId);
          return 'Oops, ocorreu um erro inesperado. Por favor, tente novamente.';
        },
      });

      const streamContext = getStreamContext();

      if (streamContext) {
        return new Response(
          await streamContext.resumableStream(streamId, () => stream),
        );
      } else {
        return new Response(stream);
      }
    } else {
      // Simple mode (original implementation)
      const stream = createDataStream({
        execute: (dataStream) => {
          const result = streamText({
            model: myProvider.languageModel(selectedChatModel),
            system: systemPrompt({ selectedChatModel, requestHints }),
            messages,
            maxSteps: 5,
            experimental_activeTools: [
              'getWeather',
              'createDocument',
              'updateDocument', 
              'requestSuggestions',
            ],
            experimental_transform: smoothStream({ chunking: 'word' }),
            experimental_generateMessageId: generateUUID,
            tools: {
              getWeather,
              createDocument: createDocument({ session, dataStream }),
              updateDocument: updateDocument({ session, dataStream }),
              requestSuggestions: requestSuggestions({
                session,
                dataStream,
              }),
            },
            onFinish: async ({ response }) => {
              try {
                if (session.user?.id) {
                  const assistantId = getTrailingMessageId({
                    messages: response.messages.filter(
                      (message) => message.role === 'assistant',
                    ),
                  });

                  if (!assistantId) {
                    throw new Error('No assistant message found!');
                  }

                  const [, assistantMessage] = appendResponseMessages({
                    messages: [message],
                    responseMessages: response.messages,
                  });

                  await saveMessages({
                    messages: [
                      {
                        id: assistantId,
                        chatId: id,
                        role: assistantMessage.role,
                        parts: assistantMessage.parts,
                        attachments:
                          assistantMessage.experimental_attachments ?? [],
                        createdAt: new Date(),
                      },
                    ],
                  });
                }
              } catch (error) {
                console.error('Failed to save chat:', error);
              } finally {
                // Remove from tracking
                activeStreams.delete(streamId);
              }
            },
            experimental_telemetry: {
              isEnabled: isProductionEnvironment,
              functionId: 'stream-text',
            },
          });

          result.consumeStream();

          result.mergeIntoDataStream(dataStream, {
            sendReasoning: true,
          });
        },
        onError: (error) => {
          console.error('Stream error:', error);
          activeStreams.delete(streamId);
          return 'Oops, ocorreu um erro inesperado. Por favor, tente novamente.';
        },
      });

      const streamContext = getStreamContext();

      if (streamContext) {
        return new Response(
          await streamContext.resumableStream(streamId, () => stream),
        );
      } else {
        return new Response(stream);
      }
    }
  } catch (error) {
    console.error('Request error:', error);
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
}

export async function GET(request: Request) {
  const streamContext = getStreamContext();
  const resumeRequestedAt = new Date();

  if (!streamContext) {
    return new Response(null, { status: 204 });
  }

  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return new Response('id is required', { status: 400 });
  }

  const session = await auth();

  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  let chat: Chat;

  try {
    chat = await getChatById({ id: chatId });
  } catch {
    return new Response('Not found', { status: 404 });
  }

  if (!chat) {
    return new Response('Not found', { status: 404 });
  }

  if (chat.visibility === 'private' && chat.userId !== session.user.id) {
    return new Response('Forbidden', { status: 403 });
  }

  const streamIds = await getStreamIdsByChatId({ chatId });

  if (!streamIds.length) {
    return new Response('No streams found', { status: 404 });
  }

  const recentStreamId = streamIds.at(-1);

  if (!recentStreamId) {
    return new Response('No recent stream found', { status: 404 });
  }

  const emptyDataStream = createDataStream({
    execute: () => {},
  });

  const stream = await streamContext.resumableStream(
    recentStreamId,
    () => emptyDataStream,
  );

  /*
   * For when the generation is streaming during SSR
   * but the resumable stream has concluded at this point.
   */
  if (!stream) {
    const messages = await getMessagesByChatId({ id: chatId });
    const mostRecentMessage = messages.at(-1);

    if (!mostRecentMessage) {
      return new Response(emptyDataStream, { status: 200 });
    }

    if (mostRecentMessage.role !== 'assistant') {
      return new Response(emptyDataStream, { status: 200 });
    }

    const messageCreatedAt = new Date(mostRecentMessage.createdAt);

    if (differenceInSeconds(resumeRequestedAt, messageCreatedAt) > 15) {
      return new Response(emptyDataStream, { status: 200 });
    }

    const restoredStream = createDataStream({
      execute: (buffer) => {
        buffer.writeData({
          type: 'append-message',
          message: JSON.stringify(mostRecentMessage),
        });
      },
    });

    return new Response(restoredStream, { status: 200 });
  }

  return new Response(stream, { status: 200 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response('Forbidden', { status: 403 });
    }

    const deletedChat = await deleteChatById({ id });

    return Response.json(deletedChat, { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
}