const DB_USERS_TABLE = process.env.DB_USERS_TABLE;
const DB_COMPANIES_TABLE = process.env.DB_COMPANIES_TABLE;
const mysql = require("mysql");
const util = require('util');

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_DATABASE = process.env.DB_DATABASE;
const DB_PORT = process.env.DB_PORT;


const pool = mysql.createPool({
    connectionLimit: 100,
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_DATABASE,
    port: DB_PORT
});

pool.query = util.promisify(pool.query);

module.exports.createUser = async function (username, hashedPassword, company_id, isAdmin) {

    const sqlInsert = `INSERT INTO ${DB_USERS_TABLE} VALUES (NULL,?,?,?,?)`;
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

module.exports.deleteUser = async function (username) {

    const sqlDelete = `DELETE FROM ${DB_USERS_TABLE} WHERE username = ?`;
    const delete_query = mysql.format(sqlDelete, [username]);

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

module.exports.createCompany = async function (companyName) {

    const sqlInsert = `INSERT INTO ${DB_COMPANIES_TABLE} VALUES (NULL,?)`;
    const insert_query = mysql.format(sqlInsert, [companyName]);

    try {
        const result = await pool.query(insert_query);
        return result.insertId;
    } catch (err) {
        console.log('[createCompany] : ', err);
        throw err;
    }
    
}

module.exports.setPassword = async function (id, newPassword) {
    
    const sqlInsert = `UPDATE ${DB_USERS_TABLE} SET password = ? WHERE id = ?`;
    const insert_query = mysql.format(sqlInsert, [newPassword, id]);

    try {
        const data = await pool.query(insert_query);
        return data;
    } catch (err) {
        return err;
    }
}

async function authorizeAsAdmin(username) {
    
}