const entityConfig = require('../entityConfig');
const Arithmetic = require('../../modules/Arithmetic');
var lerp = require('lerp');
var EntityFunctions = require('../EntityFunctions');
var Controller = require('./Controller');
var Shard = require('../projectiles/Shard');
var Laser = require('../projectiles/Laser');

function Bot(name, player, home, faction, gameServer) {
    this.id = Math.random();
    Bot.super_.call(this, this.id, faction, gameServer);
    this.name = getName(name);
    this.owner = player.id;
    this.radius = 40;
    this.emptyShard = null;
    this.type = "Bot";
    this.x = home.x;
    this.y = home.y;
    this.timer = 0;
    this.theta = 0;
    this.laserTimer = 0;
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

    this.canShoot = false;
    this.pressingUp = false;
    this.pressingDown = false;
    this.pressingLeft = false;
    this.pressingRight = false;

    target = this.getTarget();
    if (!target) {
        return;
    }

    if (this.inRange(target)) {
        switch (target.type) {
            case "owner":
            case "manual":
                this.theta = 0;
                break;
            case "enemy":
                //this.theta = Math.random();
        }
        this.canShoot = true;
        return;
    }

    console.log("NOT STATIC");

    this.getTheta(target.object);

    this.maxXSpeed = Math.abs(this.maxSpeed * Math.cos(this.theta));
    this.maxYSpeed = Math.abs(this.maxSpeed * Math.sin(this.theta));

    (target.object.x < this.x) ? this.pressingLeft = true : this.pressingRight = true;
    (target.object.y < this.y) ? this.pressingUp = true : this.pressingDown = true;
};


Bot.prototype.getTheta = function (target) {
    this.theta = Math.atan((this.y - target.y) / (this.x - target.x));
    if (this.y - target.y > 0 && this.x - target.x > 0 || this.y - target.y < 0 && this.x - target.x > 0) {
        this.theta += Math.PI;
    }
};

Bot.prototype.getTarget = function () {
    var target = {};
    var player = this.gameServer.CONTROLLER_LIST[this.owner];

    if (!player) {
        return;
    }
    if (this.outofRange() && (this.enemy || this.manual)) {
        this.regroup();
        return null;
    }

    if (!this.manual) {
        if (this.enemy) {
            var enemy;
            var controller = this.gameServer.CONTROLLER_LIST[this.enemy];
            var home = this.gameServer.HOME_LIST[this.enemy];
            if (controller) {
                enemy = controller;
            }
            else if (home) {
                enemy = home;
            }
            else {
                this.regroup();
                return;
            }
            target.object = enemy;
            target.type = "enemy";
        } else {
            target.object = player;
            target.type = "owner";
        }
    }
    else if (this.manualCoord) {
        target.object = this.manualCoord;
        target.type = "manual";
    }
    return target;
};

Bot.prototype.updatePosition = function () {
    this.updateControls();
    Bot.super_.prototype.updatePosition.apply(this);
};

Bot.prototype.onDeath = function () {
    this.createCorpse();
    this.onDelete();
};

Bot.prototype.createCorpse = function () {
    var home = this.gameServer.HOME_LIST[this.home];
    var corpse =  new Shard(this.x, this.y, this.gameServer);
    corpse.setName("deadBoi");
};


Bot.prototype.shootLaser = function (player) {
    if (this.laserTimer <= 0) {
        this.laserTimer = 100;
        return new Laser(this, player, this.gameServer);
    }
    this.getTheta(player);
    this.recoil(0.1);
};

Bot.prototype.onDelete = function () {
    var player = this.gameServer.CONTROLLER_LIST[this.owner];
    if (player) {
        player.removeBot(this);
    }
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
    if (!this.canShoot) {
        return;
    }
    if (this.timer !== 0) {
        this.timer--;
        return;
    }
    this.timer = 20;
    this.getTheta(player);
    this.recoil(2);

    var shardClone = new Shard(this.x, this.y, this.gameServer);
    shardClone.setName("defaultBullet");
    shardClone.becomeHomeShooting(this, (player.x - this.x) / 4,
        (player.y - this.y) / 4, true);

    this.packetHandler.updateHomePackets(this);
};


Bot.prototype.recoil = function (magnitude) {
    this.xSpeed -= magnitude * this.maxSpeed * Math.cos(this.theta);
    this.ySpeed -= magnitude * this.maxSpeed * Math.sin(this.theta);
};


Bot.prototype.inRange = function (target) {
    var object = target.object;
    if (target.type === "manual") {
        return Math.abs(object.x - this.x) < 10 && Math.abs(object.y - this.y) < 10;
    } else {
        return Math.abs(object.x - this.x) < 100 && Math.abs(object.y - this.y) < 100;
    }
};


Bot.prototype.outofRange = function () {
    var player = this.gameServer.CONTROLLER_LIST[this.owner];
    return Math.abs(player.x - this.x) > 500 &&
        Math.abs(player.y - this.y) > 500
};


function getName(name) {
    if (name === "") {
        return "unnamed bot";
    }
    return name;
}




module.exports = Bot;
