const entityConfig = require('./entityConfig');

function Headquarter(owner, x, y) {
    this.id = owner.id;
    this.owner = owner;
    this.x = x;
    this.y = y;
    this.name = owner.name;
    this.supply = 0;
    this.radius = 10;
    this.shards = [];
}

module.exports = Headquarter;