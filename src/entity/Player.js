const entityConfig = require('./entityConfig');
const Arithmetic = require('../modules/Arithmetic');
var EntityFunctions = require('./EntityFunctions');
var Controller = require('./Controller');
var lerp = require('lerp');

function Player(id, name, faction, gameServer) {
    Player.super_.call(this, id, faction, gameServer);
    this.name = getName(name);
    this.emptyShard = null;
    this.type = "Player";
    this.maxSpeed = 10;
    this.shards = [];
    this.init();
}

EntityFunctions.inherits(Player, Controller);



Player.prototype.onDelete = function () {
    this.dropAllShards();
    Player.super_.prototype.onDelete.apply(this);
};





Player.prototype.update = function () {
    var tile = this.gameServer.getEntityTile(this);
    var faction = this.gameServer.FACTION_LIST[this.faction];

    if (tile) {
        if (this.shards.length > 1 && faction.isNeighboringFaction(tile)) {
            this.packetHandler.addBracketPackets(this, tile);
        }
    }

    Player.super_.prototype.update.apply(this);
};


Player.prototype.updateMaxSpeed = function () {
    this.maxSpeed = 10 * Math.pow(0.9,this.shards.length);
};


Player.prototype.getRandomShard = function () {
    var randomIndex = Arithmetic.getRandomInt(0,this.shards.length-1);
    return this.shards[randomIndex];
};


Player.prototype.addShard = function (shard) {
    this.increaseHealth(1);
    if (shard.name === null) {
        this.emptyShard = shard.id;
    }
    this.shards.push(shard.id);
    shard.becomePlayer(this);
    this.updateMaxSpeed();
    this.gameServer.PLAYER_SHARD_LIST[shard.id] = shard;
};

Player.prototype.removeShard = function (shard) {
    if (shard.id === this.emptyShard) {
        this.packetHandler.deleteUIPackets(this,"name shard");
        this.emptyShard = null;
    }
    var index = this.shards.indexOf(shard.id);
    this.shards.splice(index, 1);
    this.updateMaxSpeed();
    shard.timer = 0;
    this.packetHandler.deleteBracketPackets(this);
};

Player.prototype.transformEmptyShard = function (name) {
    if (this.emptyShard !== null) {
        this.gameServer.PLAYER_SHARD_LIST[this.emptyShard].setName(name);
        this.emptyShard = null;
    }
};

Player.prototype.decreaseHealth = function (amount) {
    if (this.shards.length > 0) {
        var filteredAmount = amount/this.shards.length;
    }
    else {
        filteredAmount = amount;
    }
    this.health -= filteredAmount;
    if (this.health <= 0) {
        this.reset();
    }
    this.packetHandler.updateControllersPackets(this);
};

Player.prototype.increaseHealth = function (amount) {
    if (this.health <= 10) {
        this.health += amount;
    }
};


Player.prototype.dropRandomShard = function () {
    var shard = this.getRandomShard();
    this.dropShard(shard);
};

Player.prototype.dropShard = function (shard) {
    if (shard) {
        this.removeShard(shard);
        shard.becomePlayerShooting(this, Arithmetic.getRandomInt(-30, 30),
            Arithmetic.getRandomInt(-30, 30))
    }
};

Player.prototype.dropAllShards = function () {
    if (this.emptyShard !== null) {
        var emptyShard = this.gameServer.PLAYER_SHARD_LIST[this.emptyShard];
        this.dropShard(emptyShard);
    }

    for (var i = this.shards.length - 1; i >= 0; i--) {
        var shard = this.gameServer.PLAYER_SHARD_LIST[this.shards[i]];
        this.dropShard(shard);
    }
};

Player.prototype.onDeath = function () {
    this.reset();
};


Player.prototype.reset = function () {
    this.dropAllShards();
    var faction = this.gameServer.FACTION_LIST[this.faction];
    this.x = faction.x;
    this.y = faction.y;
    this.maxSpeed = 10;
    this.xSpeed = 0;
    this.ySpeed = 0;
    this.health = 5;
};


function getName(name) {
    if (name === "") {
        return "unnamed friend";
    }
    return name;
}



function onBoundary (coord) {
    return coord <= entityConfig.BORDER_WIDTH ||
        coord >= entityConfig.WIDTH - entityConfig.BORDER_WIDTH;
}

function overBoundary (coord) {
    return coord < entityConfig.BORDER_WIDTH - 1 ||
        coord > entityConfig.WIDTH - entityConfig.BORDER_WIDTH + 1;
}

module.exports = Player;
