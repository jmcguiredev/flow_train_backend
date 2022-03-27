const express = require("express");
const app = express();
require("dotenv").config();
const {verifyToken, generateAccessToken} = require("./util/jwt");
const {
    setPassword, deleteUser, createGroup, createOrg, checkPassword, getGroups,
    createService,
    getServices,
    verifyPermission,
    updateService,
    updateGroup,
    deleteGroup,
    deleteService,
    createPrompt,
    updatePrompt,
    getPrompts,
    deletePrompt,
    createAnswer,
    updateAnswer,
    getAnswers,
    deleteAnswer, createSnippet, updateSnippet, getSnippets, deleteSnippet, createAction
} = require("./util/db");
const {schemas, validate} = require('./util/schema');

const port = process.env.PORT;
app.use(express.json());
app.listen(port, () => console.log(`Server Started on port ${port}...`));

const { MysqlErrorCodes } = require('mysql-error-codes');
console.log(MysqlErrorCodes);


app.post('/register-org', async (req, res) => {

    const valid = validate(req.body, schemas.registerOrgSchema);
    if (!valid) {
        res.sendStatus(400); // bad request
        return;
    }

    const {email, password, firstName, lastName, companyName} = req.body;

    const result = await createOrg({email, password, firstName, lastName, companyName});
    if (!result) {
        res.sendStatus(500); // err creating org
        return;
    } else {
        res.sendStatus(201); // created org
        return;
    }

});

app.post('/login', async (req, res) => {

    const {email, password} = req.body;
    let user = await checkPassword(email, password);
    if (!user) {
        res.sendStatus(401); // Incorrect password
        return;
    }

    const token = generateAccessToken(user);
    if (!token) {
        res.sendStatus(500); // Error generating token
    } else {
        res.json({token: token}); // correct password
        return;
    }
});

app.put('/password', async (req, res) => {

    const {token, password, newPassword} = req.body;

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

    const {token, password} = req.body;

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

    const {groupName} = req.body;
    const {companyId, role} = user;

    if (!isAdmin(role)) {
        res.sendStatus(403);
        return;
    }

    const valid = validate({groupName}, schemas.createGroupSchema);
    if (!valid) {
        res.sendStatus(400); // bad request
        return;
    }
    let groupId = await createGroup(groupName, companyId);
    if (!groupId) {
        res.sendStatus(500); // err creating group
        return;
    } else {
        res.status(201).json({groupName, id: groupId}); // created group
        return;
    }

});

app.get('/groups', async (req, res) => {

    let user = verifyToken(req.body.token);
    if (!user) {
        res.sendStatus(401); // token invalid
        return;
    }

    const {companyId} = user;
    const groups = await getGroups(companyId);
    if (!groups) {
        res.sendStatus(500); // err getting groups
        return;
    } else {
        res.json({groups});
        return;
    }
});

app.put('/group', async (req, res) => {

    let user = verifyToken(req.body.token);
    if (!user) {
        res.sendStatus(401); // token invalid
        return;
    }

    const {groupName, groupId, role} = req.body;
    const {companyId} = user;

    const valid = validate({groupName, groupId}, schemas.updateGroupSchema);
    if (!valid) {
        res.sendStatus(400); // bad request
        return;
    }

    const authorized = await verifyPermission('groups', groupId, companyId);
    if (!isAdmin(role) || !authorized) {
        res.sendStatus(403); // forbidden
        return;
    }

    const result = await updateGroup(groupName, groupId);
    if (!result) {
        res.sendStatus(500); // err updating group
        return;
    } else {
        res.json({groupName, id: groupId}); // group updated
        return;
    }
});

