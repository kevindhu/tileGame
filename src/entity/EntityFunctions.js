const entityConfig = require('./entityConfig');

function inherits(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
}

function findChunk(gameServer, entity) {
    var row = Math.sqrt(entityConfig.CHUNKS);
    var chunkWidth = entityConfig.WIDTH/row;

    var xIndex = Math.floor(entity.x / chunkWidth);
    var yIndex = Math.floor(entity.y / chunkWidth);

    return row * yIndex + xIndex;
}

module.exports = {
	inherits: inherits,
    findChunk: findChunk
};