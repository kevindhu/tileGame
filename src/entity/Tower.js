const entityConfig = require('./entityConfig');
const Arithmetic = require('../modules/Arithmetic');
var EntityFunctions = require('./EntityFunctions');
var Home = require('./Home');
var Shard = require('./Shard');


function Tower(faction, x, y, gameServer) {
    Tower.super_.call(this, faction, x, y, gameServer);
    this.hasColor = true; 
    this.timer = 0;
    this.level = 0;
    this.radius = 10;
    this.health = 30;
    this.init();
    this.mainInit();
};

EntityFunctions.inherits(Tower, Home);


Tower.prototype.init = function () {
    this.addBigQuadItem();
    this.gameServer.towerTree.insert(this.bigQuadItem);
}


Tower.prototype.addBigQuadItem = function () {
    this.bigQuadItem = {
        cell: this,
        bound: {
            minx: this.x - 300,
            miny: this.y - 300,
            maxx: this.x + 300,
            maxy: this.y + 300
        }
    };
};

Tower.prototype.shootShard = function (player) {
    if (this.timer !== 0) {
        this.timer--;
        return;
    }
    this.timer = 10;
    if (this.getSupply() > 0) {
        var shard = this.gameServer.HOME_SHARD_LIST[this.getRandomShard()];
        shard.useSupply();
        if (shard.supply === 0) {
            this.removeShard(shard);
            shard.onDelete();
        }
        var shardClone = new Shard(this.x, this.y, this.gameServer);
        shardClone.becomeShooting(this.randomPlayer, (player.x - this.x) / 4,
         (player.y - this.y) / 4, true);
    }
    this.packetHandler.updateHomePackets(this);
};

module.exports = Tower;
