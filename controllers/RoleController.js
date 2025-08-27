const Role = require('../models/Role');
const Permission = require('../models/Permission');
const { roleValidation } = require('../config/validation');

const index = async (req, res) => {
    try {
        const roles = await Role.getAll();
        
        
        const rolesWithUserCount = await Promise.all(   //used to execute multiple asynchronous operations concurrently instead of sequentially
            roles.map(async (role) => {
                const userCount = await Role.getUserCount(role.id);
                return { ...role, userCount };
            })
        );

        res.render('roles/index', {
            roles: rolesWithUserCount,
            user: req.user,
            // currentPath: req.path,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.render('error', {
            message: 'Error fetching roles',
            user: req.user,
            // currentPath: req.path || '/'
        });
    }
};

const show = async (req, res) => {
    try {
        const roleId = req.params.id;
        const role = await Role.getById(roleId);
        
        if (!role) {
            return res.render('error', {
                message: 'Role not found',
                user: req.user,
                // currentPath: req.path || '/'
            });
        }
        
        const rolePermissions = await Permission.getByIds(role.permissions || []);
        const userCount = await Role.getUserCount(roleId);
        
        res.render('roles/show', {
            role,
            rolePermissions,
            userCount,
            user: req.user,
            // currentPath: req.path
        });
    } catch (error) {
        console.error('Error fetching role:', error);
        res.render('error', {
            message: 'Error fetching role details',
            user: req.user,
            // currentPath: req.path || '/'
        });
    }
};

const showCreate = async (req, res) => {
    try {
        const permissions = await Permission.getAll();
        
        res.render('roles/create', {
            permissions,
            user: req.user,
            // currentPath: req.path,
            // error: req.query.error
        });
    } catch (error) {
        console.error('Error  permissions:', error);
        res.render('error', {
            message: 'Error loading role creation form',
            user: req.user,
            // currentPath: req.path || '/'
        });
    }
};

const create = async (req, res) => {
    try {
        
        let permissions = [];
        if (req.body.permissions) {
            permissions = Array.isArray(req.body.permissions) 
                ? req.body.permissions.map(id => parseInt(id))
                : [parseInt(req.body.permissions)];
        }
        
        const roleData = {
            name: req.body.name,
            description: req.body.description,
            permissions
        };
        
        
        const { error, value } = roleValidation.create.validate(roleData);
        
        if (error) {
            const permissionsData = await Permission.getAll();
            return res.render('roles/create', {
                permissions: permissionsData,
                user: req.user,
                // currentPath: req.path,
                error: error.details[0].message,
                formData: req.body
            });
        }
        
        
        const existingRole = await Role.getByName(value.name.toLowerCase());
        if (existingRole) {
            const permissionsData = await Permission.getAll();
            return res.render('roles/create', {
                permissions: permissionsData,
                user: req.user,
                // currentPath: req.path,
                error: 'Role name already exists',
                formData: req.body
            });
        }
        
        
        await Role.create(value);
        
        res.redirect('/roles?success=Role created successfully');
        
    } catch (error) {
        console.error('Error creating role:', error);
        const permissions = await Permission.getAll();
        res.render('roles/create', {
            permissions,
            user: req.user,
            // currentPath: req.path,
            error: 'An error occurred while creating the role',
            formData: req.body
        });
    }
};

const showEdit = async (req, res) => {
    try {
        const roleId = req.params.id;
        const role = await Role.getById(roleId);
        
        if (!role) {
            return res.render('error', {
                message: 'Role not found',
                user: req.user,
                // currentPath: req.path || '/'
            });
        }
        
        
        if (['superadmin', 'admin', 'user'].includes(role.name.toLowerCase())) {
            return res.render('error', {
                message: 'System roles cannot be edited',
                user: req.user,
                // currentPath: req.path || '/'
            });
        }
        
        const permissions = await Permission.getAll();
        
        res.render('roles/edit', {
            role,
            permissions,
            user: req.user,
            // currentPath: req.path,
            error: req.query.error
        });
    } catch (error) {
        console.error('Error fetching role for edit:', error);
        res.render('error', {
            message: 'Error loading role edit form',
            user: req.user,
            // currentPath: req.path || '/'
        });
    }
};
const update = async (req, res) => {
    try {
        const roleId = req.params.id;
        
        
        const currentRole = await Role.getById(roleId);
        if (!currentRole) {
            return res.render('error', {
                message: 'Role not found',
                user: req.user,
                // currentPath: req.path || '/'
            });
        }
        
        
        if (['superadmin', 'admin', 'user'].includes(currentRole.name.toLowerCase())) {
            return res.render('error', {
                message: 'System roles cannot be edited',
                user: req.user,
                // currentPath: req.path || '/'
            });
        }
        
        
        let permissions = [];
        if (req.body.permissions) {
            permissions = Array.isArray(req.body.permissions) 
                ? req.body.permissions.map(id => parseInt(id))
                : [parseInt(req.body.permissions)];
        }
        
        const roleData = {
            name: req.body.name,
            description: req.body.description,
            permissions
        };
        
        
        const { error, value } = roleValidation.update.validate(roleData);
        
        if (error) {
            return res.redirect(`/roles/${roleId}/edit?error=${encodeURIComponent(error.details[0].message)}`);
        }
        
        
        if (value.name && value.name.toLowerCase() !== currentRole.name.toLowerCase()) {
            const existingRole = await Role.getByName(value.name.toLowerCase());
            if (existingRole) {
                return res.redirect(`/roles/${roleId}/edit?error=${encodeURIComponent('Role name already exists')}`);   // encodeURIComponent  ?error=Role%20name%20is%20required
// URL is properly formatted for browsers 
            }
        }
        
        
        await Role.update(roleId, value);
        
        res.redirect('/roles?success=Role updated successfully');
        
    } catch (error) {
        console.error('Error updating role:', error);
        res.redirect(`/roles/${req.params.id}/edit?error=${encodeURIComponent('An error occurred while updating the role')}`);
    }
};
const deleteRole = async (req, res) => {
    try {
        const roleId = req.params.id;
        
        
        const roleToDelete = await Role.getById(roleId);
        if (!roleToDelete) {
            return res.status(404).json({ success: false, message: 'Role not found' });
        }
        
        
        if (['superadmin', 'admin', 'user'].includes(roleToDelete.name.toLowerCase())) {
            return res.status(403).json({ success: false, message: 'System roles cannot be deleted' });
        }
        
        await Role.delete(roleId);
        
        res.json({ success: true, message: 'Role deleted successfully' });
        
    } catch (error) {
        console.error('Error deleting role:', error);
        
        if (error.message.includes('Cannot delete role that is assigned to users')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        
        res.status(500).json({ success: false, message: 'An error occurred while deleting the role' });
    }
};

module.exports = {
    index,
    show,
    showCreate,
    create,
    showEdit,
    update,
    delete: deleteRole
};
