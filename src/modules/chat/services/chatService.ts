import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Chat, Message, ChatParticipant, ChatUser } from '../types';

export class ChatService {
    private supabase;

    constructor() {
        this.supabase = createClientComponentClient();
    }

    // Initialize database tables
    async initializeDatabase(): Promise<void> {
        try {
            // Check if chats table exists
            const { error: chatsError } = await this.supabase
                .from('chats')
                .select('id')
                .limit(1);

            if (chatsError && chatsError.code === '42P01') { // Table doesn't exist
                console.log('Initializing chat database tables...');

                // Create chats table
                await this.supabase.rpc('create_chat_tables');

                console.log('Chat database tables initialized successfully');
            }
        } catch (error) {
            console.error('Error initializing database:', error);
            throw error;
        }
    }

    // Chat operations
    async createChat(name: string, type: 'direct' | 'group', participants: string[]): Promise<Chat | null> {
        try {
            // Create the chat
            const { data: chat, error: chatError } = await this.supabase
                .from('chats')
                .insert([{ name, type }])
                .select()
                .single();

            if (chatError) throw chatError;

            // Add participants
            const participantData = participants.map(userId => ({
                chat_id: chat.id,
                user_id: userId,
                role: 'member'
            }));

            const { error: participantError } = await this.supabase
                .from('chat_participants')
                .insert(participantData);

            if (participantError) throw participantError;

            return chat;
        } catch (error) {
            console.error('Error creating chat:', error);
            return null;
        }
    }

    async getChats(userId: string): Promise<Chat[]> {
        try {
            console.log('Fetching chats for user:', userId);

            // First, verify the user exists and create a profile if it doesn't exist
            const { data: userData, error: userError } = await this.supabase
                .from('profiles')
                .select('id')
                .eq('id', userId)
                .single();

            if (userError) {
                console.error('Error verifying user profile:', {
                    error: userError,
                    code: userError.code,
                    message: userError.message,
                    details: userError.details
                });

                if (userError.code === 'PGRST116') { // Profile doesn't exist
                    console.log('Creating profile for user:', userId);
                    // Create a profile for the user
                    const { error: insertError } = await this.supabase
                        .from('profiles')
                        .insert([{ id: userId }]);

                    if (insertError) {
                        console.error('Error creating profile:', {
                            error: insertError,
                            code: insertError.code,
                            message: insertError.message,
                            details: insertError.details
                        });
                        throw insertError;
                    }
                } else {
                    throw userError;
                }
            }

            console.log('Fetching chats from database...');
            // Then fetch the chats
            const { data, error } = await this.supabase
                .from('chats')
                .select(`
                    *,
                    chat_participants!inner(
                        user_id,
                        role
                    ),
                    messages:messages(
                        id,
                        content,
                        created_at,
                        sender_id,
                        status
                    )
                `)
                .eq('chat_participants.user_id', userId)
                .order('updated_at', { ascending: false });

            if (error) {
                console.error('Error fetching chats:', {
                    error,
                    code: error.code,
                    message: error.message,
                    details: error.details,
                    hint: error.hint
                });
                throw error;
            }

            console.log('Chats fetched successfully:', data?.length || 0, 'chats found');

            // Transform the data to match our Chat interface
            const transformedChats = (data || []).map(chat => ({
                ...chat,
                last_message: chat.messages?.[0] || null
            }));

            return transformedChats;
        } catch (error) {
            console.error('Error in getChats:', {
                error,
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                details: error instanceof Error ? error : undefined
            });
            return [];
        }
    }

    // Message operations
    async sendMessage(chatId: string, senderId: string, content: string, type: 'text' | 'file' | 'image' = 'text'): Promise<Message | null> {
        try {
            const { data, error } = await this.supabase
                .from('messages')
                .insert([{
                    chat_id: chatId,
                    sender_id: senderId,
                    content,
                    type,
                    status: 'sent'
                }])
                .select()
                .single();

            if (error) throw error;

            // Update chat's updated_at timestamp
            await this.supabase
                .from('chats')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', chatId);

            return data;
        } catch (error) {
            console.error('Error sending message:', error);
            return null;
        }
    }

