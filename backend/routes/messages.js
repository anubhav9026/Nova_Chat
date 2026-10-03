const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// @route   GET /api/messages/:contactId
// @desc    Get message history with a contact
router.get('/:contactId', async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const contactId = req.params.contactId;

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, recipient: contactId },
        { sender: contactId, recipient: currentUserId },
      ],
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'name avatar')
      .populate('recipient', 'name avatar');

    // Mark unread messages from this contact as read
    await Message.updateMany(
      { sender: contactId, recipient: currentUserId, read: false },
      { $set: { read: true } }
    );

    return res.json({ messages });
  } catch (error) {
    console.error('Fetch messages error:', error);
    return res.status(500).json({ message: 'Error retrieving messages.' });
  }
});

// @route   POST /api/messages
// @desc    Send a message via HTTP endpoint (fallback or alternative to pure socket)
router.post('/', async (req, res) => {
  try {
    const { recipientId, content } = req.body;

    if (!recipientId || !content || !content.trim()) {
      return res.status(400).json({ message: 'Recipient and content are required.' });
    }

    const message = await Message.create({
      sender: req.user._id,
      recipient: recipientId,
      content: content.trim(),
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name avatar')
      .populate('recipient', 'name avatar');

    // Broadcast via Socket.IO if instance attached to app
    const io = req.app.get('io');
    if (io) {
      io.to(recipientId.toString()).emit('private_message', populatedMessage);
      io.to(req.user._id.toString()).emit('message_sent', populatedMessage);
    }

    return res.status(201).json({ message: populatedMessage });
  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({ message: 'Error sending message.' });
  }
});

// @route   PUT /api/messages/read/:contactId
// @desc    Mark messages from contact as read
router.put('/read/:contactId', async (req, res) => {
  try {
    await Message.updateMany(
      { sender: req.params.contactId, recipient: req.user._id, read: false },
      { $set: { read: true } }
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    return res.status(500).json({ message: 'Error marking messages as read.' });
  }
});

module.exports = router;
