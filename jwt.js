const jwt = require("jsonwebtoken");

module.exports.generateAccessToken = function (username) {
return jwt.sign(username, process.env.ACCESS_TOKEN_SECRET, {expiresIn: "15m"});
}

module.exports.verifyToken = function (token) {
    try {
        let decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        return decoded;
    } catch(err) {
        return err;
    }
}