    async getMessages(chatId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
        try {
            const { data, error } = await this.supabase
                .from('messages')
                .select('*')
                .eq('chat_id', chatId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching messages:', error);
            return [];
        }
    }

    // Participant operations
    async addParticipant(chatId: string, userId: string, role: 'admin' | 'member' = 'member'): Promise<ChatParticipant | null> {
        try {
            const { data, error } = await this.supabase
                .from('chat_participants')
                .insert([{
                    chat_id: chatId,
                    user_id: userId,
                    role
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error adding participant:', error);
            return null;
        }
    }

    async removeParticipant(chatId: string, userId: string): Promise<boolean> {
        try {
            const { error } = await this.supabase
                .from('chat_participants')
                .delete()
                .eq('chat_id', chatId)
                .eq('user_id', userId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error removing participant:', error);
            return false;
        }
    }

    // Real-time subscriptions
    subscribeToMessages(chatId: string, callback: (message: Message) => void) {
        return this.supabase
            .channel(`chat:${chatId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `chat_id=eq.${chatId}`
            }, (payload) => {
                callback(payload.new as Message);
            })
            .subscribe();
    }

    subscribeToChatUpdates(userId: string, callback: (chat: Chat) => void) {
        return this.supabase
            .channel(`user:${userId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'chats',
                filter: `id=in.(select chat_id from chat_participants where user_id=eq.${userId})`
            }, (payload) => {
                callback(payload.new as Chat);
            })
            .subscribe();
    }

    // Get or create a chat linked to a proposal
    async getOrCreateProposalChat(proposalId: string, participantIds: string[]): Promise<Chat | null> {
        // Try to find an existing chat for this proposal
        const { data: chat, error } = await this.supabase
            .from('chats')
            .select('*')
            .eq('proposal_id', proposalId)
            .maybeSingle();
        if (error) {
            console.error('Error checking for existing proposal chat:', error);
            return null;
        }
        if (chat) {
            return chat;
        }
        // Log the insert payload
        const insertPayload = { name: `Proposal Chat ${proposalId}`, type: 'group', proposal_id: proposalId };
        console.log('Creating chat with:', insertPayload);
        // Create the chat
        const { data: newChat, error: createError } = await this.supabase
            .from('chats')
            .insert([insertPayload])
            .select()
            .single();
        if (createError) {
            console.error('Error creating proposal chat:', JSON.stringify(createError, null, 2));
            // Try a minimal insert for debugging
            const minimalPayload = { name: 'Minimal Test Chat', type: 'group' };
            const { data: minimalData, error: minimalError } = await this.supabase
                .from('chats')
                .insert([minimalPayload])
                .select()
                .single();
            console.log('Minimal insert result:', { minimalData, minimalError });
            return null;
        }
        // Add participants
        const participantData = participantIds.map(userId => ({
            chat_id: newChat.id,
            user_id: userId,
            role: 'member'
        }));
        const { error: participantError } = await this.supabase
            .from('chat_participants')
            .insert(participantData);
        if (participantError) {
            console.error('Error adding participants to proposal chat:', participantError);
        }
        return newChat;
    }

    // Get or create a direct chat between two users
    async getOrCreateDirectChat(userA: string, userB: string): Promise<Chat | null> {
        // Try to find an existing direct chat between these users
        const { data: existingChats, error } = await this.supabase
            .from('chats')
            .select(`*, chat_participants!inner(user_id)`) // join participants
            .eq('type', 'direct');
        if (error) {
            console.error('Error checking for existing direct chat:', error);
            return null;
        }
        // Find a chat where both users are participants
        const directChat = (existingChats || []).find(chat => {
            const userIds = (chat.chat_participants || []).map((p: any) => p.user_id);
            return userIds.includes(userA) && userIds.includes(userB) && userIds.length === 2;
        });
        if (directChat) {
            return directChat;
        }
        // Create the chat
        const { data: chat, error: createError } = await this.supabase
            .from('chats')
            .insert([{ name: 'Direct Chat', type: 'direct' }])
            .select()
            .single();
        if (createError) {
            console.error('Error creating direct chat:', createError);
            return null;
        }
        // Add both users as participants
        const participantData = [userA, userB].map(userId => ({
            chat_id: chat.id,
            user_id: userId,
            role: 'member'
        }));
        const { error: participantError } = await this.supabase
            .from('chat_participants')
            .insert(participantData);
        if (participantError) {
            console.error('Error adding participants to direct chat:', participantError);
        }
        return chat;
    }

    // Mark a message as read
    async markMessageAsRead(messageId: string): Promise<void> {
        try {
            await this.supabase
                .from('messages')
                .update({ read_at: new Date().toISOString(), status: 'read' })
                .eq('id', messageId);
        } catch (error) {
            console.error('Error marking message as read:', error);
        }
    }
} 