app.delete('/group', async (req, res) => {

    let user = verifyToken(req.body.token);
    if (!user) {
        res.sendStatus(401); // token invalid
        return;
    }

    const {groupId} = req.body;
    const {companyId, role} = user;

    const valid = validate(groupId, schemas.encodedIdSchema);
    if (!valid) {
        res.sendStatus(400); // bad request
        return;
    }

    const authorized = await verifyPermission('groups', groupId, companyId);
    if (!isAdmin(role) || !authorized) {
        res.sendStatus(403); // forbidden
        return;
    }

    const result = await deleteGroup(groupId);
    if (!result) {
        res.sendStatus(500); // err updating group
        return;
    } else {
        res.sendStatus(204); // group updated
        return;
    }
});

app.post('/service', async (req, res) => {

    let user = verifyToken(req.body.token);
    if (!user) {
        res.sendStatus(401); // token invalid
        return;
    }

    const {serviceName, groupId} = req.body;
    const {companyId, role} = user;

    let valid = validate({serviceName, groupId}, schemas.createServiceSchema);
    if (!valid) {
        res.sendStatus(400); // bad request
        return;
    }

    const authorized = await verifyPermission('groups', groupId, companyId);
    if (!isAdmin(role) || !authorized) {
        res.sendStatus(403); // forbidden
        return;
    }

    const serviceId = await createService(serviceName, groupId, companyId);
    if (!serviceId) {
        res.sendStatus(500); // err creating service
        return;
    } else {
        res.status(201).json({serviceName, groupId, id: serviceId});
        return;
    }
});


app.put('/service', async (req, res) => {

    let user = verifyToken(req.body.token);
    if (!user) {
        res.sendStatus(401); // token invalid
        return;
    }

    const {serviceName, serviceId} = req.body;
    const {companyId, role} = user;

    let valid = validate({serviceName, serviceId}, schemas.updateServiceSchema);
    if (!valid) {
        res.sendStatus(400); // bad request
        return;
    }

    const authorized = await verifyPermission('services', serviceId, companyId);
    if (!isAdmin(role) || !authorized) {
        res.sendStatus(403); // forbidden
        return;
    }

    const service = await updateService(serviceName, serviceId);
    if (!service) {
        res.sendStatus(500); // err updating service
        return;
    } else {
        res.json({serviceName, id: serviceId});
        return;
    }

});

app.get('/services', async (req, res) => {

    let user = verifyToken(req.body.token);
    if (!user) {
        res.sendStatus(401); // token invalid
        return;
    }

    const {groupId} = req.body;
    const {companyId} = user;

    const valid = validate(groupId, schemas.encodedIdSchema);
    if (!valid) {
        res.sendStatus(400); // bad req
        return;
    }

    const authorized = await verifyPermission('groups', groupId, companyId);
    if (!authorized) {
        res.sendStatus(403); // forbidden
        return;
    }

    const services = await getServices(groupId);
    if (!services) {
        res.sendStatus(500); // err getting services
        return;
    } else {
        res.json({services});
        return;
    }
});

app.delete('/service', async (req, res) => {

    let user = verifyToken(req.body.token);
    if (!user) {
        res.sendStatus(401); // token invalid
        return;
    }

    const {serviceId} = req.body;
    const {companyId, role} = user;

    const valid = validate(serviceId, schemas.encodedIdSchema);
    if (!valid) {
        res.sendStatus(400); // bad request
        return;
    }

    const authorized = await verifyPermission('services', serviceId, companyId);
    if (!isAdmin(role) || !authorized) {
        res.sendStatus(403); // forbidden
        return;
    }

    const result = await deleteService(serviceId);
    if (!result) {
        res.sendStatus(500); // err updating group
        return;
    } else {
        res.sendStatus(204); // service updated
        return;
    }
});

