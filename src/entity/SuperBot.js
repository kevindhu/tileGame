const entityConfig = require('./entityConfig');
const Arithmetic = require('../modules/Arithmetic');
var lerp = require('lerp');
var EntityFunctions = require('./EntityFunctions');
var Controller = require('./Controller');
var Bot = require('./Bot');
var Shard = require('./Shard');

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
    shardClone.setName("ass");
    shardClone.becomeHomeShooting(this, (player.x - this.x) / 4,
        (player.y - this.y) / 4, true);

    this.packetHandler.updateHomePackets(this);
};



module.exports = SuperBot;
