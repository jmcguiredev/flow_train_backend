const express = require("express");
const app = express();
require("dotenv").config();
const bcrypt = require("bcrypt");
const { verifyToken, generateAccessToken } = require("./util/jwt");
const { setPassword, deleteUser, createGroup, createOrg, checkPassword, getGroups,
    renameGroup } = require("./util/db");
const { schemas, validate } = require('./util/schema');
const { encodeId, decodeId } = require('./util/hashid');

const port = process.env.PORT;

app.use(express.json());

app.listen(port,
    () => console.log(`Server Started on port ${port}...`));



app.post('/register-org', async (req, res) => {

    const valid = validate(req.body, schemas.registerOrgSchema);
    if (!valid) {
        res.sendStatus(400); // bad request
        return;
    }
    const result = await createOrg(req.body);
    if (!result) {
        res.sendStatus(500); // err creating org
        return;
    } else {
        res.sendStatus(204); // created org
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
    if (!dbUser) {
        res.sendStatus(401); // Password incorrect
        return;
    }

    let result = await setPassword(user.id, newPassword);
    if (!result) {
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
    if (!dbUser) {
        res.sendStatus(401); // password incorrect
        return;
    }

    const result = await deleteUser(user.id);
    if (!result) {
        res.sendStatus(500); // error deleting user
        return;
    } else {
        res.sendStatus(204); // user deleted
        return;
    }
});

app.post('/group', async (req, res) => {

    let user = verifyToken(req.body.token);
    if (!user) {
        res.sendStatus(401); // token invalid
        return;
    }

    const { groupName } = req.body;
    const valid = validate({ groupName }, schemas.createGroupSchema);
    if (!valid) {
        res.sendStatus(400); // bad request
        return;
    }
    const { company_id } = user;
    let result = await createGroup(groupName, company_id);
    if (!result) {
        res.sendStatus(500); // err creating group
        return;
    } else {
        res.sendStatus(204); // created group
        return;
    }

});

app.get('/groups', async (req, res) => {

    let user = verifyToken(req.body.token);
    if (!user) {
        res.sendStatus(401); // token invalid
        return;
    }

    const { company_id } = user;
    const groups = await getGroups(company_id);
    if (!groups) {
        res.sendStatus(500); // err getting groups
        return;
    } else {
        res.json({ groups });
        return;
    }
});

app.put('/group-name', async (req, res) => {

    let user = verifyToken(req.body.token);
    if (!user) {
        res.sendStatus(401); // token invalid
        return;
    }

    const { groupName, groupId } = req.body;
    const valid = validate({ groupName, groupId }, schemas.renameGroupSchema);
    if (!valid) {
        res.sendStatus(400); // bad request
        return;
    }

    const { company_id } = user;
    const result = await renameGroup(groupName, groupId, company_id);

    if (!result) {
        res.sendStatus(500); // unable to update group, possibly due to company_id mismatch
        return;
    } else {
        res.sendStatus(204); // group updated
        return;
    }
});


