// routes/caseRoutes.js

const express = require('express');
const router = express.Router();
const {
    createCase,
    getCases,
    getCase,
    updateCase,
    deleteCase,
    restoreCase,
    archiveCase,
    unarchiveCase
} = require('../controllers/caseController');

const { protect } = require('../middleware/auth');
const { loadUserRole, checkPermission } = require('../middleware/rbac');

router.use(protect);
router.use(loadUserRole);

router.post('/', checkPermission('cases', 'create'), createCase);
router.get('/', checkPermission('cases', 'read'), getCases);
router.get('/:id', checkPermission('cases', 'read'), getCase);
router.put('/:id', checkPermission('cases', 'update'), updateCase);
router.delete('/:id', checkPermission('cases', 'delete'), deleteCase);

router.put('/:id/restore', checkPermission('cases', 'update'), restoreCase);
router.put('/:id/archive', checkPermission('cases', 'update'), archiveCase);
router.put('/:id/unarchive', checkPermission('cases', 'update'), unarchiveCase);

module.exports = router;
