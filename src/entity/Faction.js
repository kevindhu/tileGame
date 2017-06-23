const entityConfig = require('./entityConfig');
const Arithmetic = require('../modules/Arithmetic');
var Player = require("./Player");
var Headquarter = require("./Headquarter");
var Sentinel = require("./Sentinel");

function Faction(name, gameServer) {
    this.gameServer = gameServer;
    this.name = name;
    this.players = [];

    this.init();
}

Faction.prototype.init = function () {
    this.getCoords();
    this.addHeadquarter();
    this.gameServer.FACTION_LIST[this.name] = this;
}

Faction.prototype.getCoords = function () {
    var tile = null;
    var coords = {};
    while (tile === null || tile.owner !== null) {
        coords['x'] = Arithmetic.getRandomInt(250,1000);
        coords['y'] = Arithmetic.getRandomInt(250,1000);
        tile = this.gameServer.getEntityTile(coords);
    }
    this.x = tile.x + tile.length/2;
    this.y = tile.y + tile.length/2;
}



Faction.prototype.addPlayer = function (id, playerName) {
    var player = new Player(id, playerName, this, this.gameServer);
    player.x = this.x;
    player.y = this.y;
    this.players.push(player.id);
    return player;
};

Faction.prototype.addHeadquarter = function () {
    if (!this.headquarter) {
        var headquarter = new Headquarter(this, this.x, this.y, this.gameServer);
        this.headquarter = headquarter;
    }
}

Faction.prototype.addSentinel = function (player) {
    var tile = this.gameServer.getEntityTile(player);
    //TODO: clean this conditional by not having absolute value shit
    if (tile !== null && tile.home === null &&
        Math.abs(tile.x + tile.length/2 - player.x) < (tile.length / 2) &&
        Math.abs(tile.y + tile.length/2 - player.y) < (tile.length / 2) &&
        player.shards.length >= 2) {

        var sentinel = new Sentinel(player.faction, tile.x + tile.length/2, 
            tile.y + tile.length/2, this.gameServer);

        for (var i = player.shards.length - 1; i >= 0; i--) {
            var shard = this.gameServer.PLAYER_SHARD_LIST[player.shards[i]];
            player.removeShard(shard);
            sentinel.addShard(shard);
        }
    }
};


Faction.prototype.addTower = function (player) {
    var tile = this.gameServer.getEntityTile(player);
    if (tile !== null &&
        tile.home !== null &&
        tile.owner === player.faction &&
        player.shards.length >= 2) {

        var tower = new Entity.Tower(player, player.x, player.y, this.gameServer);

        for (var i = player.shards.length - 1; i >= 0; i--) {
            var shard = this.gameServer.PLAYER_SHARD_LIST[player.shards[i]];
            player.removeShard(shard);
            sentinel.addShard(shard);
        }
    }
}


Faction.prototype.getRandomPlayer = function () {
    var randomIndex = Arithmetic.getRandomInt(0,this.players.length-1);
    return this.players[randomIndex];
}



module.exports = Faction;