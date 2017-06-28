const entityConfig = require('./entityConfig');
const Arithmetic = require('../modules/Arithmetic');
var EntityFunctions = require('./EntityFunctions');
var Home = require('./Home');
var Shard = require('./Shard');


function Tower(faction, x, y, gameServer, home) {
    Tower.super_.call(this, faction, x, y, gameServer);
    this.parent = home.id;
    this.hasColor = true;
    this.type = "Tower"; 
    this.timer = 0;
    this.level = 0;
    this.radius = 10;
    this.health = 2;
    this.init();
    this.mainInit();
};

EntityFunctions.inherits(Tower, Home);


Tower.prototype.init = function () {
    this.addBigQuadItem();
    this.gameServer.towerTree.insert(this.bigQuadItem);
};


Tower.prototype.updateLevel = function () {
    if (this.getSupply() < 1) {
        this.level = 0;
        this.radius = 10;
        this.health = 2;
        this.updateHomeTree();
    }
    else if (this.getSupply() < 4) {
        if (this.level < 1) {
            this.health = 5;
        }
        this.level = 1;
        this.radius = 30;
        this.updateHomeTree();
    }
    else if (this.getSupply() > 6 && this.level < 2) {
        if (this.level < 1) {
            this.health = 10;
        }
        this.radius = 50;
        this.health = 80;
        this.updateHomeTree();
    }
};



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
    this.timer = 20;

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

module.exports = Tower;
