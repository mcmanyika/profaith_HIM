import React, { useState, useEffect } from 'react';
import { Chat, ChatUser } from '../types';
import { ChatService } from '../services/chatService';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface ChatSidebarProps {
  onSelectChat: (chat: Chat) => void;
  selectedChatId?: string;
  currentUser: ChatUser;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ onSelectChat, selectedChatId, currentUser }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const chatService = new ChatService();

  useEffect(() => {
    const loadChats = async () => {
      try {
        const userChats = await chatService.getChats(currentUser.id);
        setChats(userChats);
      } catch (error) {
        console.error('Error loading chats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadChats();

    // Subscribe to chat updates
    const subscription = chatService.subscribeToChatUpdates(currentUser.id, (updatedChat) => {
      setChats(prevChats => {
        const index = prevChats.findIndex(chat => chat.id === updatedChat.id);
        if (index >= 0) {
          const newChats = [...prevChats];
          newChats[index] = updatedChat;
          return newChats;
        }
        return [updatedChat, ...prevChats];
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUser.id]);

  if (isLoading) {
    return (
      <div className="w-80 bg-white border-r border-gray-200 h-screen p-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="rounded-full bg-gray-200 h-12 w-12"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">Messages</h2>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {chats.map((chat) => (
          <motion.div
            key={chat.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectChat(chat)}
            className={`p-4 cursor-pointer transition-colors duration-200 ${
              selectedChatId === chat.id ? 'bg-blue-50' : 'hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                  {chat.type === 'direct' ? (
                    <span className="text-lg font-semibold text-gray-600">
                      {chat.name.charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  )}
                </div>
                {chat.type === 'direct' && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 truncate">{chat.name}</p>
                  {chat.last_message && (
                    <span className="text-xs text-gray-500">
                      {new Date(chat.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                {chat.last_message && (
                  <p className="text-sm text-gray-500 truncate">
                    {chat.last_message.content}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ChatSidebar; 