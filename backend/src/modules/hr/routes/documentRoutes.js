const express = require('express');
const router = express.Router();
const {
  getDocuments,
  downloadDocument,
  uploadDocument,
  deleteDocument
} = require('../controllers/documentController');

router.get('/', getDocuments);
router.get('/:id/download', downloadDocument);
router.post('/', uploadDocument);
router.delete('/:id', deleteDocument);

module.exports = router;
