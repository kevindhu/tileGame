const entityConfig = require('../entityConfig');
const Arithmetic = require('../../modules/Arithmetic');
var EntityFunctions = require('../EntityFunctions');
var Home = require('./Home');
var Shard = require('../projectiles/Shard');

function Barracks(faction, x, y, gameServer, home) {
    Barracks.super_.call(this, faction, x, y, gameServer);
    this.parent = home.id;
    this.hasColor = true;
    this.type = "Barracks";
    this.level = 0;
    this.radius = 10;
    this.health = 2;
    this.unitArmor = 0;
    this.unitSpeed = 10;
    this.unitDmg = 1;
    this.mainInit();
}

EntityFunctions.inherits(Barracks, Home);



Barracks.prototype.updateLevel = function () {
    if (this.getSupply() < 1) {
        this.level = 0;
        this.radius = 10;
        this.health = 2;
        this.updateQuadItem();
    }
    else if (this.getSupply() < 4) {
        if (this.level < 1) {
            this.health = 5;
        }
        this.level = 1;
        this.radius = 30;
        this.updateQuadItem();
    }
    else if (this.getSupply() > 6 && this.level < 2) {
        if (this.level < 1) {
            this.health = 10;
        }
        this.radius = 50;
        this.health = 80;
        this.updateQuadItem();
    }
};



Barracks.prototype.addBigQuadItem = function () {
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



Barracks.prototype.makeBot = function (player, shard) {
    if (this.getSupply() > 0) {
        shard.useSupply();
        if (shard.supply === 0) {
            this.removeShard(shard);
            shard.onDelete();
        }
        var faction = this.gameServer.FACTION_LIST[this.faction];
        faction.addBot(this, player, shard);
    }
    this.packetHandler.updateHomePackets(this);
};


Barracks.prototype.upgradeUnit = function (data) {
    var shard, id;
    for (id in data.shards) {
        shard = this.gameServer.HOME_SHARD_LIST[id];
        if (shard) {
            switch (data.type) {
                case "dmg":
                    this.unitDmg++;
                    break;
                case "armor":
                    this.unitArmor++;
                    break;
                case "speed":
                    this.unitSpeed++;
                    break;
            }
            this.removeShard(shard);
            shard.onDelete();
        }
    }
    this.packetHandler.updateHomePackets(this);
    this.updateUIs();
};



Barracks.prototype.onDelete = function () {
    Barracks.super_.prototype.onDelete.apply(this);
    var parent = this.gameServer.HOME_LIST[this.parent];
    parent.removeChild(this);
};




module.exports = Barracks;
