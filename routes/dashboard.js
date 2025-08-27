const express = require('express');
const DashboardController = require('../controllers/DashboardController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();


router.use(authenticateToken);


router.get('/', DashboardController.index);

module.exports = router;
