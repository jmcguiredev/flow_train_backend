const jwt = require("jsonwebtoken");

TOKEN_EXPIRE_TIME = process.env.TOKEN_EXPIRE_TIME;

module.exports.generateAccessToken = function (username) {
    return jwt.sign({ user: username }, process.env.ACCESS_TOKEN_SECRET, {expiresIn: TOKEN_EXPIRE_TIME});
}

module.exports.verifyToken = function (token) {
    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        if (decoded.exp * 1000 >= Date.now()) {
            return decoded.user;
        } 
    } catch (err) {
        console.log('[verifyToken] : ', err);
        throw err;
    }
}