let Validator = require('jsonschema').Validator;
let v = new Validator();

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

const groupNameSchema = {
    "id": "/GroupName",
    "type": "string",
    "minLength": 1,
    "maxLength": 45
}

v.addSchema(emailSchema, emailSchema.id);
v.addSchema(passwordSchema, passwordSchema.id);
v.addSchema(firstNameSchema, firstNameSchema.id);
v.addSchema(lastNameSchema, lastNameSchema.id);
v.addSchema(companyNameSchema, companyNameSchema.id);
v.addSchema(encodedIdSchema, encodedIdSchema.id);
v.addSchema(groupNameSchema, groupNameSchema.id);

module.exports.validator = v;

// Validation Schemas
module.exports.registerOrgSchema = {
    "type": "object",
    "properties": {
        "email": { "$ref": "/Email" },
        "password": { "$ref": "/Password" },
        "firstName": { "$ref": "/FirstName" },
        "lastName": { "$ref": "/LastName" },
        "companyName": { "$ref": "/CompanyName"}
    },
    "required": ["email", "password", "firstName", "lastName"]
}

module.exports.createGroupSchema = {
    "type": "object",
    "properties": {
        "groupName": { "$ref": "/GroupName" }
    },
    "required": ["groupName"]
}

module.exports.renameGroupSchema = {
    "type": "object",
    "properties": {
        "groupName": { "$ref": "/GroupName" },
        "groupId": { "$ref": "/EncodedId" }
    },
    "required": ["groupName", "groupId"]
}




