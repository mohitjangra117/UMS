const express = require('express');
const AuthController = require('../controllers/AuthController');
const { redirectIfAuthenticated } = require('../middleware/auth');

const router = express.Router();


router.get('/login', redirectIfAuthenticated, AuthController.showLogin);
router.post('/login', redirectIfAuthenticated, AuthController.login);


router.get('/logout', (req, res, next) => {
    AuthController.logout(req, res, next);
});
router.post('/logout', (req, res, next) => {
    AuthController.logout(req, res, next);
});


module.exports = router;
