const express = require('express');
const router = express.Router();
const {
  getTickets,
  createTicket,
  updateTicket,
  addComment,
  deleteTicket
} = require('../controllers/ticketController');
const { authenticateUser } = require('../../../shared/middleware/authMiddleware');

router.route('/')
  .get(getTickets)
  .post(authenticateUser, createTicket);

router.route('/:id')
  .put(authenticateUser, updateTicket)
  .delete(authenticateUser, deleteTicket);

router.route('/:id/comments')
  .post(authenticateUser, addComment);

module.exports = router;
