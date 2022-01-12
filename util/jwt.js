const jwt = require("jsonwebtoken");
const { logErrors } = require('./logger');
const { encodeId } = require('./hashid');

TOKEN_EXPIRE_TIME = process.env.TOKEN_EXPIRE_TIME;
ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;

module.exports.generateAccessToken = function (user) {
    // Preparing user object for tokenization
    let userObj = {...user};
    delete userObj.password;
    userObj.id = encodeId(userObj.id);
    userObj.companyId = encodeId(userObj.companyId);

    return jwt.sign(userObj, ACCESS_TOKEN_SECRET, {expiresIn: TOKEN_EXPIRE_TIME});
}

module.exports.verifyToken = function (token) {
    try {
        const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
        if (decoded.exp * 1000 >= Date.now()) {
            return decoded;
        } 
    } catch (err) {
        logErrors('jwt.verifyToken', [err]);
        return false;
    }
}