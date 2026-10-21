const express = require('express');
const router = express.Router();
const {
  getTickets,
  createTicket,
  updateTicket,
  addComment,
  deleteTicket
} = require('../controllers/ticketController');

router.route('/')
  .get(getTickets)
  .post(createTicket);

router.route('/:id')
  .put(updateTicket)
  .delete(deleteTicket);

router.route('/:id/comments')
  .post(addComment);

module.exports = router;
