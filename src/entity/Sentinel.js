const entityConfig = require('./entityConfig');
const Arithmetic = require('../modules/Arithmetic');

function Sentinel(owner, x, y) {
    this.id = Math.random();
    this.owner = owner.faction;
    this.x = x;
    this.y = y;
    this.name = this.owner.name;
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
    shard.home = null;
    var index = this.shards.indexOf(shard.id);
    this.shards.splice(index, 1);
};

Sentinel.prototype.getSupply = function () {
    return this.shards.length;
};

Sentinel.prototype.addShard = function (shard) {
    if (this.getSupply() > 3) {
        this.level = 1;
        this.radius = 30;
    }
    if (this.getSupply() > 5) {
        this.level = 2;
        this.radius = 50;
    }
    shard.home = this;
    this.shards.push(shard.id);
};


Sentinel.prototype.addQuadItem = function () {
    this.quadItem = {
        cell: this,
        bound: {
            minx: this.x - this.radius,
            miny: this.y - this.radius,
            maxx: this.x + this.radius,
            maxy: this.y + this.radius
        }
    };
}

module.exports = Sentinel;
