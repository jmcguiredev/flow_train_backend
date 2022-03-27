let Validator = require('jsonschema').Validator;
let v = new Validator();
const { logErrors } = require('./logger');

const schemas = {
    encodedIdSchema: {
        "id": "/EncodedId",
        "type": "string"
    },
    basicNameSchema: {
        "id": "/BasicName",
        "type": "string",
        "minLength": 1,
        "maxLength": 45
    },
    emailSchema: {
        "id": "/Email",
        "type": "string",
        "minLength": 5,
        "maxLength": 100,
        "pattern": /^\S+@\S+\.\S+$/
    },
    passwordSchema: {
        "id": "/Password",
        "type": "string",
        "minLength": 8,
        "maxLength": 100
    },
    registerOrgSchema: {
        "id": "/RegisterOrg",
        "type": "object",
        "properties": {
            "email": { "$ref": "/Email" },
            "password": { "$ref": "/Password" },
            "firstName": { "$ref": "/BasicName" },
            "lastName": { "$ref": "/BasicName" },
            "companyName": { "$ref": "/BasicName"}
        },
        "required": ["email", "password", "firstName", "lastName", "companyName"]
    },
    createGroupSchema: {
        "id": "/CreateGroup",
        "type": "object",
        "properties": {
            "groupName": { "$ref": "/BasicName" },
        },
        "required": ["groupName"]
    },
    updateGroupSchema: {
        "id": "/UpdateGroup",
        "type": "object",
        "properties": {
            "groupName": { "$ref": "/BasicName" },
            "groupId": { "$ref": "/EncodedId" },
        },
        "required": ["groupName", "groupId"]
    },
    createServiceSchema: {
        "id": "/CreateService",
        "type": "object",
        "properties": {
            "serviceName": { "$ref": "/BasicName" },
            "groupId": { "$ref": "/EncodedId" },
        },
        "required": ["serviceName", "groupId"]
    },
    updateServiceSchema: {
        "id": "/UpdateService",
        "type": "object",
        "properties": {
            "serviceName": { "$ref": "/BasicName"},
            "serviceId": { "$ref": "/EncodedId" }
        },
        "required": ["serviceName", "serviceId"]
    },
    createPromptSchema: {
        "id": "/CreatePrompt",
        "type": "object",
        "properties": {
            "promptName": { "$ref": "/BasicName" },
            "promptText": { "type": "string", "minLength": 3, "maxLength": 255 },
            "position": { "type": "string", "minLength": 1, "maxLength": 255 },
            "serviceId": { "$ref": "/EncodedId" }
        },
        "required": ["promptName", "promptText", "position", "serviceId"]
    },
    updatePromptSchema: {
        "id": "/UpdatePrompt",
        "type": "object",
        "properties": {
            "promptName": { "$ref": "/BasicName" },
            "promptText": { "type": "string", "minLength": 3, "maxLength": 255 },
            "position": { "type": "string", "minLength": 1, "maxLength": 255 },
            "promptId": { "$ref": "/EncodedId" }
        },
        "required": ["promptName", "promptText", "position", "promptId"]
    },
    createAnswerSchema: {
        "id": "/CreateAnswer",
        "type": "object",
        "properties": {
            "answerText": { "type": "string", "minLength": 1, "maxLength": 45 },
            "color": { "type": "string", "minLength": 1, "maxLength": 45 },
            "promptId": { "$ref": "/EncodedId" }
        },
        "required": ["answerText", "color", "promptId"]
    },
    updateAnswerSchema: {
        "id": "/UpdatePrompt",
        "type": "object",
        "properties": {
            "answerText": { "type": "string", "minLength": 1, "maxLength": 45 },
            "color": { "type": "string", "minLength": 1, "maxLength": 45 },
            "answerId": { "$ref": "/EncodedId" }
        },
        "required": ["answerText", "color", "answerId"]
    },
    createSnippetSchema: {
        "id": "/CreateSnippet",
        "type": "object",
        "properties": {
            "name": { "type": "string", "minLength": 1, "maxLength": 45 },
            "markdown": { "type": "string", "minLength": 1, "maxLength": 65_000 },
            "ownerType": { "enum": ["company", "group", "service"] },
            "ownerId": { "$ref": "/EncodedId" }
        },
        "required": ["name", "markdown", "ownerType", "ownerId"]
    },
    updateSnippetSchema: {
        "id": "/CreateSnippet",
        "type": "object",
        "properties": {
            "name": { "type": "string", "minLength": 1, "maxLength": 45 },
            "markdown": { "type": "string", "minLength": 1, "maxLength": 65_000 },
            "ownerType": { "enum": ["company", "group", "service"] },
            "snippetId": { "$ref": "/EncodedId" }
        },
        "required": ["name", "markdown", "ownerType", "snippetId"]
    },
    createActionSchema: {
        "id": "/CreateAction",
        "type": "object",
        "properties": {
            "actionType": { "type": "string", "minLength": 1, "maxLength": 45 },
            "ownerType": { "enum": ["company", "group", "service"] },
            "snippetId": { "$ref": "/EncodedId" },
            "answerId": { "$ref": "/EncodedId" },
            "ownerId": { "$ref": "/EncodedId" }
        },
        "required": ["actionType", "ownerType", "snippetId", "answerId", "ownerId"]
    },
}

Object.values(schemas).forEach((schema) => {
    v.addSchema(schema, schema.id);
});

module.exports.schemas = schemas;

module.exports.validate = function (fields, schema) {
    const result = v.validate(fields, schema);
    logErrors(`validate.validate [${schema.id}]`, result.errors);
    return result.valid;
}


