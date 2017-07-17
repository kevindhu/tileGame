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
    this.type = "Bot";
    this.x = home.x;
    this.y = home.y;
    this.damage = home.unitDmg;
    this.health = 5 + home.unitArmor;
    this.maxSpeed = 5 + home.unitSpeed;
    this.timer = 0;
    this.theta = 0;
    this.laserTimer = 0;
    this.manual = false;
    this.manualCoord = null;
    this.enemy = null;
    this.setOwnerTarget();
    this.init();
}

EntityFunctions.inherits(Bot, Controller);

Bot.prototype.update = function () {
    Bot.super_.prototype.update.apply(this);
};

Bot.prototype.setManual = function (x, y) {
    this.target.object = {
        x: x,
        y: y
    };
    this.target.type = "manual";
};

Bot.prototype.setFriendly = function (target) {
    this.removeManual();
    this.target.object = target;
    this.target.type = "friend";
};

Bot.prototype.setEnemy = function (target) {
    this.removeManual();
    this.target.object = target;
    this.target.type = "enemy";
};

Bot.prototype.regroup = function () {
    this.removeManual();
    this.removeSelect();
    this.removeEnemy();

    this.setOwnerTarget();
};


Bot.prototype.setOwnerTarget = function () {
    this.target = {
        object: this.gameServer.CONTROLLER_LIST[this.owner],
        type: "owner"
    }
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

Bot.prototype.removeEnemy = function () {
    this.enemy = null;
};

Bot.prototype.updateControls = function () {
    if (!this.target) {
        return;
    }

    this.canShoot = false;
    this.pressingUp = false;
    this.pressingDown = false;
    this.pressingLeft = false;
    this.pressingRight = false;

    if (this.inRange(this.target)) {
        switch (this.target.type) {
            case "owner":
            case "manual":
                this.theta = 0;
                break;
            case "enemy":
            //this.theta = Math.random();
            case "friend":
                this.target.object.storeBot(this);

        }
        this.canShoot = true;
        return;
    }

    this.getTheta(this.target.object);

    this.maxXSpeed = Math.abs(this.maxSpeed * Math.cos(this.theta));
    this.maxYSpeed = Math.abs(this.maxSpeed * Math.sin(this.theta));

    (this.target.object.x < this.x) ? this.pressingLeft = true : this.pressingRight = true;
    (this.target.object.y < this.y) ? this.pressingUp = true : this.pressingDown = true;
};

Bot.prototype.limbo = function () {
    var player = this.gameServer.CONTROLLER_LIST[this.owner];
    if (player) {
        player.removeBot(this);
    }
    this.removeSelect();
    this.removeManual();
    this.removeEnemy();

    this.gameServer.controllerTree.remove(this.quadItem);
};


Bot.prototype.getTheta = function (target) {
    this.theta = Math.atan((this.y - target.y) / (this.x - target.x));
    if (this.y - target.y > 0 && this.x - target.x > 0 || this.y - target.y < 0 && this.x - target.x > 0) {
        this.theta += Math.PI;
    }
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
    var corpse = new Shard(this.x, this.y, this.gameServer);
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
    this.limbo();
    Bot.super_.prototype.onDelete.apply(this);
};

Bot.prototype.getRandomShard = function () {
    var randomIndex = Arithmetic.getRandomInt(0, this.shards.length - 1);
    return this.shards[randomIndex];
};

Bot.prototype.becomeHome = function () {
    this.limbo();
    this.x = -20;
    this.y = -20;
    this.packetHandler.updateControllersPackets(this);
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
    shardClone.becomeControllerShooting(this, (player.x - this.x) / 4,
        (player.y - this.y) / 4, true);

    this.packetHandler.updateControllersPackets(this);
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
