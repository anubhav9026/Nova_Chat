import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, MoreVertical, Phone, Video, Smile, Shield } from 'lucide-react';
import type { User, Message } from '../types';

interface ChatWindowProps {
  currentUser: User | null;
  activeContact: User;
  messages: Message[];
  isTyping: boolean;
  onSendMessage: (content: string) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  onBack: () => void;
}

const QUICK_EMOJIS = ['👋', '🔥', '🚀', '❤️', '🎉', '👍', '😊', '💯'];

export const ChatWindow: React.FC<ChatWindowProps> = ({
  currentUser,
  activeContact,
  messages,
  isTyping,
  onSendMessage,
  onTyping,
  onStopTyping,
  onBack,
}) => {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    onTyping();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping();
    }, 1500);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    onSendMessage(inputText.trim());
    setInputText('');
    setShowEmojiPicker(false);
    onStopTyping();
  };

  const addEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="chat-conversation">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="chat-header-user">
          <button className="back-btn" onClick={onBack}>
            <ArrowLeft size={20} />
          </button>
          <div className="avatar-wrapper">
            <img src={activeContact.avatar} alt={activeContact.name} className="avatar-img" />
            <span
              className={`status-indicator ${
                activeContact.status === 'online'
                  ? 'status-online'
                  : activeContact.status === 'away'
                  ? 'status-away'
                  : 'status-offline'
              }`}
            />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
              {activeContact.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {isTyping ? (
                <span style={{ color: '#818cf8', fontWeight: 600 }}>typing...</span>
              ) : (
                activeContact.about || activeContact.email
              )}
            </div>
          </div>
        </div>

        <div className="chat-header-actions">
          <button className="icon-action-btn" title="End-to-end encrypted">
            <Shield size={18} color="#10b981" />
          </button>
          <button className="icon-action-btn" title="Voice call">
            <Phone size={18} />
          </button>
          <button className="icon-action-btn" title="Video call">
            <Video size={18} />
          </button>
          <button className="icon-action-btn" title="More options">
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="messages-container">
        <div style={{ textAlign: 'center', margin: '16px 0', opacity: 0.6 }}>
          <span
            style={{
              fontSize: '0.75rem',
              padding: '4px 12px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
            }}
          >
            🔒 Messages are secured with real-time websocket protocols
          </span>
        </div>

        {messages.map((msg) => {
          // Check if current user is the sender
          const isSender =
            msg.sender === currentUser?._id ||
            (typeof msg.sender === 'object' && msg.sender?._id === currentUser?._id) ||
            msg.sender === 'me';

          return (
            <div
              key={msg._id}
              className={`message-bubble ${isSender ? 'outgoing' : 'incoming'}`}
            >
              <div className="bubble-content">{msg.content}</div>
              <div className="bubble-meta">
                <span>{formatTime(msg.createdAt)}</span>
                {isSender && <span style={{ color: '#818cf8' }}>✓✓</span>}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="typing-bar">
            <span>{activeContact.name} is typing</span>
            <div className="typing-dots">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Picker Bar */}
      {showEmojiPicker && (
        <div
          style={{
            padding: '8px 24px',
            background: 'rgba(17, 24, 39, 0.95)',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => addEmoji(emoji)}
              style={{ fontSize: '1.25rem', padding: '4px', borderRadius: '4px' }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <form className="chat-input-area" onSubmit={handleSend}>
        <button
          type="button"
          className="icon-action-btn"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          title="Add emoji"
        >
          <Smile size={20} />
        </button>

        <div className="input-container">
          <input
            type="text"
            className="chat-input"
            placeholder={`Message ${activeContact.name}...`}
            value={inputText}
            onChange={handleInputChange}
          />
        </div>

        <button type="submit" className="btn-send" title="Send message">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};
