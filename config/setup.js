const pool = require('./database');
const bcrypt = require('bcryptjs');

const createTables = async () => {
    const client = await pool.connect();
    
    try {
          
        await client.query(`
            CREATE TABLE IF NOT EXISTS permissions (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT
            )
        `);
        
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS roles (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) NOT NULL UNIQUE,
                description TEXT,
                permissions INTEGER[] DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role_id INTEGER REFERENCES roles(id),        
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER REFERENCES users(id),
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_by INTEGER REFERENCES users(id)
            )
        `);
        
        
        const permissions = [
            { name: 'view_user', description: 'View user details' },
            { name: 'add_user', description: 'Add new user' },
            { name: 'edit_user', description: 'Edit user details' },
            { name: 'delete_user', description: 'Delete user' },
            { name: 'add_role', description: 'Add new role' },
            { name: 'edit_role', description: 'Edit role' },
            { name: 'add_permissions_to_role', description: 'Add permissions to role' }
        ];
        
        for (const permission of permissions) {
            await client.query(
                'INSERT INTO permissions (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
                [permission.name, permission.description]
            );
        }
        
        
        const permissionResult = await client.query('SELECT id, name FROM permissions ORDER BY id');
        const permissionMap = {};
        permissionResult.rows.forEach(row => {
            permissionMap[row.name] = row.id;
        });
        
        
        const roles = [
            { 
                name: 'superadmin', 
                description: 'Super Administrator with all permissions',
                permissions: Object.values(permissionMap) 
            },
            { 
                name: 'admin', 
                description: 'Administrator with limited permissions',
                permissions: [
                    permissionMap.view_user,
                    permissionMap.add_user,
                    permissionMap.edit_user,
                    permissionMap.delete_user
                ]
            },
            { 
                name: 'user', 
                description: 'Regular user with view-only permissions',
                permissions: [permissionMap.view_user]
            }
        ];
        
        for (const role of roles) {
            await client.query(
                'INSERT INTO roles (name, description, permissions) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING',
                [role.name, role.description, role.permissions]
            );
        }
        
        
        const existingSuperAdmin = await client.query(
            'SELECT * FROM users WHERE username = $1',
            ['superadmin']
        );
        
        if (existingSuperAdmin.rows.length === 0) {
            
            const superAdminRole = await client.query(
                'SELECT id FROM roles WHERE name = $1',
                ['superadmin']
            );
            
            
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await client.query(
                'INSERT INTO users (username, email, password, role_id) VALUES ($1, $2, $3, $4)',
                ['superadmin', 'superadmin@example.com', hashedPassword, superAdminRole.rows[0].id]
            );
            
            console.log('Default superadmin user created:');
            console.log('Username: superadmin');
            console.log('Password: admin123');
            console.log('Email: superadmin@example.com');
        }
        
        console.log('Database tables created successfully!');
        
    } catch (error) {
        console.error('Error creating tables:', error);
        throw error;
    } finally {
        client.release();
    }
};

module.exports = { createTables };
