const entityConfig = require('./entityConfig');
const Arithmetic = require('../modules/Arithmetic');

function Sentinel(owner, x, y) {
    this.id = Math.random();
    this.owner = owner;
    this.x = x;
    this.y = y;
    this.name = owner.name;
    this.supply = 0;
    this.radius = 10;
    this.shards = [];
    this.color = owner.color;
    this.type = "Sentinel";
    this.level = 0;
}

Sentinel.prototype.getRandomShard = function () {
    var randomIndex = Arithmetic.getRandomInt(0,this.shards.length-1);
    return this.shards[randomIndex];
};

Sentinel.prototype.removeShard = function (shard) {
    this.supply --;
    shard.home = null;
    var index = this.shards.indexOf(shard.id);
    this.shards.splice(index, 1);
};

Sentinel.prototype.addShard = function (shard) {
	this.supply ++;
    shard.home = this;
    this.shards.push(shard.id);
};


module.exports = Sentinel;
