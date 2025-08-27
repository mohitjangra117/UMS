const express = require('express');
const UserController = require('../controllers/UserController');
const { authenticateToken, checkPermission } = require('../middleware/auth');

const router = express.Router();


router.use(authenticateToken);


router.get('/', checkPermission('view_user'), UserController.index);
router.get('/create', checkPermission('add_user'), UserController.showCreate);
router.post('/create', checkPermission('add_user'), UserController.create);
router.get('/:id', checkPermission('view_user'), UserController.show);
router.get('/:id/edit', checkPermission('edit_user'), UserController.showEdit);
router.post('/:id/edit', checkPermission('edit_user'), UserController.update);
router.delete('/:id', checkPermission('delete_user'), UserController.delete);

module.exports = router;
