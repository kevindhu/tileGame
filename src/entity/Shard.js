const entityConfig = require('./entityConfig');

function Shard(x, y, id) {
    this.name = null;
    this.id = id;
    this.x = x;
    this.y = y;
    this.value = 0;
    this.owner = null;
    this.radius = entityConfig.SHARD_WIDTH;
    this.timer = 0;
}


module.exports = Shard;