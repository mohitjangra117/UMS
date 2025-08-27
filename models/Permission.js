const pool = require('../config/database');

const getAll = async () => {
    const result = await pool.query(`
        SELECT * FROM permissions 
        ORDER BY name ASC
    `);
    
    return result.rows;
};

const getById = async (id) => {
    const result = await pool.query(
        'SELECT * FROM permissions WHERE id = $1',
        [id]
    );
    
    return result.rows[0];
};

const getByName = async (name) => {
    const result = await pool.query(
        'SELECT * FROM permissions WHERE name = $1',
        [name]
    );
    
    return result.rows[0];
};

const getByIds = async (ids) => {
    if (!ids || ids.length === 0) return [];
    
    const result = await pool.query(`
        SELECT * FROM permissions 
        WHERE id = ANY($1)
        ORDER BY name ASC
    `, [ids]);
    
    return result.rows;
};

const getRolePermissions = async (roleId) => {
    const result = await pool.query(`
        SELECT p.* FROM permissions p
        JOIN roles r ON p.id = ANY(r.permissions)
        WHERE r.id = $1
        ORDER BY p.name ASC
    `, [roleId]);
    
    return result.rows;
};

module.exports = {
    getAll,
    getById,
    getByName,
    getByIds,
    getRolePermissions
};
