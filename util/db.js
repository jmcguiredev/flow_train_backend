const mysql = require("mysql2/promise");
const util = require('util');
const bcrypt = require("bcrypt");
const { logErrors, logMessage } = require('./logger');
const { encodeId, decodeId } = require('./hashid');
const { verify } = require("crypto");

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_DATABASE = process.env.DB_DATABASE;
const DB_PORT = process.env.DB_PORT;
const DB_USERS_TABLE = process.env.DB_USERS_TABLE;
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

module.exports.verifyPermission = async function (objectTableName, encodedObjectId, encodedCompanyId) {
    const src = `db.verifyPermission [${objectTableName}]`;

    const sqlSelect = "SELECT * from `" + objectTableName + "` WHERE id = ?";
    const select_query = mysql.format(sqlSelect, [decodeId(encodedObjectId)]);
    try {
        const result = await pool.query(select_query);
        return result[0][0].companyId === decodeId(encodedCompanyId);
    } catch (err) {
        logErrors(src, [err]);
        return false;
    }
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

        let sqlUpdate = `UPDATE users SET companyId = ? WHERE id = ?`;
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

module.exports.deleteUser = async function (encodedUserId) {
    const src = 'db.deleteUser';

    const sqlDelete = `DELETE FROM users WHERE id = ?`;
    const delete_query = mysql.format(sqlDelete, [decodeId(encodedUserId)]);

    try {
        await pool.query(delete_query);
        return true;
    }
    catch (err) {
        logErrors(src, [err]);
        return false;
    }
}

module.exports.createGroup = async function (groupName, encodedCompanyId) {
    const src = 'db.createGroup';

    const sqlInsert = "INSERT INTO `groups` VALUES (NULL,?,?)";
    const insert_query = mysql.format(sqlInsert, [groupName, decodeId(encodedCompanyId)]);

    try {
        const result = await pool.query(insert_query);
        return encodeId(result[0].insertId);
    } catch (err) {
        logErrors(src, [err]);
        return false;
    }
}

module.exports.getGroups = async function (encodedCompanyId) {
    const src = 'db.getGroups';

    const sqlSelect = "SELECT * FROM `groups` WHERE companyId = ?";
    const select_query = mysql.format(sqlSelect, [decodeId(encodedCompanyId)]);

    try {
        let groups = await pool.query(select_query);
        groups = groups[0];
        if(!groups[0]) return false;
        groups.forEach(group => {
            group.id = encodeId(group.id);
            delete group.companyId;
            return group;
        });
        return groups;
    } catch (err) {
        logErrors(src, [err]);
        return false;
    }
}

module.exports.updateGroup = async function (groupName, encodedGroupId) {
    const src = 'db.renameGroup';

    const sqlUpdate = "UPDATE `groups` SET name = ? WHERE id = ?";
    const update_query = mysql.format(sqlUpdate, [groupName, decodeId(encodedGroupId)]);

    try {
        const data = await pool.query(update_query);
        return true;
    } catch (err) {
        logErrors(src, [err]);
        return false;
    }
}

module.exports.deleteGroup = async function (encodedGroupId) {
    const src = 'db.deleteGroup';

    const sqlDelete = "DELETE FROM `groups` WHERE id = ?";
    const delete_query = mysql.format(sqlDelete, [decodeId(encodedGroupId)]);

    try {
        await pool.query(delete_query);
        return true;
    }
    catch (err) {
        logErrors(src, [err]);
        return false;
    }
}

module.exports.createService = async function (serviceName, encodedGroupId, encodedCompanyId) {
    const src = 'db.createService';
    
    const sqlInsert = "INSERT INTO `services` VALUES (NULL,?,?,?)";
    const insert_query = mysql.format(sqlInsert, [serviceName, decodeId(encodedGroupId), decodeId(encodedCompanyId)]);

    try {
        const result = await pool.query(insert_query);
        return encodeId(result[0].insertId);
    } catch (err) {
        logErrors(src, [err]);
        return false;
    }
}

module.exports.updateService = async function (serviceName, encodedServiceId) {
    const src = 'db.updateService';

    const sqlUpdate = "UPDATE `services` SET name = ? WHERE id = ?";
    const update_query = mysql.format(sqlUpdate, [serviceName, decodeId(encodedServiceId)]);

    try {
        const data = await pool.query(update_query);
        return true;
    } catch (err) {
        logErrors(src, [err]);
        return false;
    }
}

module.exports.getServices = async function (encodedGroupId) {
    const src = 'db.getServices';

    const sqlSelect = "SELECT * FROM `services` WHERE groupId = ?";
    const select_query = mysql.format(sqlSelect, [decodeId(encodedGroupId)]);

    try {
        let services = await pool.query(select_query);
        services = services[0];
        if(!services[0]) return false;
        services.forEach(service => {
            service.id = encodeId(service.id);
            service.groupId = encodeId(service.groupId);
            delete service.companyId;
            return service;
        });
        return services;
    } catch (err) {
        logErrors(src, [err]);
        return false;
    }

}

module.exports.deleteService = async function (encodedServiceId) {
    const src = 'db.deleteService';

    const sqlDelete = "DELETE FROM services WHERE id = ?";
    const delete_query = mysql.format(sqlDelete, [decodeId(encodedServiceId)]);

    try {
        await pool.query(delete_query);
        return true;
    }
    catch (err) {
        logErrors(src, [err]);
        return false;
    }
}

module.exports.createPrompt = async function (promptName, promptText, position, encodedServiceId, encodedCompanyId) {
    const src = 'db.createPrompt';
    
    const sqlInsert = "INSERT INTO prompts VALUES (NULL,?,?,?,?,?)";
    const insert_query = mysql.format(sqlInsert, [promptName, promptText, position, decodeId(encodedServiceId), decodeId(encodedCompanyId)]);

    try {
        const result = await pool.query(insert_query);
        return encodeId(result[0].insertId);
    } catch (err) {
        logErrors(src, [err]);
        return false;
    }
}

module.exports.updatePrompt = async function (promptName, promptText, position, encodedPromptId) {
    const src = 'db.updatePrompt';

    const sqlUpdate = "UPDATE prompts SET name = ?, promptText = ?, position = ? WHERE id = ?";
    const update_query = mysql.format(sqlUpdate, [promptName, promptText, position, decodeId(encodedPromptId)]);

    try {
        const data = await pool.query(update_query);
        return true;
    } catch (err) {
        logErrors(src, [err]);
        return false;
    }
}

module.exports.getPrompts = async function (encodedServiceId) {
    const src = 'db.getPrompts';

    const sqlSelect = "SELECT * FROM prompts WHERE serviceId = ?";
    const select_query = mysql.format(sqlSelect, [decodeId(encodedServiceId)]);

    try {
        let prompts = await pool.query(select_query);
        prompts = prompts[0];
        if(!prompts[0]) return false;
        prompts.forEach(prompt => {
            prompt.id = encodeId(prompt.id);
            prompt.serviceId = encodeId(prompt.serviceId);
            delete prompt.companyId;
            return prompt;
        });
        return prompts;
    } catch (err) {
        logErrors(src, [err]);
        return false;
    }
}

module.exports.deletePrompt = async function (encodedPromptId) {
    const src = 'db.deletePrompt';

    const sqlDelete = "DELETE FROM prompts WHERE id = ?";
    const delete_query = mysql.format(sqlDelete, [decodeId(encodedPromptId)]);

    try {
        await pool.query(delete_query);
        return true;
    }
    catch (err) {
        logErrors(src, [err]);
        return false;
    }
}

module.exports.createAnswer = async function (answerText, color, encodedPromptId, encodedCompanyId) {
    const src = 'db.createAnswer';
    
    const sqlInsert = "INSERT INTO answers VALUES (NULL,?,?,?,?)";
    const insert_query = mysql.format(sqlInsert, [answerText, color, decodeId(encodedPromptId), decodeId(encodedCompanyId)]);

    try {
        const result = await pool.query(insert_query);
        return encodeId(result[0].insertId);
    } catch (err) {
        logErrors(src, [err]);
        return false;
    }
}

module.exports.updateAnswer = async function (answerText, color, encodedAnswerId) {
    const src = 'db.updateAnswer';

    const sqlUpdate = "UPDATE answers SET answerText = ?, color = ? WHERE id = ?";
    const update_query = mysql.format(sqlUpdate, [answerText, color, decodeId(encodedAnswerId)]);

    try {
        const data = await pool.query(update_query);
        return true;
    } catch (err) {
        logErrors(src, [err]);
        return false;
    }
}

module.exports.getAnswers = async function (encodedPromptId) {
    const src = 'db.getAnswers';

    const sqlSelect = "SELECT * FROM answers WHERE promptId = ?";
    const select_query = mysql.format(sqlSelect, [decodeId(encodedPromptId)]);

    try {
        let answers = await pool.query(select_query);
        answers = answers[0];
        if(!answers[0]) return false;
        answers.forEach(answer => {
            answer.id = encodeId(answer.id);
            answer.promptId = encodeId(answer.promptId);
            delete answer.companyId;
            return answer;
        });
        return answers;
    } catch (err) {
        logErrors(src, [err]);
        return false;
    }
}

module.exports.deleteAnswer = async function (encodedAnswerId) {
    const src = 'db.deleteAnswer';

    const sqlDelete = "DELETE FROM answers WHERE id = ?";
    const delete_query = mysql.format(sqlDelete, [decodeId(encodedAnswerId)]);

    try {
        await pool.query(delete_query);
        return true;
    }
    catch (err) {
        logErrors(src, [err]);
        return false;
    }
}