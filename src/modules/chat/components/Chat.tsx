'use client';

import React, { useEffect, useState } from 'react';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import { ChatService } from '../services/chatService';
import type { Chat, ChatUser } from '../types';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const Chat: React.FC = () => {
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [currentUser, setCurrentUser] = useState<ChatUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const chatService = new ChatService();
    const supabase = createClientComponentClient();

    useEffect(() => {
        const loadCurrentUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // Check if profile exists
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single();

                    if (profileError && profileError.code === 'PGRST116') {
                        // Create profile if it doesn't exist
                        const { error: insertError } = await supabase
                            .from('profiles')
                            .insert([{
                                id: user.id,
                                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
                                avatar_url: user.user_metadata?.avatar_url
                            }]);

                        if (insertError) {
                            console.error('Error creating profile:', insertError);
                            return;
                        }
                    }

                    setCurrentUser({
                        id: user.id,
                        email: user.email || '',
                        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
                        avatar_url: user.user_metadata?.avatar_url || null,
                        online_status: 'online'
                    });
                }
            } catch (err) {
                console.error('Error loading current user:', err);
            }
        };

        loadCurrentUser();
    }, []);

    useEffect(() => {
        const initializeChat = async () => {
            try {
                setIsLoading(true);
                // Initialize database tables
                await chatService.initializeDatabase();
                setError(null);
            } catch (err) {
                console.error('Error initializing chat:', err);
                setError('Failed to initialize chat. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };

        initializeChat();
    }, []);

    const handleSelectChat = (chat: Chat) => {
        setSelectedChat(chat);
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    if (!currentUser) {
        return <div>Please log in to use chat</div>;
    }

    return (
        <div className="flex h-screen">
            <ChatSidebar
                onSelectChat={handleSelectChat}
                selectedChatId={selectedChat?.id}
                currentUser={currentUser}
            />
            {selectedChat && (
                <ChatWindow
                    chat={selectedChat}
                    currentUser={currentUser}
                />
            )}
        </div>
    );
};

export default Chat; 