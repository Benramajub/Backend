const express = require('express');
const router = express.Router();
const { getMembers, addMember, deleteMember, updateMember } = require('../controllers/memberControllers');

router.get('/', getMembers);
router.post('/', addMember);
router.delete('/:id', deleteMember);
router.put('/:id', updateMember);

module.exports = router;