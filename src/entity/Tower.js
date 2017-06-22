const entityConfig = require('./entityConfig');
const Arithmetic = require('../modules/Arithmetic');

function Tower(owner, x, y) {
    this.id = Math.random();
    this.owner = owner.faction;
    this.x = x;
    this.y = y;
    this.name = this.owner.name;
    this.shards = [];
    this.color = "#125212";
    this.hasColor = true;
    this.level = 0;
    this.radius = 10;
    this.health = 30;
}

Tower.prototype.getRandomShard = function () {
    var randomIndex = Arithmetic.getRandomInt(0,this.shards.length-1);
    return this.shards[randomIndex];
};

Tower.prototype.removeShard = function (shard) {
    shard.home = null;
    var index = this.shards.indexOf(shard.id);
    this.shards.splice(index, 1);
};

Tower.prototype.getSupply = function () {
    return this.shards.length;
};

Tower.prototype.addShard = function (shard) {
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


Tower.prototype.addQuadItem = function () {
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

module.exports = Tower;
