const DB_USERS_TABLE = process.env.DB_USERS_TABLE;
const DB_COMPANIES_TABLE = process.env.DB_COMPANIES_TABLE;
const mysql = require("mysql");

module.exports.createUser = async function (username, hashedPassword, company_id, isAdmin, pool, res) {

    const sqlInsert = `INSERT INTO ${DB_USERS_TABLE} VALUES (NULL,?,?,?,?)`;
    const insert_query = mysql.format(sqlInsert, [username, hashedPassword, company_id, isAdmin]);

    try {
        return await pool.query(insert_query);
    } catch (err) {
        return err;
    }
   
}

module.exports.getCompany = async function (company_id, pool) {

    const sqlSearch = `SELECT * FROM ${DB_COMPANIES_TABLE} WHERE id = ?`;
    const search_query = mysql.format(sqlSearch, [company_id]);

    try {
        const [company] = await pool.query(search_query);
        return company;
    } catch (err) {
        return err;
    }
}

module.exports.createCompany = async function (companyName, pool) {

    const sqlInsert = `INSERT INTO ${DB_COMPANIES_TABLE} VALUES (NULL,?)`;
    const insert_query = mysql.format(sqlInsert, [companyName]);

    try {
        return await pool.query(insert_query);
    } catch(err) {
        return err;
    }
    
}

module.exports.getUser = async function (username, pool) {

    const sqlSearch = `SELECT * FROM ${DB_USERS_TABLE} WHERE username = ?`;
    const search_query = mysql.format(sqlSearch, [username]);

    try {
        const [user] = await pool.query(search_query);
        return user;
    } catch (err) {
        return err;
    }

}


module.exports.setPassword = async function (username, newPassword, pool) {
    
    const sqlInsert = `UPDATE ${DB_USERS_TABLE} SET password = ? WHERE username = ?`;
    const insert_query = mysql.format(sqlInsert, [newPassword, username]);

    try {
        const data = await pool.query(insert_query);
        return data;
    } catch (err) {
        return err;
    }
}