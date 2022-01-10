const express = require("express");
const app = express();
require("dotenv").config();
const bcrypt = require("bcrypt");
const { verifyToken, generateAccessToken } = require("./util/jwt");
const { createUser, getUser, getCompany, createCompany, setPassword,
    deleteUser, updateCompanyOwner, createGroup, updateGroupName, createOrg, checkPassword } = require("./util/db");
const validator = require('./util/validate');
app.use(express.json());
const { encodeId, decodeId } = require('./util/hashid');

const port = process.env.PORT;

app.listen(port,
    () => console.log(`Server Started on port ${port}...`));



app.post('/register-org', async (req, res) => {

    const valid = validator.validateRegisterOrg(req.body);
    if (!valid) {
        res.sendStatus(400);
        return;
    }
    const result = await createOrg(req.body);
    if (result) {
        res.sendStatus(204);
        return;
    } else {
        res.sendStatus(500);
        return;
    }

});

app.post('/login', async (req, res) => {

    const { email, password } = req.body;
    let user = await checkPassword(email, password);
    if (!user) {
        res.sendStatus(401); // Incorrect password
        return;
    }

    const token = generateAccessToken(user);
    if (!token) {
        res.sendStatus(500); // Error generating token
    } else {
        res.status(200).json({ token: token }); // correct password
        return;
    }
});

// app.get('/user', async (req, res) => {

//     let user;
//     try {
//         user = verifyToken(req.body.token);
//     } catch (err) {
//         res.sendStatus(401); // could not verify token
//         return;
//     }
//     console.log(user);
//     res.status(200).json(user);
// });

app.put('/password', async (req, res) => {

    const { token, password, newPassword } = req.body;

    let user;
    try {
        user = verifyToken(token);
    } catch (err) {
        res.sendStatus(401); // could not verify token
        return;
    }

    let dbUser = await checkPassword(user.email, password);
    if(!dbUser) {
        res.sendStatus(401); // Password incorrect
        return;
    }
    
    let result = await setPassword(user.id, newPassword);
    if(!result) {
        res.sendStatus(500); // Error setting password
        return;
    } else {
        res.sendStatus(204); // Password set
        return;
    }

});

app.delete('/user', async (req, res) => {

    const { token, password } = req.body;

    let user;
    try {
        user = verifyToken(token);
    } catch (err) {
        res.sendStatus(401); // could not verify token
        return;
    }

    let dbUser = await checkPassword(user.email, password);
    if(!dbUser) {
        res.sendStatus(401); // password incorrect
        return;
    }

    const result = await deleteUser(user.id);
    if(!result) {
        res.sendStatus(500); // error deleting user
        return;
    } else {
        res.sendStatus(204); // user deleted
        return;
    }
});

app.post('/group', async (req, res) => {

    let user;
    try {
        user = verifyToken(req.body.token);
    } catch (err) {
        res.sendStatus(401); // could not verify token
        return;
    }

    let result;
    try {
        result = await createGroup(req.body.groupName, decodeId(user.company_id));
    } catch (err) {
        res.sendStatus(500); // Error creating group
        return;
    }
    if (result.affectedRows > 0) {
        res.sendStatus(204); // Created group
    } else {
        res.sendStatus(400); // Unable to create group
    }
    return;
});

app.put('/group-name', async (req, res) => {

    let user;
    try {
        user = verifyToken(req.body.token);
    } catch (err) {
        res.sendStatus(401); // could not verify token
        return;
    }

    let result = { affectedRows: 0 };
    try {
        result = await updateGroupName(decodeId(req.body.groupId));
    } catch (err) {
        res.sendStatus(500); // could not update group
        return;
    }
    if (result.affectedRows > 0) {
        res.sendStatus(204); // Updated group
        return;
    } else {
        res.sendStatus(400); // group not updated, no err
        return;
    }
});


