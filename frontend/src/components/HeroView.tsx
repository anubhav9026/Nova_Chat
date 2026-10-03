import React from 'react';
import { MessageSquare, Users, Zap, Shield, Sparkles, UserPlus } from 'lucide-react';

interface HeroViewProps {
  onStartChat: () => void;
  onOpenAddContact: () => void;
  isAuthenticated: boolean;
  onOpenAuth: () => void;
}

export const HeroView: React.FC<HeroViewProps> = ({
  onStartChat,
  onOpenAddContact,
  isAuthenticated,
  onOpenAuth,
}) => {
  return (
    <div className="hero-view">
      <div className="hero-content">
        <div className="hero-pill">
          <Sparkles size={16} />
          <span>Fullstack MERN Real-time Web Chat</span>
        </div>

        <h1 className="hero-title">
          Connect, collaborate, and <span>chat instantly</span>.
        </h1>

        <p className="hero-subtitle">
          Experience ultra-fast, real-time messaging powered by MongoDB, Express, React, and
          Node.js. Add contacts in seconds and start conversation threads with zero latency.
        </p>

        <div className="hero-actions">
          {/* The Simple Chat Button requested by the user */}
          <button
            id="start-chat-main-btn"
            className="btn-primary"
            onClick={isAuthenticated ? onStartChat : onOpenAuth}
            style={{ fontSize: '1.1rem', padding: '16px 36px' }}
          >
            <MessageSquare size={22} />
            Start Chatting
          </button>

          <button
            className="btn-secondary"
            onClick={isAuthenticated ? onOpenAddContact : onOpenAuth}
            style={{ fontSize: '1.05rem', padding: '16px 28px' }}
          >
            <UserPlus size={20} />
            Add Contacts
          </button>
        </div>

        {/* Feature Cards Showcase */}
        <div
          style={{
            marginTop: '56px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            textAlign: 'left',
          }}
        >
          <div
            className="glass-panel"
            style={{ padding: '20px', borderRadius: '16px' }}
          >
            <Zap size={24} color="#6366f1" style={{ marginBottom: '10px' }} />
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '4px' }}>
              Real-time WebSockets
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Instant live delivery with Socket.IO & typing indicators.
            </p>
          </div>

          <div
            className="glass-panel"
            style={{ padding: '20px', borderRadius: '16px' }}
          >
            <Users size={24} color="#a855f7" style={{ marginBottom: '10px' }} />
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '4px' }}>
              Manage Contacts
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Search directory by email or name to build your network.
            </p>
          </div>

          <div
            className="glass-panel"
            style={{ padding: '20px', borderRadius: '16px' }}
          >
            <Shield size={24} color="#10b981" style={{ marginBottom: '10px' }} />
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '4px' }}>
              MERN Stack
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Secure JWT authentication with MongoDB persistence.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