app.post('/prompt', async (req, res) => {

    let user = verifyToken(req.body.token);
    if (!user) {
        res.sendStatus(401); // token invalid
        return;
    }

    const {promptName, promptText, position, serviceId} = req.body;
    const {companyId, role} = user;

    let valid = validate({promptName, promptText, position, serviceId}, schemas.createPromptSchema);
    if (!valid) {
        res.sendStatus(400); // bad request
        return;
    }

    const authorized = await verifyPermission('services', serviceId, companyId);
    if (!isAdmin(role) || !authorized) {
        res.sendStatus(403); // forbidden
        return;
    }

    const promptId = await createPrompt(promptName, promptText, position, serviceId, companyId);
    if (!promptId) {
        res.sendStatus(500); // err creating service
        return;
    } else {
        res.status(201).json({promptName, promptText, position, serviceId, id: promptId});
        return;
    }
});

app.put('/prompt', async (req, res) => {

    let user = verifyToken(req.body.token);
    if (!user) {
        res.sendStatus(401); // token invalid
        return;
    }

    const {promptName, promptText, position, promptId} = req.body;
    const {companyId, role} = user;

    let valid = validate({promptName, promptText, position, promptId}, schemas.updatePromptSchema);
    if (!valid) {
        res.sendStatus(400); // bad request
        return;
    }

    const authorized = await verifyPermission('prompts', promptId, companyId);
    if (!isAdmin(role) || !authorized) {
        res.sendStatus(403); // forbidden
        return;
    }

    const prompt = await updatePrompt(promptName, promptText, position, promptId);
    if (!prompt) {
        res.sendStatus(500); // err updating service
        return;
    } else {
        res.json({promptName, promptText, position, id: promptId});
        return;
    }
});

app.get('/prompts', async (req, res) => {

    let user = verifyToken(req.body.token);
    if (!user) {
        res.sendStatus(401); // token invalid
        return;
    }

    const {serviceId} = req.body;
    const {companyId, role} = user;

    const valid = validate(serviceId, schemas.encodedIdSchema);
    if (!valid) {
        res.sendStatus(400); // bad req
        return;
    }

    const authorized = await verifyPermission('services', serviceId, companyId);
    if (!isAdmin(role) || !authorized) {
        res.sendStatus(403); // forbidden
        return;
    }

    const prompts = await getPrompts(serviceId);
    if (!prompts) {
        res.sendStatus(500); // err getting prompts
        return;
    } else {
        res.json({prompts});
        return;
    }
});

app.delete('/prompt', async (req, res) => {

    let user = verifyToken(req.body.token);
    if (!user) {
        res.sendStatus(401); // token invalid
        return;
    }

    const {promptId} = req.body;
    const {companyId, role} = user;

    const valid = validate(promptId, schemas.encodedIdSchema);
    if (!valid) {
        res.sendStatus(400); // bad request
        return;
    }

    const authorized = await verifyPermission('prompts', promptId, companyId);
    if (!isAdmin(role) || !authorized) {
        res.sendStatus(403); // forbidden
        return;
    }

    const result = await deletePrompt(promptId);
    if (!result) {
        res.sendStatus(500); // err updating group
        return;
    } else {
        res.sendStatus(204); // group updated
        return;
    }
});

app.post('/answer', async (req, res) => {

    let user = verifyToken(req.body.token);
    if (!user) {
        res.sendStatus(401); // token invalid
        return;
    }

    const {answerText, color, promptId} = req.body;
    const {companyId, role} = user;

    let valid = validate({answerText, color, promptId}, schemas.createAnswerSchema);
    if (!valid) {
        res.sendStatus(400); // bad request
        return;
    }

    const authorized = await verifyPermission('prompts', promptId, companyId);
    if (!isAdmin(role) || !authorized) {
        res.sendStatus(403); // forbidden
        return;
    }

    const answerId = await createAnswer(answerText, color, promptId, companyId);
    if (!answerId) {
        res.sendStatus(500); // err creating service
        return;
    } else {
        res.status(201).json({answerText, color, promptId, id: answerId});
        return;
    }
});

