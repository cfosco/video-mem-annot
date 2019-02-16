function getSequence(numVideos, numVigilance, numTargets) {
  const rngCompare = () => Math.random() < 0.5 ? -1 : 1;
  const numIndexes = numVideos - numVigilance - numTargets;
  const numRepeats = numVigilance + numTargets;

  const indexes = [...Array(numIndexes).keys()]
    .sort(rngCompare);

  const vigilances = [...Array(numRepeats).keys()]
    .map((i) => i < numVigilance)
    .sort(rngCompare);

  let id = 0;
  const ids = [...Array(numVideos).keys()]
    .map((i) => {
      const index = id;
      if (
        (i >= ((numVigilance + numTargets) * 2))
        || ((i % 2) === 1)
      ) {
        id += 1;
      }
      return index;
    })
    .sort(rngCompare); 

  return ids.map((i) => [indexes[i], vigilances[i]]);
}

module.exports = {
  getSequence
};
