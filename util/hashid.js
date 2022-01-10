const Hashids = require('hashids/cjs');
const GENERAL_SALT = process.env.GENERAL_SALT;
const HASHID_LENGTH = process.env.HASHID_LENGTH;
const generalHashId = new Hashids(GENERAL_SALT, parseInt(HASHID_LENGTH));

module.exports.encodeId = function (id) {
    return generalHashId.encode(id);
}
module.exports.decodeId = function (id) {
    return generalHashId.decode(id);
}