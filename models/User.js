const pool = require('../config/database');
const bcrypt = require('bcryptjs');

const getAll = async (page = 1, limit = 10) => {
    const offset = (page - 1) * limit;
    
    const result = await pool.query(`
        SELECT u.id, u.username, u.email, u.created_at, 
               r.name as role_name, 
               creator.username as created_by_username
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        LEFT JOIN users creator ON u.created_by = creator.id
        ORDER BY u.created_at DESC
        LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    const countResult = await pool.query('SELECT COUNT(*) FROM users');
    const totalUsers = parseInt(countResult.rows[0].count);
    
    return {
        users: result.rows,
        totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: page
    };
};
    
const getById = async (id) => {
    const result = await pool.query(`
        SELECT u.*, r.name as role_name, r.permissions 
        FROM users u 
        LEFT JOIN roles r ON u.role_id = r.id 
        WHERE u.id = $1
    `, [id]);
    
    return result.rows[0];
};
    
const getByUsername = async (username) => {
    const result = await pool.query(`
        SELECT u.*, r.name as role_name, r.permissions 
        FROM users u 
        LEFT JOIN roles r ON u.role_id = r.id 
        WHERE u.username = $1
    `, [username]);
    
    return result.rows[0];
};
    
const getByEmail = async (email) => {
    const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
    );
    
    return result.rows[0];
};
    
const create = async (userData, createdBy) => {
    const { username, email, password, role_id } = userData;
    
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(`
        INSERT INTO users (username, email, password, role_id, created_by) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING id, username, email, role_id, created_at
    `, [username, email, hashedPassword, role_id, createdBy]);
    
    return result.rows[0];
};
    
const update = async (id, userData, updatedBy) => {
    const { username, email, password, role_id } = userData;
    let query = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP, updated_by = $2';
    let values = [id, updatedBy];
    let paramCount = 2;
    
    if (username) {
        query += `, username = $${++paramCount}`;
        values.push(username);
    }
    
    if (email) {
        query += `, email = $${++paramCount}`;
        values.push(email);
    }
    
    if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        query += `, password = $${++paramCount}`;
        values.push(hashedPassword);
    }
    
    if (role_id) {
        query += `, role_id = $${++paramCount}`;
        values.push(role_id);
    }
    
    query += ' WHERE id = $1 RETURNING id, username, email, role_id, updated_at';
    
    const result = await pool.query(query, values);
    return result.rows[0];
};
    
const deleteUser = async (id) => {
    const result = await pool.query(
        'DELETE FROM users WHERE id = $1 RETURNING id, username',
        [id]
    );
    
    return result.rows[0];
};
    
const validatePassword = async (plainPassword, hashedPassword) => {
    return await bcrypt.compare(plainPassword, hashedPassword);
};

module.exports = {
    getAll,
    getById,
    getByUsername,
    getByEmail,
    create,
    update,
    delete: deleteUser,
    validatePassword
};
