const mysql = require("mysql2/promise");
const util = require('util');
const bcrypt = require("bcrypt");
const { logErrors, logMessage } = require('./logger');
const { encodeId, decodeId } = require('./hashid');
const { decode } = require("punycode");

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
        let sqlInsert = `INSERT INTO users VALUES (NULL,?,?,?,?,NULL,?,?,?)`;
        let insert_query = mysql.format(sqlInsert, [email, hashedPassword, firstName, lastName, role, emailVerified, companyName]);
        let result = await connection.query(insert_query);
        const userId = result[0].insertId;

        sqlInsert = `INSERT INTO companies VALUES (NULL,?,?)`;
        insert_query = mysql.format(sqlInsert, [companyName, userId]);
        result = await connection.query(insert_query);
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
    }
    logMessage(src, `Successfully created organization.`);
    return true;

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

module.exports.checkPassword = async function (email, password) {
    const src = 'db.checkPassword';

    const user = await module.exports.getUser(email);
    if (!user) return false;
    let isCorrect;
    try {
        isCorrect = await bcrypt.compare(password, user.password);
    } catch (err) {
        logErrors(src, [err]);
        return false;
    }
    if (!isCorrect) return false;
    return user;

}

module.exports.setPassword = async function (encodedId, newPassword) {
    const src = 'db.setPassword';

    let newHashedPassword;
    try {
        newHashedPassword = await bcrypt.hash(newPassword, HASH_ROUNDS);
    } catch (err) {
        logErrors(src, [err]);
        return false;
    }
    const sqlUpdate = `UPDATE ${DB_USERS_TABLE} SET password = ? WHERE id = ?`;
    const update_query = mysql.format(sqlUpdate, [newHashedPassword, decodeId(encodedId)]);

    try {
        const data = await pool.query(update_query);
        return true;
    } catch (err) {
        logErrors(src, [err]);
        return false;
    }
}

module.exports.getUser = async function (email) {
    const src = 'db.getUser';

    const sqlSearch = `SELECT * FROM users WHERE email = ?`;
    const search_query = mysql.format(sqlSearch, [email]);
    try {
        const result = await pool.query(search_query);
        const user = result[0][0];
        return user;
    } catch (err) {
        logErrors(src, [err]);
        return false;
    }
}

module.exports.deleteUser = async function (encodedId) {
    const src = 'db.deleteUser';

    const sqlDelete = `DELETE FROM users WHERE id = ?`;
    const delete_query = mysql.format(sqlDelete, [decodeId(encodedId)]);
    
    try {
        await pool.query(delete_query);
        return true;
    }
    catch (err) {
        logErrors(src, [err]);
        return false;
    }
}

// module.exports.getCompany = async function (company_id) {

//     const sqlSearch = `SELECT * FROM ${DB_COMPANIES_TABLE} WHERE id = ?`;
//     const search_query = mysql.format(sqlSearch, [company_id]);

//     try {
//         const [company] = await pool.query(search_query);
//         return company;
//     } catch (err) {
//         console.log('[getCompany] : ', err);
//         return err;
//     }
// }


// TODO: Make company transferrable

// module.exports.updateCompanyOwner = async function (companyId, userId) {

//     const sqlUpdate = `UPDATE ${DB_COMPANIES_TABLE} SET owner_id = ? WHERE id = ?`;
//     const update_query = mysql.format(sqlUpdate, [userId, companyId]);

//     try {
//         await pool.query(update_query);
//     } catch (err) {
//         console.log('[updateCompanyOwner] : ', err);
//         return;
//     }
// }



module.exports.createGroup = async function (groupName, encodedCompanyId) {
    const src = 'db.createGroup';

    const sqlInsert = "INSERT INTO `groups` VALUES (NULL,?,?)";
    const insert_query = mysql.format(sqlInsert, [groupName, decodeId(encodedCompanyId)]);

    try {
        const result = await pool.query(insert_query);
        return true;
    } catch (err) {
        logErrors(src, [err]);
        return false;
    }
}

module.exports.getGroups = async function (encodedCompanyId) {
    const src = 'db.getGroups'; 

    const sqlSelect = "SELECT * FROM `groups` WHERE company_id = ?";
    const select_query = mysql.format(sqlSelect, [decodeId(encodedCompanyId)]);

    try {
        let groups = await pool.query(select_query);
        groups = groups[0];
        groups.forEach(group => {
            group.id = encodeId(group.id);
            delete group.company_id;
            return group;
        });
        return groups;
    } catch(err) {
        logErrors(src, [err]);
        return false;
    }
}

module.exports.renameGroup = async function (groupName, encodedGroupId, encodedCompanyId) {
    const src = 'db.updateGroupName';

    const sqlUpdate = "UPDATE `groups` SET name = ? WHERE id = ? AND company_id = ?";
    const update_query = mysql.format(sqlUpdate, [groupName, decodeId(encodedGroupId), decodeId(encodedCompanyId)]);

    try {
        const data = await pool.query(update_query);
        return true;
    } catch (err) {
        logErrors(src, [err]);
        return false;
    }
}
