import React, { useState, useEffect } from 'react';
import { X, Search, UserCheck, Plus, Sparkles, Mail } from 'lucide-react';
import { api } from '../services/api';
import type { User } from '../types';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentContacts: User[];
  onContactAdded: (contact: User) => void;
}

export const AddContactModal: React.FC<AddContactModalProps> = ({
  isOpen,
  onClose,
  currentContacts,
  onContactAdded,
}) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [directEmail, setDirectEmail] = useState('');
  const [actionMessage, setActionMessage] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadInitialSuggestions();
    }
  }, [isOpen]);

  const loadInitialSuggestions = async () => {
    setLoading(true);
    try {
      const users = await api.searchUsers('');
      setSearchResults(users);
    } catch {
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (val: string) => {
    setQuery(val);
    setLoading(true);
    try {
      const users = await api.searchUsers(val);
      setSearchResults(users);
    } catch {
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (user: User) => {
    try {
      setActionMessage(null);
      const added = await api.addContact(user._id, user.email);
      onContactAdded(added);
      setActionMessage({ text: `${user.name} added to your contacts!` });
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Failed to add contact', error: true });
    }
  };

  const handleAddByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directEmail.trim()) return;

    try {
      setActionMessage(null);
      const added = await api.addContact('', directEmail.trim());
      onContactAdded(added);
      setActionMessage({ text: `Contact ${directEmail} added!` });
      setDirectEmail('');
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Could not add email', error: true });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="#6366f1" />
            <h3 className="modal-title">Add New Contact</h3>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {actionMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '16px',
              background: actionMessage.error ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              border: `1px solid ${actionMessage.error ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
              color: actionMessage.error ? '#fca5a5' : '#6ee7b7',
            }}
          >
            {actionMessage.text}
          </div>
        )}

        {/* Quick add by direct email */}
        <form onSubmit={handleAddByEmail} style={{ marginBottom: '20px' }}>
          <label className="auth-label">Invite or add by Email</label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Mail
                size={16}
                style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-dim)' }}
              />
              <input
                type="email"
                className="auth-input"
                style={{ paddingLeft: '36px' }}
                placeholder="friend@company.com"
                value={directEmail}
                onChange={(e) => setDirectEmail(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary" style={{ padding: '0 20px' }}>
              Add
            </button>
          </div>
        </form>

        <div className="oauth-divider">EXPLORE & DISCOVER PEOPLE</div>

        {/* Search Input */}
        <div className="search-input-wrapper" style={{ marginBottom: '14px' }}>
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by name or email..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {/* User Search Results */}
        <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)' }}>
              Searching users...
            </div>
          ) : searchResults.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)' }}>
              No users found matching "{query}"
            </div>
          ) : (
            searchResults.map((user) => {
              const isAlreadyContact = currentContacts.some((c) => c._id === user._id || c.email === user.email);

              return (
                <div
                  key={user._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img
                      src={user.avatar}
                      alt={user.name}
                      style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
                    </div>
                  </div>

                  {isAlreadyContact ? (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.78rem',
                        color: '#34d399',
                        padding: '6px 12px',
                        background: 'rgba(52, 211, 153, 0.1)',
                        borderRadius: '999px',
                      }}
                    >
                      <UserCheck size={14} /> Added
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn-add-contact"
                      onClick={() => handleAdd(user)}
                    >
                      <Plus size={14} /> Add
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
