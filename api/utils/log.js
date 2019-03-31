const fs = require('fs');
const path = require('path');

// create an append-only file stream to the log
const logPath = path.join(__dirname, '..', '..', 'logs', 'ui.log');
const stream = fs.createWriteStream(logPath, {flags: "a"});

function writeUILog(message) {
    // limit the length of the message to avoid random spams
    if (message.length > 1000000) {
        throw new Error("Log message too long.");
    }
    stream.write(message);
    stream.write("\n");
}

module.exports = {
    writeUILog
};
