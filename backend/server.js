// server.js - Entry point for the MERN chat backend
require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const passport = require('passport');
const socketIO = require('socket.io');

const User = require('./models/User');
const Message = require('./models/Message');

// Import route modules
const authRoutes = require('./routes/auth');
const contactRoutes = require('./routes/contacts');
const messageRoutes = require('./routes/messages');
const aiRoutes = require('./routes/ai');

const app = express();
const server = http.createServer(app);

// Socket.IO configuration with CORS
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// ----- Passport OAuth Strategies (Configured only if valid keys exist) -----
if (
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  !process.env.GOOGLE_CLIENT_ID.includes('your_google')
) {
  const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ googleId: profile.id });
          if (!user) {
            user = await User.create({
              name: profile.displayName,
              email: profile.emails?.[0]?.value || `${profile.id}@google.com`,
              googleId: profile.id,
              avatar: profile.photos?.[0]?.value || undefined,
            });
          }
          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
}

if (
  process.env.GITHUB_CLIENT_ID &&
  process.env.GITHUB_CLIENT_SECRET &&
  !process.env.GITHUB_CLIENT_ID.includes('your_github')
) {
  const { Strategy: GitHubStrategy } = require('passport-github2');
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: '/api/auth/github/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ githubId: profile.id });
          if (!user) {
            user = await User.create({
              name: profile.displayName || profile.username,
              email: profile.emails?.[0]?.value || `${profile.username}@github.com`,
              githubId: profile.id,
              avatar: profile.photos?.[0]?.value || undefined,
            });
          }
          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
}

// ----- Health check & API documentation route -----
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'MERN Chat Server is running smoothly',
    timestamp: new Date().toISOString(),
  });
});

// ----- Routes -----
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/ai', aiRoutes);

// ----- Socket.IO Real-time Events -----
// Track online users: { userId: Set of socketIds }
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // User joins room using their MongoDB User ID
  socket.on('join', async ({ userId }) => {
    if (!userId) return;

    socket.userId = userId;
    socket.join(userId);

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    try {
      await User.findByIdAndUpdate(userId, { status: 'online' });
    } catch (e) {
      console.error('Error updating user status:', e.message);
    }

    // Broadcast online status to all connected users
    io.emit('user_status_changed', { userId, status: 'online' });
    console.log(`[Socket] User ${userId} joined room. Active sessions: ${onlineUsers.get(userId).size}`);
  });

  // Sending a real-time message
  socket.on('private_message', async ({ senderId, recipientId, content }) => {
    try {
      if (!senderId || !recipientId || !content || !content.trim()) return;

      const message = await Message.create({
        sender: senderId,
        recipient: recipientId,
        content: content.trim(),
      });

      const populated = await Message.findById(message._id)
        .populate('sender', 'name avatar email')
        .populate('recipient', 'name avatar email');

      // Send to recipient's room
      io.to(recipientId).emit('private_message', populated);
      // Echo back to sender's room
      io.to(senderId).emit('message_sent', populated);
    } catch (err) {
      console.error('[Socket] Message creation error:', err.message);
      socket.emit('error', { message: 'Failed to send message.' });
    }
  });

  // Typing indicators
  socket.on('typing', ({ senderId, recipientId }) => {
    io.to(recipientId).emit('typing', { senderId });
  });

  socket.on('stop_typing', ({ senderId, recipientId }) => {
    io.to(recipientId).emit('stop_typing', { senderId });
  });

  // Disconnect handling
  socket.on('disconnect', async () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
    const userId = socket.userId;
    if (userId && onlineUsers.has(userId)) {
      const userSockets = onlineUsers.get(userId);
      userSockets.delete(socket.id);

      if (userSockets.size === 0) {
        onlineUsers.delete(userId);
        try {
          await User.findByIdAndUpdate(userId, { status: 'offline' });
        } catch (e) {
          console.error('Status update failed:', e.message);
        }
        io.emit('user_status_changed', { userId, status: 'offline' });
      }
    }
  });
});

// ----- Database Connection & Server Start -----
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mern_chat';

mongoose
  .connect(MONGODB_URI, { serverSelectionTimeoutMS: 3000 })
  .then(() => {
    console.log(`[MongoDB] Connected successfully to ${MONGODB_URI}`);
    server.listen(PORT, () => {
      console.log(`[Server] MERN Chat Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[MongoDB] Connection error:', err.message);
    console.log('[Server] Starting HTTP server anyway for socket/demo API fallback...');
    server.listen(PORT, () => {
      console.log(`[Server] MERN Chat Server running on port ${PORT} (DB offline mode)`);
    });
  });
