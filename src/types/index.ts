export interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    location: string;
    created_at: string;
}

export interface Project {
    id: string;
    title: string;
    category: 'Farming' | 'Real Estate' | string;
    status: 'Active' | 'Pending' | 'Completed';
    amount: number;
    date: string;
}

export interface Investment {
    id: string;
    project_id: string;
    user_id: string;
    amount: number;
    date: string;
}

export interface Event {
    id: string;
    title: string;
    date: string;
    description: string;
    link?: string;
} 