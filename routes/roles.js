const express = require('express');
const RoleController = require('../controllers/RoleController');
const { authenticateToken, checkPermission } = require('../middleware/auth');

const router = express.Router();


router.use(authenticateToken);


router.get('/', checkPermission('add_role'), RoleController.index);
router.get('/create', checkPermission('add_role'), RoleController.showCreate);
router.post('/create', checkPermission('add_role'), RoleController.create);
router.get('/:id', checkPermission('add_role'), RoleController.show);
router.get('/:id/edit', checkPermission('edit_role'), RoleController.showEdit);
router.post('/:id/edit', checkPermission('edit_role'), RoleController.update);
router.delete('/:id', checkPermission('edit_role'), RoleController.delete);

module.exports = router;
