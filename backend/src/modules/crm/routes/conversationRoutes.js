/**
 * @file conversationRoutes.js
 * @description API Routes for Team Chat Conversations, Channels & Real-time Messages.
 */

const express = require('express');
const router = express.Router();
const {
  getConversations,
  createConversation,
  sendMessage,
  markAsRead,
  syncBatch
} = require('../controllers/conversationController');

router.get('/', getConversations);
router.post('/', createConversation);
router.post('/sync-batch', syncBatch);
router.post('/:id/messages', sendMessage);
router.put('/:id/read', markAsRead);

module.exports = router;