app.put('/answer', async (req, res) => {

    let user = verifyToken(req.body.token);
    if (!user) {
        res.sendStatus(401); // token invalid
        return;
    }

    const {answerText, color, answerId} = req.body;
    const {companyId, role} = user;

    let valid = validate({answerText, color, answerId}, schemas.updateAnswerSchema);
    if (!valid) {
        res.sendStatus(400); // bad request
        return;
    }

    const authorized = await verifyPermission('answers', answerId, companyId);
    if (!isAdmin(role) || !authorized) {
        res.sendStatus(403); // forbidden
        return;
    }

    const answer = await updateAnswer(answerText, color, answerId);
    if (!answer) {
        res.sendStatus(500); // err updating service
        return;
    } else {
        res.json({answerText, color, id: answerId});
        return;
    }
});

app.get('/answers', async (req, res) => {

    let user = verifyToken(req.body.token);
    if (!user) {
        res.sendStatus(401); // token invalid
        return;
    }

    const {promptId} = req.body;
    const {companyId, role} = user;

    const valid = validate(promptId, schemas.encodedIdSchema);
    if (!valid) {
        res.sendStatus(400); // bad req
        return;
    }

    const authorized = await verifyPermission('prompts', promptId, companyId);
    if (!isAdmin(role) || !authorized) {
        res.sendStatus(403); // forbidden
        return;
    }

    const answers = await getAnswers(promptId);
    if (!answers) {
        res.sendStatus(500); // err getting answers
        return;
    } else {
        res.json({answers});
        return;
    }
});

app.delete('/answer', async (req, res) => {

    let user = verifyToken(req.body.token);
    if (!user) {
        res.sendStatus(401); // token invalid
        return;
    }

    const {answerId} = req.body;
    const {companyId, role} = user;

    const valid = validate(answerId, schemas.encodedIdSchema);
    if (!valid) {
        res.sendStatus(400); // bad request
        return;
    }


    const authorized = await verifyPermission('answers', answerId, companyId);
    if (!isAdmin(role) || !authorized) {
        res.sendStatus(403); // forbidden
        return;
    }

    const result = await deleteAnswer(answerId);
    if (!result) {
        res.sendStatus(500); // err updating group
        return;
    } else {
        res.sendStatus(204); // group updated
        return;
    }
});

app.post('/snippet', async (req, res) => {

    let user = verifyToken(req.body.token);
    if (!user) {
        res.sendStatus(401); // token invalid
        return;
    }

    const {name, markdown, ownerType, ownerId} = req.body;
    const {companyId, role} = user;

    let valid = validate({name, markdown, ownerType, ownerId}, schemas.createSnippetSchema);
    if (!valid) {
        res.sendStatus(400); // bad request
        return;
    }

    let authorized;
    switch (ownerType) {
        case 'company':
            authorized = await verifyPermission('companies', ownerId, companyId);
            break;
        case 'group':
            authorized = await verifyPermission('groups', ownerId, companyId);
            break;
        case 'service':
            authorized = await verifyPermission('services', ownerId, companyId);
    }

    if (!isAdmin(role) || !authorized) {
        res.sendStatus(403); // forbidden
        return;
    }

    const answerId = await createSnippet(name, markdown, ownerType, companyId, ownerId);
    if (!answerId) {
        res.sendStatus(500); // err creating service
        return;
    } else {
        res.status(201).json({name, markdown, ownerType, ownerId, id: answerId});
        return;
    }
});

app.put('/snippet', async (req, res) => {

    let user = verifyToken(req.body.token);
    if (!user) {
        res.sendStatus(401); // token invalid
        return;
    }

    const {name, markdown, ownerType, ownerId, snippetId} = req.body;
    const {companyId, role} = user;

    let valid = validate({name, markdown, ownerType, snippetId}, schemas.updateSnippetSchema);
    if (!valid) {
        res.sendStatus(400); // bad request
        return;
    }

    let authorized;
    switch (ownerType) {
        case 'company':
            authorized = await verifyPermission('company_snippets', snippetId, companyId);
            break;
        case 'group':
            authorized = await verifyPermission('group_snippets', snippetId, companyId);
            break;
        case 'service':
            authorized = await verifyPermission('service_snippets', snippetId, companyId);
    }

    if (!isAdmin(role) || !authorized) {
        res.sendStatus(403); // forbidden
        return;
    }

    const answer = await updateSnippet(name, markdown, ownerType, snippetId);
    if (!answer) {
        res.sendStatus(500); // err updating service
        return;
    } else {
        res.json({name, markdown, ownerType, ownerId, snippetId});
        return;
    }
});

