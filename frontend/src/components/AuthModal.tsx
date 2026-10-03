import React, { useState } from 'react';
import { X, LogIn, UserPlus, Sparkles } from 'lucide-react';
import { api, MOCK_USERS } from '../services/api';
import type { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User, token: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) throw new Error('Name is required');
        const data = await api.register(name, email, password);
        localStorage.setItem('mern_chat_token', data.token);
        onSuccess(data.user, data.token);
      } else {
        const data = await api.login(email, password);
        localStorage.setItem('mern_chat_token', data.token);
        onSuccess(data.user, data.token);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (user: User) => {
    setEmail(user.email);
    setPassword('password123');
    setLoading(true);
    try {
      const data = await api.login(user.email, 'password123');
      localStorage.setItem('mern_chat_token', data.token);
      onSuccess(data.user, data.token);
      onClose();
    } catch {
      onSuccess(user, 'demo-token');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = (provider: 'google' | 'github') => {
    window.location.href = `http://localhost:5000/api/auth/${provider}`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="#8b5cf6" />
            <h3 className="modal-title">{isRegister ? 'Create an Account' : 'Welcome to NovaChat'}</h3>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="auth-input-group">
              <label className="auth-label">Full Name</label>
              <input
                type="text"
                className="auth-input"
                placeholder="Sarah Connor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="auth-input-group">
            <label className="auth-label">Email Address</label>
            <input
              type="email"
              className="auth-input"
              placeholder="sarah@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-input-group">
            <label className="auth-label">Password</label>
            <input
              type="password"
              className="auth-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}
            disabled={loading}
          >
            {loading ? 'Processing...' : isRegister ? (
              <>
                <UserPlus size={18} /> Register Now
              </>
            ) : (
              <>
                <LogIn size={18} /> Sign In
              </>
            )}
          </button>
        </form>

        <div className="oauth-divider">OR CONTINUE WITH</div>

        <div className="oauth-buttons">
          <button
            type="button"
            className="btn-secondary"
            style={{ justifyContent: 'center', padding: '10px' }}
            onClick={() => handleOAuth('google')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5.1 3.7-8.9z"/>
              <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.1-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1c0 2.8.7 5.4 1.9 7.8l3.7-2.9z"/>
              <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 17c1.8 3.7 5.6 6.5 10.1 6.5z"/>
            </svg>
            Google
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={{ justifyContent: 'center', padding: '10px' }}
            onClick={() => handleOAuth('github')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            GitHub
          </button>
        </div>

        {/* Quick Demo Selector for immediate 1-click test */}
        <div className="quick-demo-accounts">
          <div className="quick-demo-title">⚡ Instant Test Logins</div>
          <div className="demo-chips">
            {MOCK_USERS.map((user) => (
              <button
                key={user._id}
                type="button"
                className="demo-chip"
                onClick={() => handleQuickLogin(user)}
              >
                <img
                  src={user.avatar}
                  alt={user.name}
                  style={{ width: 18, height: 18, borderRadius: '50%' }}
                />
                {user.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.85rem' }}>
          {isRegister ? (
            <span style={{ color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <button
                type="button"
                style={{ color: '#818cf8', fontWeight: 600 }}
                onClick={() => setIsRegister(false)}
              >
                Sign In
              </button>
            </span>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>
              Don't have an account?{' '}
              <button
                type="button"
                style={{ color: '#818cf8', fontWeight: 600 }}
                onClick={() => setIsRegister(true)}
              >
                Create one
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
