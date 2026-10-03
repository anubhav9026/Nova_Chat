import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  LogOut,
  UserPlus,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import type { User, Message } from './types';
import { api, MOCK_USERS } from './services/api';
import { socketService } from './services/socket';
import { AI_BOT_USER, isAIBot, sendToWebhook, createAIMessage, createUserMessageToAI } from './services/webhook';
import { AuthModal } from './components/AuthModal';
import { AddContactModal } from './components/AddContactModal';
import { ContactSidebar } from './components/ContactSidebar';
import { ChatWindow } from './components/ChatWindow';
import { HeroView } from './components/HeroView';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [contacts, setContacts] = useState<User[]>([]);
  const [activeContact, setActiveContact] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isAIThinking, setIsAIThinking] = useState<boolean>(false);

  // View state: 'hero' or 'chat'
  const [viewMode, setViewMode] = useState<'hero' | 'chat'>('hero');

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);

  // Check saved session on load
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('mern_chat_token');
      if (savedToken) {
        const user = await api.getMe();
        if (user) {
          setCurrentUser(user);
        } else {
          // If token was demo or server offline, use default user
          setCurrentUser(MOCK_USERS[0]);
        }
      } else {
        // Auto initialize default demo session for immediate testability
        setCurrentUser(MOCK_USERS[0]);
      }
    };
    initAuth();
  }, []);

  // Load contacts when user logs in
  const loadContacts = useCallback(async () => {
    try {
      const list = await api.getContacts();
      // Prepend AI Bot as the first contact
      const withBot = [AI_BOT_USER as User, ...list.filter(c => c._id !== AI_BOT_USER._id)];
      setContacts(withBot);
      if (withBot.length > 0 && !activeContact) {
        setActiveContact(withBot[0]);
      }
    } catch {
      const fallback = [AI_BOT_USER as User, ...MOCK_USERS.slice(1)];
      setContacts(fallback);
      if (!activeContact) setActiveContact(fallback[0]);
    }
  }, [activeContact]);

  useEffect(() => {
    if (currentUser) {
      loadContacts();
      socketService.init(currentUser._id);

      // Listen for incoming messages
      socketService.onPrivateMessage((newMsg: Message) => {
        setMessages((prev) => [...prev, newMsg]);
      });

      socketService.onMessageSent((sentMsg: Message) => {
        setMessages((prev) => {
          if (prev.some((m) => m._id === sentMsg._id)) return prev;
          return [...prev, sentMsg];
        });
      });

      // Typing events
      socketService.onTyping(({ senderId }) => {
        if (activeContact && senderId === activeContact._id) {
          setIsTyping(true);
        }
      });

      socketService.onStopTyping(({ senderId }) => {
        if (activeContact && senderId === activeContact._id) {
          setIsTyping(false);
        }
      });

      // Presence updates
      socketService.onUserStatusChanged(({ userId, status }) => {
        setContacts((prev) =>
          prev.map((c) => (c._id === userId ? { ...c, status: status as any } : c))
        );
      });
    }

    return () => {
      socketService.disconnect();
    };
  }, [currentUser, activeContact, loadContacts]);

  // Load conversation messages when active contact changes
  useEffect(() => {
    if (activeContact) {
      if (isAIBot(activeContact._id)) {
        const saved = localStorage.getItem('messages_nova_ai');
        if (saved) {
          try {
            setMessages(JSON.parse(saved));
            return;
          } catch {}
        }
        const welcome = [
          createAIMessage(
            'Hello! I am Nova AI, your smart assistant powered by n8n. How can I help you today?',
            currentUser?._id || 'user'
          ) as Message,
        ];
        setMessages(welcome);
        localStorage.setItem('messages_nova_ai', JSON.stringify(welcome));
        return;
      }

      const fetchHistory = async () => {
        const history = await api.getMessages(activeContact._id);
        setMessages(history);
      };
      fetchHistory();
    }
  }, [activeContact, currentUser]);

  const handleSendMessage = async (content: string) => {
    if (!activeContact || !currentUser) return;

    // If chatting with AI Bot, route to n8n webhook
    if (isAIBot(activeContact._id)) {
      const userMsg = createUserMessageToAI(content, currentUser._id) as Message;
      const currentList = [...messages, userMsg];
      setMessages(currentList);
      localStorage.setItem('messages_nova_ai', JSON.stringify(currentList));
      setIsAIThinking(true);

      try {
        const aiResponse = await sendToWebhook(content, currentUser._id);
        const aiMsg = createAIMessage(aiResponse, currentUser._id) as Message;
        setMessages((prev) => {
          const updated = [...prev, aiMsg];
          localStorage.setItem('messages_nova_ai', JSON.stringify(updated));
          return updated;
        });
      } catch (err: any) {
        const errorMsg = createAIMessage(
          `⚠️ ${err.message || 'Failed to get AI response. Please check your n8n webhook URL.'}`,
          currentUser._id
        ) as Message;
        setMessages((prev) => {
          const updated = [...prev, errorMsg];
          localStorage.setItem('messages_nova_ai', JSON.stringify(updated));
          return updated;
        });
      } finally {
        setIsAIThinking(false);
      }
      return;
    }

    // Send via socket if active, or via REST API
    const socketSuccess = socketService.emitMessage(currentUser._id, activeContact._id, content);
    if (!socketSuccess) {
      const sent = await api.sendMessage(activeContact._id, content);
      setMessages((prev) => [...prev, sent]);
    }
  };

  const handleStartTyping = () => {
    if (currentUser && activeContact) {
      socketService.emitTyping(currentUser._id, activeContact._id);
    }
  };

  const handleStopTyping = () => {
    if (currentUser && activeContact) {
      socketService.emitStopTyping(currentUser._id, activeContact._id);
    }
  };

  const handleContactAdded = (newContact: User) => {
    setContacts((prev) => {
      if (prev.some((c) => c._id === newContact._id)) return prev;
      return [newContact, ...prev];
    });
    setActiveContact(newContact);
    setViewMode('chat');
  };

  const handleLogout = () => {
    localStorage.removeItem('mern_chat_token');
    setCurrentUser(null);
    setActiveContact(null);
    setMessages([]);
    setViewMode('hero');
    socketService.disconnect();
  };

  return (
    <div className="app-container">
      {/* Top Navigation Bar */}
      <header className="app-header">
        <div className="brand-wrapper">
          <div className="brand-logo-icon">
            <MessageSquare size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="brand-title">NovaChat</span>
              <span className="brand-badge">MERN 2026</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {currentUser ? (
            <>
              <div className="header-user-badge">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="header-avatar"
                />
                <div className="header-user-info">
                  <span className="header-user-name">{currentUser.name}</span>
                  <span className="header-user-email">{currentUser.email}</span>
                </div>
              </div>

              {viewMode === 'hero' ? (
                <button
                  id="header-start-chat-btn"
                  className="btn-primary"
                  style={{ padding: '8px 18px', fontSize: '0.88rem' }}
                  onClick={() => setViewMode('chat')}
                >
                  <MessageSquare size={16} /> Open Chat
                </button>
              ) : (
                <button
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  onClick={() => setViewMode('hero')}
                >
                  Overview
                </button>
              )}

              <button
                className="icon-action-btn"
                title="Sign out"
                onClick={handleLogout}
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <button
              className="btn-primary"
              style={{ padding: '10px 22px', fontSize: '0.9rem' }}
              onClick={() => setIsAuthOpen(true)}
            >
              Sign In / Register
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      {viewMode === 'hero' ? (
        <>
          <HeroView
            onStartChat={() => setViewMode('chat')}
            onOpenAddContact={() => {
              setViewMode('chat');
              setIsAddContactOpen(true);
            }}
            isAuthenticated={!!currentUser}
            onOpenAuth={() => setIsAuthOpen(true)}
          />

          {/* Simple Chat Button floating in the corner for instant 1-click access */}
          <button
            id="floating-simple-chat-button"
            className="floating-chat-trigger"
            onClick={() => {
              if (!currentUser) {
                setIsAuthOpen(true);
              } else {
                setViewMode('chat');
              }
            }}
          >
            <MessageSquare size={20} />
            <span>Chat Now</span>
            <ArrowRight size={16} />
          </button>
        </>
      ) : (
        /* Full Chat Dashboard Workspace */
        <main className="chat-workspace">
          <ContactSidebar
            contacts={contacts}
            activeContact={activeContact}
            onSelectContact={(contact) => setActiveContact(contact)}
            onOpenAddModal={() => setIsAddContactOpen(true)}
          />

          {activeContact ? (
            <ChatWindow
              currentUser={currentUser}
              activeContact={activeContact}
              messages={messages}
              isTyping={isTyping || isAIThinking}
              onSendMessage={handleSendMessage}
              onTyping={handleStartTyping}
              onStopTyping={handleStopTyping}
              onBack={() => setActiveContact(null)}
            />
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                gap: '16px',
                padding: '20px',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(99, 102, 241, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#818cf8',
                }}
              >
                <Sparkles size={32} />
              </div>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: 600 }}>
                Select a contact to begin
              </h3>
              <p style={{ maxWidth: '360px', textAlign: 'center', fontSize: '0.9rem' }}>
                Pick someone from your contacts sidebar or click below to discover and add new friends.
              </p>
              <button
                className="btn-primary"
                onClick={() => setIsAddContactOpen(true)}
              >
                <UserPlus size={18} /> Add New Contact
              </button>
            </div>
          )}
        </main>
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          setViewMode('chat');
        }}
      />

      {/* Add Contact Modal */}
      <AddContactModal
        isOpen={isAddContactOpen}
        onClose={() => setIsAddContactOpen(false)}
        currentContacts={contacts}
        onContactAdded={handleContactAdded}
      />
    </div>
  );
}

export default App;
