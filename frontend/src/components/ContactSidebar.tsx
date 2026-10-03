import React, { useState } from 'react';
import { Search, UserPlus, Users, MessageSquare } from 'lucide-react';
import type { User } from '../types';

interface ContactSidebarProps {
  contacts: User[];
  activeContact: User | null;
  onSelectContact: (contact: User) => void;
  onOpenAddModal: () => void;
  isMobileHidden?: boolean;
}

export const ContactSidebar: React.FC<ContactSidebarProps> = ({
  contacts,
  activeContact,
  onSelectContact,
  onOpenAddModal,
  isMobileHidden,
}) => {
  const [filterQuery, setFilterQuery] = useState('');

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <aside className={`contacts-sidebar ${isMobileHidden ? 'hidden-mobile' : ''}`}>
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={20} color="#818cf8" />
          <h2 className="sidebar-title">Contacts</h2>
          <span
            style={{
              fontSize: '0.75rem',
              padding: '2px 8px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-muted)',
            }}
          >
            {contacts.length}
          </span>
        </div>
        <button className="btn-add-contact" onClick={onOpenAddModal}>
          <UserPlus size={15} /> Add
        </button>
      </div>

      <div className="sidebar-search">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search contacts..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="contacts-list">
        {filteredContacts.length === 0 ? (
          <div
            style={{
              padding: '30px 20px',
              textAlign: 'center',
              color: 'var(--text-dim)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <MessageSquare size={32} opacity={0.4} />
            <p style={{ fontSize: '0.88rem' }}>No contacts found.</p>
            <button className="btn-add-contact" onClick={onOpenAddModal}>
              <UserPlus size={14} /> Add your first contact
            </button>
          </div>
        ) : (
          filteredContacts.map((contact) => {
            const isActive = activeContact?._id === contact._id;
            const statusClass =
              contact.status === 'online'
                ? 'status-online'
                : contact.status === 'away'
                ? 'status-away'
                : 'status-offline';

            return (
              <div
                key={contact._id}
                className={`contact-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectContact(contact)}
              >
                <div className="avatar-wrapper">
                  <img src={contact.avatar} alt={contact.name} className="avatar-img" />
                  <span className={`status-indicator ${statusClass}`} />
                </div>
                <div className="contact-details">
                  <div className="contact-name-row">
                    <span className="contact-name">{contact.name}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'capitalize' }}>
                      {contact.status || 'offline'}
                    </span>
                  </div>
                  <div className="contact-preview">
                    {contact.about || contact.email}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
