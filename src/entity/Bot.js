const entityConfig = require('./entityConfig');
const Arithmetic = require('../modules/Arithmetic');
var lerp = require('lerp');
var EntityFunctions = require('./EntityFunctions');
var Controller = require('./Controller');

function Bot(name, faction, gameServer) {
    Player.super_.call(this,faction, gameServer);

    this.id = Math.random();
    this.name = getName(name);
    this.owner = null;
    this.emptyShard = null;
    this.init();
}

EntityFunctions.inherits(Player, Controller);



Bot.prototype.onDelete = function () {
    this.gameServer.FACTION_LIST[this.faction].removeBot(this);
    delete this.gameServer.PLAYER_LIST[this.id];
    this.packetHandler.deleteBotPackets(this);
};


Bot.prototype.update = function () {
    Bot.super_.prototype.update.apply(this);
};


Bot.prototype.updateControls = function () {
    var player = this.gameServer.PLAYER_LIST[player];
    this.pressingDown = false;
    this.pressingUp = false;
    this.pressingLeft = false;
    this.pressingRight = false;

    if (player.x < this.x) {
        this.pressingLeft = true;
    }
    else {
        this.pressingRight = true;
    }
    if (player.y < this.y) {
        this.pressingDown = true;
    }
    else {
        this.pressingUp = true;
    }
};



Bot.prototype.updatePosition = function () {
    this.updateControls();
    Bot.super_.prototype.updatePosition.apply(this);
};



Bot.prototype.getRandomShard = function () {
    var randomIndex = Arithmetic.getRandomInt(0,this.shards.length-1);
    return this.shards[randomIndex];
};


Bot.prototype.addShard = function (shard) {
    this.increaseHealth(1);
    if (shard.name === null) {
        this.emptyShard = shard.id;
    }
    this.shards.push(shard.id);
    shard.becomeBot(this);
    this.gameServer.PLAYER_SHARD_LIST[shard.id] = shard;
};




function getName(name) {
    if (name === "") {
        return "unnamed bot";
    }
    return name;
}


module.exports = Bot;
