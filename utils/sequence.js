const fs = require('fs');
const path = require('path');
const debug = require('debug')('memento:server');

function randIntInRange(low, high) {
    var r = Math.random();
    return Math.floor(r*(high-low) + low);
}

function getSeqTemplate() {
    const dirName = process.env.USE_SHORT_SEQUENCE == 'true'
        ? 'short_level_templates'
        : 'level_templates';
    try {
        const dirPath = path.join(__dirname, '..', 'task_data', dirName);
        const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.json'));
        let templateNum = randIntInRange(0, files.length-1);
        let templateFile = files[templateNum];
        const templateFilePath = path.join(dirPath, templateFile);
        const templateFileData = fs.readFileSync(templateFilePath, 'utf8');
        const template = JSON.parse(templateFileData);
        return template;
    } catch (e) {
        debug(e);
        debug("Unable to load a template file!");
    }
}

module.exports = {
  getSeqTemplate
};
