const User = require('../models/User');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const { userValidation } = require('../config/validation');

const index = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        
        const result = await User.getAll(page, limit);
        
        res.render('users/index', {
            ...result,
            user: req.user,
            // currentPath: req.path,
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.render('error', {
            message: 'Error fetching users',
            user: req.user,
            // currentPath: req.path || '/'
        });
    }
};
    
const show = async (req, res) => {
    try {
        const userId = req.params.id;
        const userData = await User.getById(userId);
        
        if (!userData) {
            return res.render('error', {
                message: 'User not found',
                user: req.user,
                // currentPath: req.path || '/'
            });
        }
        
        const userPermissions = await Permission.getByIds(userData.permissions || []);
        
        res.render('users/show', {
            userData,
            userPermissions,
            user: req.user,
            // currentPath: req.path
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.render('error', {
            message: 'Error fetching user details',
            user: req.user,
            // currentPath: req.path || '/'
        });
    }
};
    
const showCreate = async (req, res) => {
    try {
        const roles = await Role.getAll();
        
        res.render('users/create', {
            roles,
            user: req.user,
            // currentPath: req.path,
            error: req.query.error
        });
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.render('error', {
            message: 'Error loading user creation form',
            user: req.user,
            // currentPath: req.path || '/'
        });
    }
};
    
const create = async (req, res) => {
    try {
        
        const { error, value } = userValidation.create.validate(req.body);
        
        if (error) {
            const roles = await Role.getAll();
            return res.render('users/create', {
                roles,
                user: req.user,
                // currentPath: req.path,
                error: error.details?.[0]?.message || 'Validation error occurred',
                formData: req.body
            });
        }
        
        
        const existingUser = await User.getByUsername(value.username);
        if (existingUser) {
            const roles = await Role.getAll();
            return res.render('users/create', {
                roles,
                user: req.user,
                // currentPath: req.path,
                error: 'Username already exists',
                formData: req.body
            });
        }
        
        
        const existingEmail = await User.getByEmail(value.email);
        if (existingEmail) {
            const roles = await Role.getAll();
            return res.render('users/create', {
                roles,
                user: req.user,
                // currentPath: req.path,
                error: 'Email already exists',
                formData: req.body
            });
        }
        
        
        const targetRole = await Role.getById(value.role_id);
        if (!targetRole) {
            const roles = await Role.getAll();
            return res.render('users/create', {
                roles,
                user: req.user,
                // currentPath: req.path,
                error: 'Invalid role selected',
                formData: req.body
            });
        }
        
        
        if (req.user.role_name === 'admin' && (targetRole.name === 'superadmin' || targetRole.name === 'admin')) {
            const roles = await Role.getAll();
            return res.render('users/create', {
                roles,
                user: req.user,
                // currentPath: req.path,
                error: 'You do not have permission to create users with this role',
                formData: req.body
            });
        }
        
        await User.create(value, req.user.id);
        
        res.redirect('/users?success=User created successfully');
        
    } catch (error) {
        console.error('Error creating user:', error);
        const roles = await Role.getAll();
        res.render('users/create', {
            roles,
            user: req.user,
            error: 'An error occurred while creating the user',
            formData: req.body
        });
    }
};
    
const showEdit = async (req, res) => {
    try {
        const userId = req.params.id;
        const userData = await User.getById(userId);
        
        if (!userData) {
            return res.render('error', {
                message: 'User not found',
                user: req.user,
                // currentPath: req.path || '/'
            });
        }
        
        
        if (req.user.role_name === 'admin' && userData.role_name === 'superadmin') {
            return res.render('error', {
                message: 'You cannot edit superadmin users',
                user: req.user,
                // currentPath: req.path || '/'
            });
        }
        
        const roles = await Role.getAll();
        
        res.render('users/edit', {
            userData,
            roles,
            user: req.user,
            // currentPath: req.path,
            error: req.query.error
        });
    } catch (error) {
        console.error('Error fetching user for edit:', error);
        res.render('error', {
            message: 'Error loading user edit form',
            user: req.user,
            // currentPath: req.path || '/'
        });
    }
};
    
const update = async (req, res) => {
    try {
        const userId = req.params.id;
        
        
        const { error, value } = userValidation.update.validate(req.body);
        
        if (error) {
            return res.redirect(`/users/${userId}/edit?error=${encodeURIComponent(error.details[0].message)}`);
        }
        
        
        const currentUserData = await User.getById(userId);
        if (!currentUserData) {
            return res.render('error', {
                message: 'User not found',
                user: req.user,
                // currentPath: req.path || '/'
            });
        }
        
        
        if (req.user.role_name === 'admin' && currentUserData.role_name === 'superadmin') {
            return res.render('error', {
                message: 'You cannot edit superadmin users',
                user: req.user,
                // currentPath: req.path || '/'
            });
        }
        
        
        if (value.role_id) {
            const targetRole = await Role.getById(value.role_id);
            if (req.user.role_name === 'admin' && (targetRole.name === 'superadmin' || targetRole.name === 'admin')) {
                return res.redirect(`/users/${userId}/edit?error=${encodeURIComponent('You cannot assign this role')}`);
            }
        }
        
        
        if (value.username && value.username !== currentUserData.username) {
            const existingUser = await User.getByUsername(value.username);
            if (existingUser) {
                return res.redirect(`/users/${userId}/edit?error=${encodeURIComponent('Username already exists')}`);
            }
        }
        
        
        if (value.email && value.email !== currentUserData.email) {
            const existingEmail = await User.getByEmail(value.email);
            if (existingEmail) {
                return res.redirect(`/users/${userId}/edit?error=${encodeURIComponent('Email already exists')}`);
            }
        }
        
        
        await User.update(userId, value, req.user.id);
        
        res.redirect(`/users?success=User updated successfully`);
        
    } catch (error) {
        console.error('Error updating user:', error);
        res.redirect(`/users/${req.params.id}/edit?error=${encodeURIComponent('An error occurred while updating the user')}`);
    }
};
    
const deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        
        
        const userToDelete = await User.getById(userId);
        if (!userToDelete) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        
        if (userToDelete.role_name === 'superadmin') {
            return res.status(403).json({ success: false, message: 'Cannot delete superadmin user' });
        }
        
        
        if (req.user.role_name === 'admin' && userToDelete.role_name === 'admin') {
            return res.status(403).json({ success: false, message: 'You cannot delete admin users' });
        }
        
        
        if (userId == req.user.id) {
            return res.status(403).json({ success: false, message: 'You cannot delete your own account' });
        }
        
        await User.delete(userId);
        
        res.json({ success: true, message: 'User deleted successfully' });
        
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, message: 'An error occurred while deleting the user' });
    }
};

module.exports = {
    index,
    show,
    showCreate,
    create,
    showEdit,
    update,
    delete: deleteUser
};