app.get('/snippets', async (req, res) => {

    let user = verifyToken(req.body.token);
    if (!user) {
        res.sendStatus(401); // token invalid
        return;
    }

    const {ownerId, ownerType} = req.body;
    const {companyId, role} = user;

    const valid = validate(ownerId, schemas.encodedIdSchema);
    if (!valid) {
        res.sendStatus(400); // bad req
        return;
    }

    let authorized;
    switch (ownerType) {
        case 'company':
            authorized = await verifyPermission('companies', ownerId, companyId);
            break;
        case 'group':
            authorized = await verifyPermission('groups', ownerId, companyId);
            break;
        case 'service':
            authorized = await verifyPermission('services', ownerId, companyId);
    }

    if (!authorized) {
        res.sendStatus(403); // forbidden
        return;
    }

    const snippets = await getSnippets(ownerType, ownerId);
    if (!snippets) {
        res.sendStatus(500); // err getting answers
        return;
    } else {
        res.json({snippets});
        return;
    }
});

app.delete('/snippet', async (req, res) => {

    let user = verifyToken(req.body.token);
    if (!user) {
        res.sendStatus(401); // token invalid
        return;
    }

    const {ownerType, snippetId} = req.body;
    const {companyId, role} = user;

    const valid = validate(snippetId, schemas.encodedIdSchema);
    if (!valid) {
        res.sendStatus(400); // bad request
        return;
    }

    let authorized;
    switch (ownerType) {
        case 'company':
            authorized = await verifyPermission('company_snippets', snippetId, companyId);
            break;
        case 'group':
            authorized = await verifyPermission('group_snippets', snippetId, companyId);
            break;
        case 'service':
            authorized = await verifyPermission('service_snippets', snippetId, companyId);
    }

    if (!isAdmin(role) || !authorized) {
        res.sendStatus(403); // forbidden
        return;
    }

    const result = await deleteSnippet(ownerType, snippetId);
    if (!result) {
        res.sendStatus(500); // err updating group
        return;
    } else {
        res.sendStatus(204); // group updated
        return;
    }
});

app.post('/action', async (req, res) => {

    let user = verifyToken(req.body.token);
    if (!user) {
        res.sendStatus(401); // token invalid
        return;
    }

    const {actionType, ownerType, snippetId, answerId, ownerId} = req.body;
    const {companyId, role} = user;

    let valid = validate({actionType, ownerType, snippetId, answerId, ownerId}, schemas.createActionSchema);
    if (!valid) {
        res.sendStatus(400); // bad request
        return;
    }

    let authorized;
    switch (ownerType) {
        case 'company':
            authorized = await verifyPermission('companies', ownerId, companyId);
            break;
        case 'group':
            authorized = await verifyPermission('groups', ownerId, companyId);
            break;
        case 'service':
            authorized = await verifyPermission('services', ownerId, companyId);
    }

    if (!isAdmin(role) || !authorized) {
        res.sendStatus(403); // forbidden
        return;
    }

    const actionId = await createAction(actionType, ownerType, snippetId, answerId, companyId, ownerId);
    if (!actionId) {
        res.sendStatus(500); // err creating service
        return;
    } else {
        res.status(201).json({actionType, ownerType, snippetId, answerId, companyId, ownerId});
        return;
    }
});

// ----

function isAdmin(role) {
    if (role === 'superadmin' || 'admin') {
        return true;
    } else return false;
}

function isSuperAdmin(role) {
    if (role === 'superadmin') {
        return true;
    } else return false;
}


