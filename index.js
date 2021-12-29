const express = require("express");
const app = express();
const mysql = require("mysql");
const util = require('util');
require("dotenv").config();
const bcrypt = require("bcrypt");
const { verifyToken, generateAccessToken } = require("./util/jwt");
const { createUser, getUser, getCompany, createCompany, setPassword } = require("./util/db");
app.use(express.json());

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_DATABASE = process.env.DB_DATABASE;
const DB_PORT = process.env.DB_PORT;
const port = process.env.PORT;

const pool = mysql.createPool({
    connectionLimit: 100,
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_DATABASE,
    port: DB_PORT
});

pool.query = util.promisify(pool.query);

pool.getConnection((err, connection) => {
    if (err) throw (err)
    console.log("DB connected successful: " + connection.threadId);
});

app.listen(port,
    () => console.log(`Server Started on port ${port}...`));




app.post('/register', async (req, res) => {

    const username = req.body.username;
    const password = req.body.password;
    const isAdmin = req.body.isAdmin;
    const companyName = req.body.companyName;
    let company_id = req.body.company_id;

    let hashedPassword = "";

    try {
        hashedPassword = await bcrypt.hash(password, 10);
    } catch (err) {
        console.log('Password Hash Error: ', err);
        res.send(401);
        return;
    }

    const user = await getUser(username, pool);
    if (user) {
        console.log("------> User already exists");
        res.sendStatus(409);
        return;
    }

    if (!isAdmin) {
        // Creating 'Agent' user account

        // Check if company exists
        const company = await getCompany(company_id, pool);

        if (company) {
            // Create User
            const user = await createUser(username, hashedPassword, company_id, isAdmin, pool, res);
            if (user.insertId) {
                console.log("--------> Created new User");
                res.sendStatus(201);
            } else {
                console.log('Could not create user: ', user.sqlMessage);
            }

        } else {
            console.log('Could not find company: ', company.sqlMessage);
            res.status(409).send('Invalid Company ID');
        }
    } else if (isAdmin) {
        // Creating 'Admin' user account

        const company = await createCompany(companyName, pool);
        if (company.insertId) {
            console.log("--------> Created new Company");
            company_id = company.insertId;
            // Create User
            const user = await createUser(username, hashedPassword, company_id, isAdmin, pool, res);
            if (user.insertId) {
                console.log("--------> Created new User");
                res.sendStatus(201);
            } else {
                console.log('Could not create user: ', user.sqlMessage);
                res.status(400).send('Could not create user')
            }
        } else {
            console.log('Could not create company: ', company.sqlMessage);
            res.status(400).send('Could not create company');
        }
    } else {
        res.status(400).send('Invalid Request');
    }

    
    

});

app.get('/login', async (req, res) => {

    const username = req.body.username;
    const password = req.body.password;

    const user = await getUser(username, pool);
    if (user) {
        const hashedPassword = user.password;
        const isCorrect = await bcrypt.compare(password, hashedPassword);
        if (isCorrect) {
            // correct password
            const token = generateAccessToken(username);
            res.status(200).json({ accessToken: token });
        } else {
            // incorrect password
            res.status(401).send('Username or Password Incorrect');
        }
    } else {
        res.status(401).send('Username or Password Incorrect');
        return;
    }
});

app.get('/user', async (req, res) => {

    const { type, message, username } = verifyToken(req.body.token);
    if(type === 'expired' || type === 'invalid') {
        res.status(401).send('Unauthorized');
        return;
    }
        const user = await getUser(username, pool);
        res.status(200).json({ 
            username: user.username,
            company_id: user.company_id,
            isAdmin: user.isAdmin
        }).send();
    
    console.log(message);
});

app.put('/password', async (req, res) => {

    const { type, message, username } = verifyToken(req.body.token);
    if(type === 'expired' || type === 'invalid') {
        res.status(401).send('Unauthorized');
        return;
    }

    const user = await getUser(username, pool);
    const hashedPassword = user.password;
    const isEqual = bcrypt.compare(req.body.password, hashedPassword);
    if(isEqual) {
        const newHashedPassword = await bcrypt.hash(req.body.newPassword, 10);
        const data = await setPassword(username, req.body.newPassword, pool);
        res.status(204).send('Updated Password');
    } else {
        res.status(400).send('Incorrect Password');
    }
    
});

