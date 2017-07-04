const entityConfig = require('./entityConfig');
const Arithmetic = require('../modules/Arithmetic');
var lerp = require('lerp');
var EntityFunctions = require('./EntityFunctions');
var Controller = require('./Controller');
var Bot = require('./Bot');
var Shard = require('./Shard');
var Laser = require('./Laser');

function SuperBot(id, name, faction, gameServer, player) {
    SuperBot.super_.call(this, id, name, faction, gameServer, player);
}

EntityFunctions.inherits(SuperBot, Bot);


SuperBot.prototype.update = function () {
    SuperBot.super_.prototype.update.apply(this);
};


SuperBot.prototype.onDeath = function () {
    this.onDelete();
};

SuperBot.prototype.shootShard = function (player) {
    if (this.timer !== 0) {
        this.timer--;
        return;
    }
    this.timer = 10;

    var shardClone = new Shard(this.x, this.y, this.gameServer);
    shardClone.setName("bigAss");
    shardClone.becomeHomeShooting(this, (player.x - this.x) / 4,
        (player.y - this.y) / 4, true);

    this.packetHandler.updateHomePackets(this);
};

SuperBot.prototype.shootLaser = function (player) {
    //TODO: what if the owner has been deleted?
    var owner = this.gameServer.CONTROLLER_LIST[this.owner];
    return new Laser(owner, player, this.gameServer);
};



module.exports = SuperBot;
