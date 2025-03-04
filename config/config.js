const fs = require("fs");

const sslOptions = {
    key: fs.readFileSync("localhost-key.pem"),
    cert: fs.readFileSync("localhost.pem")
};

module.exports = sslOptions;
