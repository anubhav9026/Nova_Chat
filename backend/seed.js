require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Message = require('./models/Message');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mern_chat';

const seedDatabase = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
    console.log('Connected.');

    // Clear existing data
    await User.deleteMany({});
    await Message.deleteMany({});
    console.log('Cleared existing users and messages.');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    const demoUsers = [
      {
        name: 'Sarah Connor',
        email: 'sarah@example.com',
        password: passwordHash,
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        about: 'Building resilient web systems 🚀',
        status: 'online',
      },
      {
        name: 'Alex Rivera',
        email: 'alex@example.com',
        password: passwordHash,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        about: 'Fullstack developer & coffee lover ☕',
        status: 'online',
      },
      {
        name: 'Elena Rostova',
        email: 'elena@example.com',
        password: passwordHash,
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
        about: 'UI/UX Designer & animator ✨',
        status: 'away',
      },
      {
        name: 'Marcus Vance',
        email: 'marcus@example.com',
        password: passwordHash,
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
        about: 'Cloud architect & DevOps enthusiast ☁️',
        status: 'offline',
      },
    ];

    const createdUsers = await User.insertMany(demoUsers);
    console.log(`Created ${createdUsers.length} sample users.`);

    // Connect them as contacts
    const [sarah, alex, elena, marcus] = createdUsers;

    sarah.contacts = [alex._id, elena._id];
    alex.contacts = [sarah._id, elena._id, marcus._id];
    elena.contacts = [sarah._id, alex._id];
    marcus.contacts = [alex._id];

    await sarah.save();
    await alex.save();
    await elena.save();
    await marcus.save();

    // Add some sample messages between Sarah and Alex
    await Message.create([
      {
        sender: alex._id,
        recipient: sarah._id,
        content: 'Hey Sarah! Did you check out the new chat interface?',
        read: true,
      },
      {
        sender: sarah._id,
        recipient: alex._id,
        content: 'Yes Alex, it looks ultra modern! Love the real-time messages and contact list.',
        read: true,
      },
      {
        sender: alex._id,
        recipient: sarah._id,
        content: 'Awesome! We can add more contacts and chat anytime.',
        read: true,
      },
    ]);

    console.log('Sample conversation created successfully.');
    console.log('\n--- Test Accounts (password: password123) ---');
    createdUsers.forEach((u) => console.log(`• ${u.name}: ${u.email}`));
    console.log('--------------------------------------------\n');

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();
