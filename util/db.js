const mysql = require("mysql2/promise");
const util = require('util');
const bcrypt = require("bcrypt");
const { logErrors, logMessage } = require('./logger');

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_DATABASE = process.env.DB_DATABASE;
const DB_PORT = process.env.DB_PORT;
const DB_USERS_TABLE = process.env.DB_USERS_TABLE;
const DB_COMPANIES_TABLE = process.env.DB_COMPANIES_TABLE;
const HASH_ROUNDS = 10;

const pool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_DATABASE,
    port: DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

function queryCallback(src, err, results, fields) {
    if (err) {
        logErrors(src, [err.sqlMessage]);
        return false;
    }
    return true;
}

module.exports.createOrg = async function (fields) {
    const src = 'db.createOrg';

    const { email, password, firstName, lastName, companyName } = fields;
    const role = "superadmin";
    const emailVerified = 0;
    const hashedPassword = await bcrypt.hash(password, HASH_ROUNDS);

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        let sqlInsert = `INSERT INTO users VALUES (NULL,?,?,?,?,NULL,?,?)`;
        let insert_query = mysql.format(sqlInsert, [email, hashedPassword, firstName, lastName, role, emailVerified]);
        let result = await connection.query(insert_query);
        console.log('User insert: ', result);
        const userId = result[0].insertId;

        sqlInsert = `INSERT INTO companies VALUES (NULL,?,?)`;
        insert_query = mysql.format(sqlInsert, [companyName, userId]);
        result = await connection.query(insert_query);
        console.log('Company insert: ', result);
        const companyId = result[0].insertId;

        let sqlUpdate = `UPDATE users SET company_id = ? WHERE id = ?`;
        let update_query = mysql.format(sqlUpdate, [companyId, userId]);
        await connection.query(update_query);

        await connection.commit();

    } catch (err) {
        await connection.rollback();
        logErrors(src, [err.sqlMessage]);
        return false;
    } finally {
        connection.release();
        logMessage(src, `Successfully created organization.`);
        return true;
    }

}

module.exports.createUser = async function (email, hashedPassword, firstName, lastName, companyName) {

    const sqlInsert = `INSERT INTO users VALUES (NULL,?,?,?,?)`;
    const insert_query = mysql.format(sqlInsert, [username, hashedPassword, company_id, isAdmin]);

    try {
        const result = await pool.query(insert_query);
        return result.insertId;
    } catch (err) {
        console.log('[createUser] : ', err);
        throw err;
    }

}

module.exports.getUser = async function (username) {

    const sqlSearch = `SELECT * FROM ${DB_USERS_TABLE} WHERE username = ?`;
    const search_query = mysql.format(sqlSearch, [username]);

    try {
        const [user] = await pool.query(search_query);
        return user;
    } catch (err) {
        console.log('[getUser] : ', user);
        throw (err);
    }

}

module.exports.deleteUser = async function (userId) {

    const sqlDelete = `DELETE FROM ${DB_USERS_TABLE} WHERE id = ?`;
    const delete_query = mysql.format(sqlDelete, [userId]);

    try {
        const result = await pool.query(delete_query);
        return result;
    }
    catch (err) {
        console.log('[deleteUser] : ', err);
        throw err;
    }
}

module.exports.getCompany = async function (company_id) {

    const sqlSearch = `SELECT * FROM ${DB_COMPANIES_TABLE} WHERE id = ?`;
    const search_query = mysql.format(sqlSearch, [company_id]);

    try {
        const [company] = await pool.query(search_query);
        return company;
    } catch (err) {
        console.log('[getCompany] : ', err);
        return err;
    }
}

module.exports.createCompany = async function (companyName, ownerId) {

    const sqlInsert = `INSERT INTO companies VALUES (NULL,?,?)`;
    const insert_query = mysql.format(sqlInsert, [companyName, ownerId]);

    try {
        const result = await pool.query(insert_query);
        return result.insertId;
    } catch (err) {
        console.log('[createCompany] : ', err);
        throw err;
    }

}

module.exports.updateCompanyOwner = async function (companyId, userId) {

    const sqlUpdate = `UPDATE ${DB_COMPANIES_TABLE} SET owner_id = ? WHERE id = ?`;
    const update_query = mysql.format(sqlUpdate, [userId, companyId]);

    try {
        await pool.query(update_query);
    } catch (err) {
        console.log('[updateCompanyOwner] : ', err);
        return;
    }
}

module.exports.setPassword = async function (id, newPassword) {

    const sqlUpdate = `UPDATE ${DB_USERS_TABLE} SET password = ? WHERE id = ?`;
    const update_query = mysql.format(sqlUpdate, [newPassword, id]);

    try {
        const data = await pool.query(update_query);
        return data;
    } catch (err) {
        console.log('[setPassword] : ', err);
        throw err;
    }
}

module.exports.createGroup = async function (groupName, companyId) {

    const sqlInsert = "INSERT INTO 'groups' VALUES (NULL,?,?)";
    const insert_query = mysql.format(sqlInsert, [groupName, companyId]);

    try {
        const result = await pool.query(insert_query);
        return result.insertId;
    } catch (err) {
        console.log('[createGroup] : ', err);
        throw err;
    }
}

module.exports.updateGroupName = async function (groupId, groupName) {

    const sqlUpdate = `UPDATE groups SET name = ? WHERE id = ?`;
    const update_query = mysql.format(sqlUpdate, [groupName, groupId]);

    try {
        const data = await pool.query(update_query);
        return data;
    } catch (err) {
        console.log('[updateGroupName] : ', err);
        throw err;
    }
}
