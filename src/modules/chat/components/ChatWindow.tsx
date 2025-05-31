import React, { useState, useEffect, useRef } from 'react';
import { Chat, Message, ChatUser } from '../types';
import { ChatService } from '../services/chatService';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface ChatWindowProps {
  chat: Chat;
  currentUser: ChatUser;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chat, currentUser }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatService = new ChatService();

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const chatMessages = await chatService.getMessages(chat.id);
        setMessages(chatMessages.reverse());
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();

    // Subscribe to new messages
    const subscription = chatService.subscribeToMessages(chat.id, (message) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [chat.id]);

  useEffect(() => {
    scrollToBottom();
    // Mark unread messages as read
    messages.forEach((message) => {
      if (
        message.sender_id !== currentUser.id &&
        message.status !== 'read'
      ) {
        chatService.markMessageAsRead(message.id);
      }
    });
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    // Create a temporary message object for optimistic UI
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      chat_id: chat.id,
      sender_id: currentUser.id,
      content: newMessage.trim(),
      created_at: new Date().toISOString(),
      status: 'sent',
      type: 'text',
    };

    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');

    try {
      const message = await chatService.sendMessage(
        chat.id,
        currentUser.id,
        tempMessage.content
      );
      // Optionally, you could replace the temp message with the real one here
    } catch (error) {
      console.error('Error sending message:', error);
      // Optionally, remove the temp message or show an error
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 bg-gray-50 p-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex space-x-4">
              <div className="rounded-full bg-gray-200 h-10 w-10"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
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
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{chat.name}</h2>
            {chat.type === 'direct' && (
              <p className="text-sm text-gray-500">Online</p>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className='overflow-y-auto max-h-[calc(100vh-10rem)]'>
      <div className="flex-1  p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${message.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`min-w-4/5 rounded-lg p-3 ${
                  message.sender_id === currentUser.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-white shadow text-gray-900'
                }`}
              >
                <div className="flex items-center justify-end mt-1">
                  <div className="w-full">
                    <div className='text-left text-sm'>{message.content}</div>
                    <div className='text-right text-xs opacity-70'>
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  {message.sender_id === currentUser.id && (
                    <span className="ml-2">
                      {message.status === 'read' ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L9 12.586l7.293-7.293a1 1 0 011.414 1.414l-8 8z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                        </svg>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="bg-white border-t border-gray-200 p-4 w-full">
        <div className="flex items-center space-x-4 w-full">
          <button
            type="button"
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className={`p-2 rounded-full ${
              newMessage.trim()
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow; 