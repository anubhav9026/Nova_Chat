export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  avatar: string;
  status?: 'online' | 'offline' | 'away';
  about?: string;
  contacts?: (User | string)[];
}

export interface Message {
  _id: string;
  sender: User | string;
  recipient: User | string;
  content: string;
  read: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthResponse {
  message?: string;
  token: string;
  user: User;
}
