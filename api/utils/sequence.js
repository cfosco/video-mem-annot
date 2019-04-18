const fs = require('fs');
const path = require('path');
const debug = require('debug')('memento:server');

const VID_TYPES = {
  TARGET_REPEAT: "target_repeat",
  VIG_REPEAT: "vig_repeat",
  VIG: "vig",
  TARGET: "target",
  FILLER: "filler",
};

function randIntInRange(low, high) {
  var r = Math.random();
  return Math.floor(r * (high - low) + low);
}

function getSeqTemplate(useShortSequence) {
  const dirName = useShortSequence ? 'short_level_templates' : 'level_templates';
  try {
    const dirPath = path.join(__dirname, '..', '..', 'task_data', dirName);
    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.json'));
    let templateNum = randIntInRange(0, files.length - 1);
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

/**
 * This method assumes the N targets have indexes [0,N)
 * This updates the ordering so that the lowest indexes
 *   have the highest spacing between target and target repeat
 * @param {Array} ordering
 * @return {number} how many indexes have lag >= 150
 */
function orderIndexesByLag(ordering) {
  const indexToLag = {};
  ordering.forEach(([index, type], position) => {
    if (type === VID_TYPES.TARGET) {
      indexToLag[index] = position;
    } else if (type === VID_TYPES.TARGET_REPEAT) {
      indexToLag[index] = position - indexToLag[index];
    }
  });
  // **this assumes that the N targets have indexes [0, N)**
  const indexToNewIndex = {};
  Object.entries(indexToLag)
    .sort(([i1, lag1], [i2, lag2]) => lag2 - lag1)
    .map(([index]) => +index)
    .forEach((index, newIndex) => {
      indexToNewIndex[index] = newIndex;
    });
  ordering.forEach((element) => {
    if (indexToNewIndex[element[0]] !== undefined) {
      element[0] = indexToNewIndex[element[0]];
    }
  });
  
  return Object.values(indexToLag).filter(lag => lag >= 150).length;
}

module.exports = {
  getSeqTemplate,
  orderIndexesByLag,
  VID_TYPES
};
