/**
 * @file conversationRoutes.js
 * @description API Routes for Team Chat Conversations, Channels & Real-time Messages.
 */

const express = require('express');
const router = express.Router();
const {
  getConversations,
  getAttachmentMedia,
  createConversation,
  sendMessage,
  deleteMessage,
  reactToMessage,
  markAsRead,
  syncBatch
} = require('../controllers/conversationController');

router.get('/', getConversations);
router.get('/:id/attachments/:attId', getAttachmentMedia);
router.post('/', createConversation);
router.post('/sync-batch', syncBatch);
router.post('/:id/messages', sendMessage);
router.delete('/:id/messages/:messageId', deleteMessage);
router.post('/:id/messages/:messageId/react', reactToMessage);
router.put('/:id/read', markAsRead);

module.exports = router;

