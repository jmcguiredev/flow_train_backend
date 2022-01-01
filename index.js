const express = require("express");
const app = express();
require("dotenv").config();
const bcrypt = require("bcrypt");
const { verifyToken, generateAccessToken } = require("./util/jwt");
const { createUser, getUser, getCompany, createCompany, setPassword, deleteUser } = require("./util/db");
app.use(express.json());

const port = process.env.PORT;

// .getConnection((err, connection) => {
//     if (err) throw (err)
//     console.log("DB connected successful: " + connection.threadId);
// });

app.listen(port,
    () => console.log(`Server Started on port ${port}...`));




app.post('/register', async (req, res) => {

    const username = req.body.username;
    const password = req.body.password;
    const isAdmin = req.body.isAdmin;
    const companyName = req.body.companyName;
    let company_id = req.body.company_id;

    let hashedPassword;
    try {
        hashedPassword = await bcrypt.hash(password, 10);
    } catch (err) {
        res.status(400).sendStatus(500); // error hashing password
        return;
    }

    let user;
    try {
        user = await getUser(username);
    } catch (err) {
        res.sendStatus(500); // User SQL query error
        return;
    }
    if (user) {
        res.sendStatus(409); // Username already taken
        return;
    }

    if (!isAdmin) {
        // Creating 'Agent' user account
        // Check if company exists
        let company;
        try {
            company = await getCompany(company_id);
        } catch (err) {
            res.sendStatus(400); // User is not admin, but provided company ID does not exist
            return;
        }
        if (!company) {
            res.sendStatus(400); // no SQL err, but company ID not found
            return;
        }

        // Create User
        let newUserId;
        try {
            newUserId = await createUser(username, hashedPassword, company_id, isAdmin);
        } catch (err) {
            res.sendStatus(400); // createUser SQL error
            return;
        }
        if (newUserId) {
            res.sendStatus(204); // User created successfully
            return;
        } else {
            res.sendStatus(409); // no SQL error, but no user ID provided back
            return;
        }

    } else if (isAdmin) {
        // Creating 'Admin' user account
        let newCompanyId;
        try {
            newCompanyId = await createCompany(companyName); // create company
        } catch (err) {
            res.send(500); // SQL error creating company
        }
        if (!newCompanyId) {
            res.send(409); // confilt, no ID provided
        }
        // Create User
        let newUserId;
        try {
            newUserId = await createUser(username, hashedPassword, newCompanyId, isAdmin);
        } catch (err) {
            res.sendStatus(400); // createUser SQL error
            return;
        }
        if (newUserId) {
            res.sendStatus(204); // User created successfully
            return;
        } else {
            res.sendStatus(409); // no SQL error, but no user ID provided back
            return;
        }
    } else {
        res.sendStatus(400); // Invalid isAdmin field
    }
});

app.get('/login', async (req, res) => {

    const username = req.body.username;
    const password = req.body.password;

    let user;
    try {
        user = await getUser(username);
    } catch (err) {
        res.sendStatus(500); // getUser SQL error
        return;
    }
    if (!user) {
        res.sendStatus(401); // Unauthorized - could not find user
        return;
    }

    const hashedPassword = user.password;
    let isCorrect;
    try {
        isCorrect = await bcrypt.compare(password, hashedPassword);
    } catch (err) {
        res.sendStatus(500); // Error comparing hash
        return;
    }
    if (isCorrect) {
        const token = generateAccessToken(username);
        res.status(200).json({ token: token }); // correct password
    } else {
        res.sendStatus(401); // incorrect password
    }

});

app.get('/user', async (req, res) => {

    let username;
    try {
        username = verifyToken(req.body.token);
    } catch (err) {
        res.sendStatus(401); // could not verify token
        return;
    }

    let user;
    try {
        user = await getUser(username, );
    } catch (err) {
        res.sendStatus(500); // SQL error getting user
        return;
    }
    if (!user) {
        res.sendStatus(404); // user not found
        return;
    }
    res.status(200).json({
        username: user.username,
        company_id: user.company_id,
        isAdmin: user.isAdmin
    }).send();
});

app.put('/password', async (req, res) => {

    let username;
    try {
        username = verifyToken(req.body.token);
    } catch (err) {
        res.sendStatus(401); // could not verify token
        return;
    }

    let user;
    try {
        user = await getUser(username, );
    } catch (err) {
        res.sendStatus(500); // SQL error getting user
        return;
    }
    if (!user) {
        res.sendStatus(404); // user not found
        return;
    }

    const hashedPassword = user.password;
    let isEqual;
    try {
        isEqual = bcrypt.compare(req.body.password, hashedPassword);
    } catch (err) {
        res.sendStatus(500); // error comparing hash
        return;
    }
    if (!isEqual) {
        res.sendStatus(401); // Incorrect password
        return;
    }


    let newHashedPassword;
    try {
        newHashedPassword = await bcrypt.hash(req.body.newPassword, 10);
    } catch (err) {
        res.sendStatus(500); // error hashing password
        return;
    }
    try {
        const data = await setPassword(username, newHashedPassword, );
        console.log(data);
        res.sendStatus(204); // updated password
    } catch(err) {
        res.sendStatus(409); // Unable to update password
    }
    
});

app.delete('/user', async (req, res) => {

    let username;
    try {
        username = verifyToken(req.body.token);
    } catch (err) {
        res.sendStatus(401); // could not verify token
        return;
    }

    let result;
    try { 
        result = await deleteUser(username, );
    } catch(err) {
        res.sendStatus(500); // Error deleting user
        return;
    }
    if (!result) {
        res.sendStatus(400); // Could not find user
        return;
    }

    if (result.affectedRows > 0) {
        res.sendStatus(204); // User deleted
    } else {
        res.sendStatus(400); // User not found
    }
});

app.post('/group', (req, res) => {

    let username;
    try {
        username = verifyToken(req.body.token);
    } catch (err) {
        res.sendStatus(401); // could not verify token
        return;
    }


});

