import React from 'react';
import ChatWindow from './ChatWindow';
import type { Chat, ChatUser } from '../types';

interface ProposalChatModalProps {
  chat: Chat;
  currentUser: ChatUser;
  onClose: () => void;
}

const ProposalChatModal: React.FC<ProposalChatModalProps> = ({ chat, currentUser, onClose }) => {
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0" onClick={handleOverlayClick}>
      <div className="fixed w-full bottom-0 bg-white shadow-2xl z-[9999] flex flex-col animate-slide-in-bottom ml-auto">
        
        <div className="flex justify-end p-2">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ChatWindow chat={chat} currentUser={currentUser} />
        </div>
      </div>
    </div>
  );
};

export default ProposalChatModal;

// Add animation styles
// In your global CSS (e.g., globals.css), add:
// .animate-slide-in-right { animation: slideInRight 0.3s cubic-bezier(0.4,0,0.2,1) both; }
// @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
// .animate-slide-in-bottom { animation: slideInBottom 0.3s cubic-bezier(0.4,0,0.2,1) both; }
// @keyframes slideInBottom { from { transform: translateY(100%); } to { transform: translateY(0); } } 