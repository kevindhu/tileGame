const entityConfig = require('./entityConfig');
const Arithmetic = require('../modules/Arithmetic');
var lerp = require('lerp');
var EntityFunctions = require('./EntityFunctions');
var Controller = require('./Controller');

function Bot(id, name, faction, gameServer, player) {
    Bot.super_.call(this, id, faction, gameServer);
    this.id = Math.random();
    this.name = getName(name);
    this.owner = player.id;
    this.emptyShard = null;
    this.type = "Bot";
    this.init();
}

EntityFunctions.inherits(Bot, Controller);



Bot.prototype.update = function () {
    Bot.super_.prototype.update.apply(this);
};


Bot.prototype.updateControls = function () {
    var player = this.gameServer.CONTROLLER_LIST[this.owner];
    if (!player) {
        return;
    }
    this.pressingUp = false;
    this.pressingDown = false;
    this.pressingLeft = false;
    this.pressingRight = false;

    if (player.x < this.x) {
        this.pressingLeft = true;
    }
    else {
        this.pressingRight = true;
    }
    if (player.y < this.y) {
        this.pressingUp = true;
    }
    else {
        this.pressingDown = true;
    }
};



Bot.prototype.updatePosition = function () {
    this.updateControls();
    Bot.super_.prototype.updatePosition.apply(this);
};

Bot.prototype.onDeath = function () {
    this.onDelete();
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
