const { validator, registerOrgSchema, createGroupSchema, renameGroupSchema } = require('./schema');
const { logErrors } = require('./logger');

module.exports.validateRegisterOrg = function (fields) {
    const result = validator.validate(fields, registerOrgSchema);
    logErrors('validate.validateRegisterOrg', result.errors);
    return result.valid;
}

module.exports.validateCreateGroup = function (fields) {
    const result = validator.validate(fields, createGroupSchema);
    logErrors('validate.validateCreateGroup', result.errors);
    return result.valid;
}

module.exports.validateRenameGroup = function (fields) {
    const result = validator.validate(fields, renameGroupSchema);
    logErrors('validate.validateRenameGroup', result.errors);
    return result.valid;
}

