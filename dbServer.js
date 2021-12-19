const express = require("express");
const app = express();
const mysql = require("mysql");
require("dotenv").config();
const bcrypt = require("bcrypt");
app.use(express.json());

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_DATABASE = process.env.DB_DATABASE;
const DB_PORT = process.env.DB_PORT;
const DB_USERS_TABLE = process.env.DB_USERS_TABLE;
const port = process.env.PORT;

const db = mysql.createPool({
    connectionLimit: 100,
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_DATABASE,
    port: DB_PORT
});

db.getConnection((err, connection) => {
    if (err) throw (err)
    console.log("DB connected successful: " + connection.threadId);
});

app.listen(port,
    () => console.log(`Server Started on port ${port}...`));


app.post('/register', async (req, res) => {

    const user = req.body.username;
    let hashedPassword = "";

    try {
        hashedPassword = await bcrypt.hash(req.body.password, 10);
    } catch (err) {
        console.log('ERROR, ERROR: ', err);
    }


    db.getConnection(async (err, connection) => {

        if (err) throw (err);

        const sqlSearch = `SELECT * FROM ${DB_USERS_TABLE} WHERE username = ?`;
        const search_query = mysql.format(sqlSearch, [user]);
        const sqlInsert = `INSERT INTO ${DB_USERS_TABLE} VALUES (NULL,?,?)`;
        const insert_query = mysql.format(sqlInsert, [user, hashedPassword]);

        await connection.query(search_query, async (err, result) => {

            if (err) throw (err);
            console.log("------> Search Results");
            console.log(result.length);

            if (result.length != 0) {
                connection.release();
                console.log("------> User already exists");
                res.sendStatus(409);
            }
            else {
                await connection.query(insert_query, (err, result) => {
                    connection.release();
                    if (err) throw (err);
                    console.log("--------> Created new User");
                    console.log(result.insertId);
                    res.sendStatus(201);
                });
            }
        });
    });
});