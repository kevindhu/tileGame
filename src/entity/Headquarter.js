const entityConfig = require('./entityConfig');

function Headquarter(owner, x, y) {
    this.owner = owner;
    this.id = owner.id;
    this.x = x;
    this.y = y;
    this.name = owner.name;
    this.supply = 0;
    this.radius = 10;
    this.shards = [];

    this.timer = 0;
    this.isOpen = false;
}

Headquarter.prototype.addShard = function (shard) {
    this.supply ++;
    shard.HQ = this;
    this.shards.push(shard.id);
};



module.exports = Headquarter;