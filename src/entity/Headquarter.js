const entityConfig = require('./entityConfig');
const Arithmetic = require('../modules/Arithmetic');

function Headquarter(owner, x, y) {
    this.owner = owner;
    this.id = owner.id;
    this.x = x;
    this.y = y;
    this.name = owner.name;
    this.supply = 0;
    this.radius = 10;
    this.shards = [];  //NOTICE: contains shardIds
    this.type = "Headquarter";
    this.timer = 0;
    this.isOpen = false;
}

Headquarter.prototype.addShard = function (shard) {
    this.supply ++;
    shard.home = this;
    this.shards.push(shard.id);
};

Headquarter.prototype.removeShard = function (shard) {
    this.supply --;
    shard.home = null;
    var index = this.shards.indexOf(shard.id);
    this.shards.splice(index, 1);
};


Headquarter.prototype.getRandomShard = function () {
    var randomIndex = Arithmetic.getRandomInt(0,this.shards.length-1);
    return this.shards[randomIndex];
};


module.exports = Headquarter;