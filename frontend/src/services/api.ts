import type { User, Message } from '../types';

const API_BASE_URL = 'http://localhost:5000/api';

// Generate a valid 24-character hex string that MongoDB accepts as an ObjectId
const generateObjectId = (): string => {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const random = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  return timestamp + random;
};

// Helper for authorized headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('mern_chat_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Initial mock fallback users for zero-config quick testing
export const MOCK_USERS: User[] = [
  {
    _id: '64a1b2c3d4e5f6a7b8c9d001',
    name: 'Sarah Connor',
    email: 'sarah@example.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    status: 'online',
    about: 'Building resilient web systems 🚀',
  },
  {
    _id: '64a1b2c3d4e5f6a7b8c9d002',
    name: 'Alex Rivera',
    email: 'alex@example.com',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    status: 'online',
    about: 'Fullstack developer & coffee lover ☕',
  },
  {
    _id: '64a1b2c3d4e5f6a7b8c9d003',
    name: 'Elena Rostova',
    email: 'elena@example.com',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    status: 'away',
    about: 'UI/UX Designer & animator ✨',
  },
  {
    _id: '64a1b2c3d4e5f6a7b8c9d004',
    name: 'Marcus Vance',
    email: 'marcus@example.com',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    status: 'offline',
    about: 'Cloud architect & DevOps enthusiast ☁️',
  },
];

export const api = {
  // Authentication
  async register(name: string, email: string, password: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');
      return data;
    } catch (err: any) {
      // Local fallback mode
      console.warn('Backend server unreachable, using offline fallback', err.message);
      const fallbackUser: User = {
        _id: generateObjectId(),
        name,
        email,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
        status: 'online',
        about: 'Hey there! I am using NovaChat.',
      };
      const fallbackToken = 'demo-token-' + Date.now();
      return { token: fallbackToken, user: fallbackUser };
    }
  },

  async login(email: string, password: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      return data;
    } catch (err: any) {
      console.warn('Backend unreachable, checking mock accounts', err.message);
      const matched = MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
      const user = matched || {
        _id: generateObjectId(),
        name: email.split('@')[0],
        email,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
        status: 'online',
        about: 'Ready to chat!',
      };
      return { token: 'demo-token-' + Date.now(), user };
    }
  },

  async getMe() {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch user');
      const data = await res.json();
      return data.user;
    } catch {
      return null;
    }
  },

  // Contacts
  async getContacts(): Promise<User[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/contacts`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to get contacts');
      const data = await res.json();
      return data.contacts;
    } catch {
      // Return default mock contacts stored locally or fallback
      const saved = localStorage.getItem('local_contacts');
      if (saved) return JSON.parse(saved);
      return MOCK_USERS.slice(1);
    }
  },

  async searchUsers(query: string): Promise<User[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/contacts/search?q=${encodeURIComponent(query)}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to search');
      const data = await res.json();
      return data.users;
    } catch {
      const q = query.toLowerCase();
      return MOCK_USERS.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
  },

  async addContact(contactId: string, email?: string): Promise<User> {
    try {
      const res = await fetch(`${API_BASE_URL}/contacts/add`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ contactId, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add contact');
      return data.contact;
    } catch {
      // Local fallback
      const target = MOCK_USERS.find((u) => u._id === contactId || u.email === email) || {
        _id: generateObjectId(),
        name: email ? email.split('@')[0] : 'New Contact',
        email: email || 'contact@example.com',
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email || 'new')}`,
        status: 'online',
        about: 'Added contact',
      };
      const existing: User[] = JSON.parse(localStorage.getItem('local_contacts') || '[]');
      if (!existing.some((c) => c._id === target._id)) {
        existing.push(target);
        localStorage.setItem('local_contacts', JSON.stringify(existing));
      }
      return target;
    }
  },

  // Messages
  async getMessages(contactId: string): Promise<Message[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/messages/${contactId}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load messages');
      const data = await res.json();
      return data.messages;
    } catch {
      const localKey = `messages_${contactId}`;
      const saved = localStorage.getItem(localKey);
      if (saved) return JSON.parse(saved);
      return [
        {
          _id: generateObjectId(),
          sender: contactId,
          recipient: generateObjectId(),
          content: 'Hey! Nice to connect with you on NovaChat. How are you doing today?',
          read: true,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ];
    }
  },

  async sendMessage(recipientId: string, content: string): Promise<Message> {
    try {
      const res = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ recipientId, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send');
      return data.message;
    } catch {
      const newMsg: Message = {
        _id: generateObjectId(),
        sender: generateObjectId(),
        recipient: recipientId,
        content,
        read: true,
        createdAt: new Date().toISOString(),
      };
      const localKey = `messages_${recipientId}`;
      const current = JSON.parse(localStorage.getItem(localKey) || '[]');
      current.push(newMsg);
      localStorage.setItem(localKey, JSON.stringify(current));
      return newMsg;
    }
  },
};
