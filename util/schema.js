let Validator = require('jsonschema').Validator;
let v = new Validator();
const { logErrors } = require('./logger');

// Reference Schemas
const emailSchema = {
    "id": "/Email",
    "type": "string",
    "minLength": 5,
    "maxLength": 100,
    "pattern": /^\S+@\S+\.\S+$/
}

const passwordSchema = {
    "id": "/Password",
    "type": "string",
    "minLength": 8,
    "maxLength": 100
}

const firstNameSchema = {
    "id": "/FirstName",
    "type": "string",
    "minLength": 1,
    "maxLength": 45
}

const lastNameSchema = {
    "id": "/LastName", 
    "type": "string",
    "minLength": 1,
    "maxLength": 45
}

const companyNameSchema = {
    "id": "/CompanyName",
    "type": "string",
    "minLength": 1,
    "maxLength": 45
}

const encodedIdSchema = {
    "id": "/EncodedId",
    "type": "string"
}

const basicNameSchema = {
    "id": "/BasicName",
    "type": "string",
    "minLength": 1,
    "maxLength": 45
}

const superAdminRoleSchema = {
    "id": "/SuperAdminRole",
    "type": "string",
    "pattern": "superadmin"
}

const adminRoleSchema = {
    "id": "/AdminRole",
    "type": "string",
    "pattern": "admin"
}

const userRoleSchema = {
    "id": "/UserRole",
    "type": "string",
    "pattern": "user"
}

v.addSchema(emailSchema, emailSchema.id);
v.addSchema(passwordSchema, passwordSchema.id);
v.addSchema(firstNameSchema, firstNameSchema.id);
v.addSchema(lastNameSchema, lastNameSchema.id);
v.addSchema(companyNameSchema, companyNameSchema.id);
v.addSchema(encodedIdSchema, encodedIdSchema.id);
v.addSchema(basicNameSchema, basicNameSchema.id); 
v.addSchema(superAdminRoleSchema, superAdminRoleSchema.id);
v.addSchema(adminRoleSchema, adminRoleSchema.id);
v.addSchema(userRoleSchema, userRoleSchema.id);

module.exports.validate = function (fields, schema) {
    const result = v.validate(fields, schema);
    logErrors(`validate.validate [${schema.id}]`, result.errors);
    return result.valid;
}

// Validation Schemas
module.exports.schemas = {
    registerOrgSchema: {
        "id": "registerOrg",
        "type": "object",
        "properties": {
            "email": { "$ref": "/Email" },
            "password": { "$ref": "/Password" },
            "firstName": { "$ref": "/FirstName" },
            "lastName": { "$ref": "/LastName" },
            "companyName": { "$ref": "/CompanyName"}
        },
        "required": ["email", "password", "firstName", "lastName"]
    },
    createGroupSchema: {
        "id": "createGroup",
        "type": "object",
        "properties": {
            "groupName": { "$ref": "/BasicName" },
            "role": { "$ref": "/SuperAdminRole", "$ref": "/AdminRole"}
        },
        "required": ["groupName", "role"]
    },
    renameGroupSchema: {
        "id": "renameGroup",
        "type": "object",
        "properties": {
            "groupName": { "$ref": "/BasicName" },
            "groupId": { "$ref": "/EncodedId" },
            "role": { "$ref": "/SuperAdminRole", "$ref": "/AdminRole" }
        },
        "required": ["groupName", "groupId", "role"]
    },
    createServiceSchema: {
        "id": "createService",
        "type": "object",
        "properties": {
            "serviceName": { "$ref": "/BasicName" },
            "groupId": { "$ref": "/EncodedId" },
            "role": { "$ref": "/SuperAdminRole", "$ref": "/AdminRole" }
        },
        "required": ["serviceName", "groupId", "role"]
    }
}