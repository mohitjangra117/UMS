const pool = require('../config/database');

const getAll = async () => {
    const result = await pool.query(`
        SELECT r.*, 
               ARRAY_AGG(p.name) as permission_names
        FROM roles r
        LEFT JOIN permissions p ON p.id = ANY(r.permissions)
        GROUP BY r.id, r.name, r.description, r.permissions, r.created_at, r.updated_at
        ORDER BY r.created_at DESC
    `);
    
    return result.rows;
};

const getById = async (id) => {
    const result = await pool.query(`
        SELECT r.*, 
               ARRAY_AGG(p.name) as permission_names
        FROM roles r
        LEFT JOIN permissions p ON p.id = ANY(r.permissions)
        WHERE r.id = $1
        GROUP BY r.id, r.name, r.description, r.permissions, r.created_at, r.updated_at
    `, [id]);
    
    return result.rows[0];
};
    
const getByName = async (name) => {
    const result = await pool.query(
        'SELECT * FROM roles WHERE name = $1',
        [name]
    );
    
    return result.rows[0];
};

const create = async (roleData) => {
    const { name, description, permissions } = roleData;
    
    const result = await pool.query(`
        INSERT INTO roles (name, description, permissions) 
        VALUES ($1, $2, $3) 
        RETURNING id, name, description, permissions, created_at
    `, [name, description, permissions || []]);
    
    return result.rows[0];
};
    
const update = async (id, roleData) => {
    const { name, description, permissions } = roleData;
    let query = 'UPDATE roles SET updated_at = CURRENT_TIMESTAMP';
    let values = [id];
    let paramCount = 1;
    
    if (name) {
        query += `, name = $${++paramCount}`;
        values.push(name);
    }
    
    if (description !== undefined) {
        query += `, description = $${++paramCount}`;
        values.push(description);
    }
    
    if (permissions) {
        query += `, permissions = $${++paramCount}`;
        values.push(permissions);
    }
    
    query += ' WHERE id = $1 RETURNING id, name, description, permissions, updated_at';
    
    const result = await pool.query(query, values);
    return result.rows[0];
};
    
const deleteRole = async (id) => {
    
    const userCount = await pool.query(
        'SELECT COUNT(*) FROM users WHERE role_id = $1',
        [id]
    );
    
    if (parseInt(userCount.rows[0].count) > 0) {
        throw new Error('Cannot delete role that is assigned to users');
    }
    
    const result = await pool.query(
        'DELETE FROM roles WHERE id = $1 RETURNING id, name',
        [id]
    );
    
    return result.rows[0];
};

const getUserCount = async (roleId) => {
    const result = await pool.query(
        'SELECT COUNT(*) FROM users WHERE role_id = $1',
        [roleId]
    );
    
    return parseInt(result.rows[0].count);
};

module.exports = {
    getAll,
    getById,
    getByName,
    create,
    update,
    delete: deleteRole,
    getUserCount
};
