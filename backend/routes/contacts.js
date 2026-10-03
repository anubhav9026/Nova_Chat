const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all contact routes
router.use(authMiddleware);

// @route   GET /api/contacts
// @desc    Get user's contact list
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('contacts', 'name email avatar status about updatedAt');

    return res.json({ contacts: user.contacts || [] });
  } catch (error) {
    console.error('Fetch contacts error:', error);
    return res.status(500).json({ message: 'Error retrieving contacts.' });
  }
});

// @route   GET /api/contacts/search?q=...
// @desc    Search for users to add as contacts
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query.trim()) {
      // Return suggestions (other users excluding current user)
      const suggestions = await User.find({ _id: { $ne: req.user._id } })
        .select('name email avatar status about')
        .limit(10);
      return res.json({ users: suggestions });
    }

    const regex = new RegExp(query, 'i');
    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [{ name: regex }, { email: regex }],
    })
      .select('name email avatar status about')
      .limit(15);

    return res.json({ users });
  } catch (error) {
    console.error('Search contacts error:', error);
    return res.status(500).json({ message: 'Error searching for users.' });
  }
});

// @route   POST /api/contacts/add
// @desc    Add a contact by userId or email
router.post('/add', async (req, res) => {
  try {
    const { contactId, email } = req.body;

    let targetUser = null;
    if (contactId) {
      targetUser = await User.findById(contactId);
    } else if (email) {
      targetUser = await User.findOne({ email: email.toLowerCase() });
    }

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot add yourself as a contact.' });
    }

    const currentUser = await User.findById(req.user._id);

    // Check if already in contacts
    const alreadyContact = currentUser.contacts.some(
      (c) => c.toString() === targetUser._id.toString()
    );

    if (alreadyContact) {
      return res.status(400).json({ message: 'User is already in your contacts list.' });
    }

    currentUser.contacts.push(targetUser._id);
    await currentUser.save();

    // Mutual addition for convenience in chat apps
    if (!targetUser.contacts.includes(currentUser._id)) {
      targetUser.contacts.push(currentUser._id);
      await targetUser.save();
    }

    const updatedUser = await User.findById(req.user._id)
      .populate('contacts', 'name email avatar status about');

    return res.status(200).json({
      message: `${targetUser.name} added to contacts!`,
      contact: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        avatar: targetUser.avatar,
        status: targetUser.status,
        about: targetUser.about,
      },
      contacts: updatedUser.contacts,
    });
  } catch (error) {
    console.error('Add contact error:', error);
    return res.status(500).json({ message: 'Error adding contact.' });
  }
});

// @route   DELETE /api/contacts/:contactId
// @desc    Remove a contact
router.delete('/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;

    const user = await User.findById(req.user._id);
    user.contacts = user.contacts.filter((c) => c.toString() !== contactId);
    await user.save();

    return res.json({ message: 'Contact removed successfully.', contactId });
  } catch (error) {
    console.error('Remove contact error:', error);
    return res.status(500).json({ message: 'Error removing contact.' });
  }
});

module.exports = router;
