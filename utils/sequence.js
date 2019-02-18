const fs = require('fs');
const path = require('path');
const debug = require('debug')('memento:server');

function randIntInRange(low, high) {
    var r = Math.random();
    return Math.floor(r*(high-low) + low);
}

function getSeqTemplate() {
    let nTemplates = 1000;
    let templatesPath = "public/task_data/level_templates/";
    let templateNum = randIntInRange(0, nTemplates-1);
    let templateFile = "template_" + templateNum.toString() + ".json";
    try {
        const template = JSON.parse(fs.readFileSync(path.join(templatesPath, templateFile), 'utf8'));
        return template;
    } catch (e) {
        debug(e);
        debug("Unable to load a template file!");
    }
}

module.exports = {
  getSeqTemplate
};
