const { verifyToken } = require('../config/jwt');
const pool = require('../config/database');

const authenticateToken = async (req, res, next) => {
    try {
        const token = req.session.token || req.cookies.token;
        
        if (!token) {
            return res.redirect('/login?error=Please login to access this page');
        }
        
        const decoded = verifyToken(token);
        
        
        const userResult = await pool.query(`
            SELECT u.*, r.name as role_name, r.permissions 
            FROM users u 
            JOIN roles r ON u.role_id = r.id 
            WHERE u.id = $1
        `, [decoded.userId]);
        
        if (userResult.rows.length === 0) {
            req.session.destroy();
            res.clearCookie('token');
            return res.redirect('/login?error=User not found');
        }
        
        req.user = userResult.rows[0];
        next();
    } catch (error) {
        req.session.destroy();
        res.clearCookie('token');
        return res.redirect('/login?error=Invalid token');
    }
};

const checkPermission = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            
            const permissionResult = await pool.query(
                'SELECT id FROM permissions WHERE name = $1',
                [requiredPermission]
            );
            
            if (permissionResult.rows.length === 0) {
                return res.status(403).render('error', { 
                    message: 'Permission not found',
                    user: req.user,
                    // currentPath: req.path || '/'
                });
            }
            
            const permissionId = permissionResult.rows[0].id;
            
            
            if (!req.user.permissions.includes(permissionId)) {
                return res.status(403).render('error', { 
                    message: 'You do not have permission to access this resource',
                    user: req.user,
                    // currentPath: req.path || '/'
                });
            }
            
            next();
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).render('error', { 
                message: 'Server error during permission check',
                user: req.user,
                // currentPath: req.path || '/'
            });
        }
    };
};

const redirectIfAuthenticated = (req, res, next) => {
    const token = req.session.token || req.cookies.token;
    
    if (token) {
        try {
            verifyToken(token);
            return res.redirect('/dashboard');
        } catch (error) {
            
            req.session.destroy();
            res.clearCookie('token');
        }
    }
    
    next();
};

module.exports = {
    authenticateToken,
    checkPermission,
    redirectIfAuthenticated
};
