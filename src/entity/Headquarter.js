const entityConfig = require('./entityConfig');
const Arithmetic = require('../modules/Arithmetic');

function Headquarter(faction, x, y) {
    this.owner = faction;
    this.id = Math.random();
    this.x = x;
    this.y = y;
    this.name = faction.name;
    this.radius = 10;
    this.shards = [];  //NOTICE: contains shardIds
    this.type = "Headquarter";
    this.timer = 0;
    this.isOpen = false;
    this.level = 2;
}

Headquarter.prototype.supply = function () {
    return this.shards.length;
};

Headquarter.prototype.addShard = function (shard) {
    shard.home = this;
    this.shards.push(shard.id);
};

Headquarter.prototype.removeShard = function (shard) {
    shard.home = null;
    var index = this.shards.indexOf(shard.id);
    this.shards.splice(index, 1);
};



Headquarter.prototype.getRandomShard = function () {
    var randomIndex = Arithmetic.getRandomInt(0,this.shards.length-1);
    return this.shards[randomIndex];
};


module.exports = Headquarter;