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
    this.theta = 0;
    this.manual = false;
    this.manualCoord = null;
    this.enemy = null;
    this.init();
}

EntityFunctions.inherits(Bot, Controller);


Bot.prototype.update = function () {
    Bot.super_.prototype.update.apply(this);
};

Bot.prototype.setManual = function (x, y) {
    this.manual = true;
    this.manualCoord = {
        x: x,
        y: y
    }
};

Bot.prototype.regroup = function () {
    this.removeManual();
    this.removeSelect();
    this.removeEnemy();
};

Bot.prototype.becomeSelected = function () {
    this.selected = true;
    this.packetHandler.updateControllersPackets(this);
};

Bot.prototype.removeSelect = function () {
    this.selected = false;
    this.packetHandler.updateControllersPackets(this);
};

Bot.prototype.removeManual = function () {
    this.manual = false;
};

Bot.prototype.setEnemy = function (target) {
    this.removeManual();
    this.enemy = target.id;
};

Bot.prototype.removeEnemy = function () {
    this.enemy = null;
};

Bot.prototype.updateControls = function () {
    var target;

    this.pressingUp = false;
    this.pressingDown = false;
    this.pressingLeft = false;
    this.pressingRight = false;

    target = this.getTarget();
    if (!target) {
        return;
    }
    this.getTheta(target);

    this.maxXSpeed = Math.abs(10 * Math.cos(this.theta));
    this.maxYSpeed = Math.abs(10 * Math.sin(this.theta));

    if (this.inRange(target)) {
        this.theta = 0;
        return;
    }

    if (target.x < this.x) {
        this.pressingLeft = true;
    }
    else if (target.x > this.x) {
        this.pressingRight = true;
    }
    if (target.y < this.y) {
        this.pressingUp = true;
    }
    else if (target.y > this.y) {
        this.pressingDown = true;
    }
};


Bot.prototype.getTheta = function (target) {
    this.theta = Math.atan((this.y - target.y) / (this.x - target.x));

    if (this.y - target.y > 0 && this.x - target.x > 0 || this.y - target.y < 0 && this.x - target.x > 0) {
        this.theta += Math.PI;
    }
};

Bot.prototype.getTarget = function () {
    var target;
    var player = this.gameServer.CONTROLLER_LIST[this.owner];

    if (!player) {
        return;
    }
    if (this.outofRange() && (this.enemy || this.manual)) {
        this.regroup();
        return;
    }

    if (!this.manual) {
        if (this.enemy) {
            var enemy = this.gameServer.CONTROLLER_LIST[this.enemy];
            if (!enemy) {
                this.regroup();
                return;
            }
            target = enemy;
        } else {
            target = player;
        }
    }
    else if (this.manualCoord) {
        target = this.manualCoord;
    }
    return target;
};

Bot.prototype.updatePosition = function () {
    this.updateControls();
    Bot.super_.prototype.updatePosition.apply(this);
};

Bot.prototype.onDeath = function () {
    this.onDelete();
};

Bot.prototype.onDelete = function () {
    var player = this.gameServer.CONTROLLER_LIST[this.owner];
    player.removeBot(this);
    Bot.super_.prototype.onDelete.apply(this);
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


Bot.prototype.outofRange = function () {
    var player = this.gameServer.CONTROLLER_LIST[this.owner];
    return Math.abs(player.x - this.x) > 1000 &&
        Math.abs(player.y - this.y) > 1000
};

Bot.prototype.inRange = function (target) {
    return Math.abs(target.x - this.x) < 5 && Math.abs(target.y - this.y) < 5;
};

function getName(name) {
    if (name === "") {
        return "unnamed bot";
    }
    return name;
}


module.exports = Bot;
