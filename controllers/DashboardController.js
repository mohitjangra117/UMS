const pool = require('../config/database');

const index = async (req, res) => {
    try {
        
        const stats = await Promise.all([
            pool.query('SELECT COUNT(*) FROM users'),
            pool.query('SELECT COUNT(*) FROM roles'),
            pool.query('SELECT COUNT(*) FROM permissions')
        ]);
        
        const totalUsers = parseInt(stats[0].rows[0].count);
        const totalRoles = parseInt(stats[1].rows[0].count);
        const totalPermissions = parseInt(stats[2].rows[0].count);
        
        res.render('dashboard/index', {
            user: req.user,
            stats: {
                totalUsers,
                totalRoles,
                totalPermissions
            }
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.render('error', {
            message: 'Error loading dashboard',
            user: req.user,
            // currentPath: req.path || '/'
        });
    }
};

module.exports = {
    index
};
