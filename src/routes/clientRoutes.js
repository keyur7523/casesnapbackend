// routes/clientRoutes.js

const express = require('express');
const router = express.Router();
const {
    createClient,
    getClients,
    getClient,
    updateClient,
    deleteClient,
    restoreClient,
    archiveClient,
    unarchiveClient
} = require('../controllers/clientController');

const { protect } = require('../middleware/auth');
const { loadUserRole, checkPermission } = require('../middleware/rbac');

// All routes require authentication and role loading
router.use(protect);
router.use(loadUserRole);

// CRUD routes with RBAC permissions
router.post('/', checkPermission('client', 'create'), createClient);
router.get('/', checkPermission('client', 'read'), getClients);
router.get('/:id', checkPermission('client', 'read'), getClient);
router.put('/:id', checkPermission('client', 'update'), updateClient);
router.delete('/:id', checkPermission('client', 'delete'), deleteClient);

// Additional routes
router.put('/:id/restore', checkPermission('client', 'update'), restoreClient);
router.put('/:id/archive', checkPermission('client', 'update'), archiveClient);
router.put('/:id/unarchive', checkPermission('client', 'update'), unarchiveClient);

module.exports = router;
