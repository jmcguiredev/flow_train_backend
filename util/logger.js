module.exports.logErrors = function (src, errors) {
    if(!errors[0]) return;

    console.log(`\n[${src}] : `);
    errors.forEach(error => {
        console.log(error);
    });
}

module.exports.logMessage = function (src, message) {
    console.log(`\n[${src}] : `, message);
}