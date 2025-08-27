const User = require('../models/User');
const { generateToken } = require('../config/jwt');
const { userValidation } = require('../config/validation');

const showLogin = async (req, res) => {
    const error = req.query.error;
    const success = req.query.success;
    
    res.render('auth/login', { 
        error, 
        success,
        user: null    //  without this the app will crash because the ejs will try to find the user properties 
    });
};

const login = async (req, res) => {
    try {
        
        const { error, value } = userValidation.login.validate(req.body);
        
        if (error) {
            return res.render('auth/login', {
                error: error.details[0].message,
                success: null,
                user: null
            });
        }
        
        const { username, password } = value;
        
        
        const user = await User.getByUsername(username);
        if (!user) {
            return res.render('auth/login', {
                error: 'Invalid username or password',
                success: null,
                user: null
            });
        }
        
        
        const isValidPassword = await User.validatePassword(password, user.password);
        if (!isValidPassword) {
            return res.render('auth/login', {
                error: 'Invalid username or password',
                success: null,
                user: null
            });
        }
        
        
        const token = generateToken({
            userId: user.id,
            username: user.username,
            role: user.role_name
        });
        
        
        req.session.token = token;
        res.cookie('token', token, {
            httpOnly: true,       // Prevents client side js from accessing the cookie 
            maxAge: 7 * 24 * 60 * 60 * 1000 
        });
        
        res.redirect('/dashboard');
        
    } catch (error) {
        console.error('Login error:', error);
        res.render('auth/login', {
            error: 'An error occurred during login',
            success: null,
            user: null
        });
    }
};

const logout = async (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destroy error:', err);
        }
        
        res.clearCookie('token');
        res.redirect('/login?success=Logged out successfully');
    });
};

module.exports = {
    showLogin,
    login,
    logout
};
