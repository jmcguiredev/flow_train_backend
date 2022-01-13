const express = require("express");
const app = express();
require("dotenv").config();
const bcrypt = require("bcrypt");
const { verifyToken, generateAccessToken } = require("./util/jwt");
const { setPassword, deleteUser, createGroup, createOrg, checkPassword, getGroups,
    renameGroup, 
    createService,
    getServices} = require("./util/db");
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
    const valid = validate({ groupName, role }, schemas.createGroupSchema);
    if (!valid) {
        res.sendStatus(400); // bad request
        return;
    }
    const { companyId } = user;
    let groupId = await createGroup(groupName, companyId);
    if (!groupId) {
        res.sendStatus(500); // err creating group
        return;
    } else {
        res.json({ groupName, groupId }); // created group
        return;
    }

});

app.get('/groups', async (req, res) => {

    let user = verifyToken(req.body.token);
    if (!user) {
        res.sendStatus(401); // token invalid
        return;
    }

    const { companyId } = user;
    const groups = await getGroups(companyId);
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

    const { groupName, groupId, role } = req.body;
    const valid = validate({ groupName, groupId, role }, schemas.renameGroupSchema);
    if (!valid) {
        res.sendStatus(400); // bad request
        return;
    }

    const { companyId } = user;
    const result = await renameGroup(groupName, groupId, companyId);

    if (!result) {
        res.sendStatus(500); // unable to update group, possibly due to companyId mismatch
        return;
    } else {
        res.json({ groupName, groupId }); // group updated
        return;
    }
});

app.post('/service', async (req, res) => {

    let user = verifyToken(req.body.token);
    if (!user) {
        res.sendStatus(401); // token invalid
        return;
    }

    const { serviceName, groupId } = req.body;
    let { companyId, role } = user;
    let valid = validate({ serviceName, groupId, companyId, role }, schemas.createServiceSchema);
    if(!valid) {
        res.sendStatus(400); // bad request
        return;
    } 
    const serviceId = await createService(serviceName, groupId, companyId);
    if(!serviceId) {
        res.sendStatus(500); // err creating service
        return;
    } else {
        res.json({ serviceName, serviceId });
        return;
    }
});

app.get('/services', async (req, res) => {

    let user = verifyToken(req.body.token);
    if (!user) {
        res.sendStatus(401); // token invalid
        return;
    }

    const { groupId } = req.body;
    const { companyId } = user;
    const services = await getServices(groupId, companyId);
    if(!services) {
        res.sendStatus(500); // err getting services
        return;
    } else {
        res.json({ services });
        return;
    }
});


