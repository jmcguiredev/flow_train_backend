const { validator, registerOrgSchema } = require('./schema');
const { logErrors } = require('./logger');

module.exports.validateRegisterOrg = function (fields) {
    const result = validator.validate(fields, registerOrgSchema);
    logErrors('validateRegisterOrg', result.errors);
    return result.valid;
}

