/**
 * @file conversationRoutes.js
 * @description API Routes for Team Chat Conversations, Channels & Real-time Messages.
 */

const express = require('express');
const router = express.Router();
const {
  getConversations,
  createConversation,
  sendMessage
} = require('../controllers/conversationController');

router.get('/', getConversations);
router.post('/', createConversation);
router.post('/:id/messages', sendMessage);

module.exports = router;

