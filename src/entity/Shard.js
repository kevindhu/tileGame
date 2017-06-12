const entityConfig = require('./entityConfig');

function Shard(x, y, id) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.value = 0;
    this.owner = null;
}


module.exports = Shard;