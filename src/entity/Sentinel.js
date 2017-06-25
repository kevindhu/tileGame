const entityConfig = require('./entityConfig');
const Arithmetic = require('../modules/Arithmetic');
var EntityFunctions = require('./EntityFunctions');
var Home = require('./Home');
var Shard = require('./Shard');




function Sentinel(faction, x, y, gameServer) {
    Sentinel.super_.call(this, faction, x, y, gameServer);
    this.type = "Sentinel";
    this.hasColor = false;
    this.radius = 10;
    this.health = 1;
    this.timer = 0;
    this.mainInit();
}

EntityFunctions.inherits(Sentinel, Home);

Sentinel.prototype.shootShard = function (player) {
	console.log(this.timer);
    if (this.timer !== 0) {
        this.timer--;
        return;
    }
    this.timer = 100;
    if (this.getSupply() > 0) {
        var shard = this.gameServer.HOME_SHARD_LIST[this.getRandomShard()];
        shard.useSupply();
        if (shard.supply === 0) {
            this.removeShard(shard);
            shard.onDelete();
        }
        var shardClone = new Shard(this.x, this.y, this.gameServer);
        shardClone.setName(shard.name);
        shardClone.becomeShooting(this.randomPlayer, (player.x - this.x) / 4,
         (player.y - this.y) / 4, true);
    }
    this.packetHandler.updateHomePackets(this);
};




module.exports = Sentinel;
