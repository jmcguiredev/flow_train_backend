const jwt = require("jsonwebtoken");

TOKEN_EXPIRE_TIME = process.env.TOKEN_EXPIRE_TIME;

module.exports.generateAccessToken = function (username) {
    return jwt.sign({ user: username }, process.env.ACCESS_TOKEN_SECRET, {expiresIn: TOKEN_EXPIRE_TIME});
}

module.exports.verifyToken = function (token) {

    let result = {
        type: "",
        message: "",
        username: ""
    };
    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        if (decoded.exp * 1000 >= Date.now()) {
            result.type = "valid";
            result.username = decoded.user;
        } 
    } catch (err) {
        result.type = "invalid";
        if(err.expiredAt) {
            result.type = "expired";
        }
    }
    result.message = `Provided token is ${result.type}.`;
    return result;
}