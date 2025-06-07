export interface Chat {
    id: string;
    name: string;
    type: 'direct' | 'group';
    created_at: string;
    updated_at: string;
    last_message?: Message;
}

export interface Message {
    id: string;
    chat_id: string;
    sender_id: string;
    content: string;
    type: 'text' | 'file' | 'image';
    created_at: string;
    read_at?: string;
    status: 'sent' | 'delivered' | 'read';
}

export interface ChatParticipant {
    id: string;
    chat_id: string;
    user_id: string;
    role: 'admin' | 'member';
    joined_at: string;
    last_read_at?: string;
}

export interface ChatUser {
    id: string;
    email: string;
    full_name: string;
    online_status: 'online' | 'offline';
    last_seen?: string;
} 