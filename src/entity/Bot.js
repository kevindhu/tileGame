const entityConfig = require('./entityConfig');
const Arithmetic = require('../modules/Arithmetic');
var lerp = require('lerp');
var EntityFunctions = require('./EntityFunctions');
var Controller = require('./Controller');
var Shard = require('./Shard');

function Bot(id, name, faction, gameServer, player) {
    Bot.super_.call(this, id, faction, gameServer);
    this.id = Math.random();
    this.name = getName(name);
    this.owner = player.id;
    this.radius = 40;
    this.emptyShard = null;
    this.type = "Bot";
    this.timer = 0;
    this.init();
}

EntityFunctions.inherits(Bot, Controller);


Bot.prototype.update = function () {
    Bot.super_.prototype.update.apply(this);
};


Bot.prototype.updateControls = function () {
    var player = this.gameServer.CONTROLLER_LIST[this.owner];

    this.pressingUp = false;
    this.pressingDown = false;
    this.pressingLeft = false;
    this.pressingRight = false;

    if (!player) {
        return;
    }

    if (player.x < this.x) {
        this.pressingLeft = true;
    }
    else if (player.x > this.x) {
        this.pressingRight = true;
    }
    if (player.y < this.y) {
        this.pressingUp = true;
    }
    else if (player.y > this.y) {
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
    var randomIndex = Arithmetic.getRandomInt(0, this.shards.length - 1);
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


Bot.prototype.shootShard = function (player) {
    if (this.timer !== 0) {
        this.timer--;
        return;
    }
    this.timer = 20;

    var shardClone = new Shard(this.x, this.y, this.gameServer);
    shardClone.setName("ass");
    shardClone.becomeHomeShooting(this, (player.x - this.x) / 4,
        (player.y - this.y) / 4, true);

    this.packetHandler.updateHomePackets(this);
};


function getName(name) {
    if (name === "") {
        return "unnamed bot";
    }
    return name;
};


module.exports = Bot;
