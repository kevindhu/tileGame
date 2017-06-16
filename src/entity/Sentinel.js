const entityConfig = require('./entityConfig');

function Sentinel(owner, x, y) {
    this.id = Math.random();
    this.owner = owner;
    this.x = x;
    this.y = y;
    this.name = owner.name;
    this.supply = 0;
    this.radius = 10;
    this.shards = [];
}


module.exports = Sentinel;
