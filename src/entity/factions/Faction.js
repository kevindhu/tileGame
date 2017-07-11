const entityConfig = require('../entityConfig');
const Arithmetic = require('../../modules/Arithmetic');
var EntityFunctions = require('../EntityFunctions');
var Player = require('../units/Player');
var Bot = require('../units/Bot');
var SuperBot = require("../units/SuperBot");
var Headquarter = require('../structures/Headquarter');
var Tower = require('../structures/Tower');
var Sentinel = require('../structures/Sentinel');
var Barracks = require('../structures/Barracks');

function Faction(name, gameServer) {
    this.id = Math.random();
    this.gameServer = gameServer;
    this.packetHandler = gameServer.packetHandler;
    this.name = name;
    this.controllers = [];
    this.homes = [];
    this.init();
}

Faction.prototype.init = function () {
    this.getInitCoords();
    this.gameServer.FACTION_LIST[this.name] = this;
    this.chunk = EntityFunctions.findChunk(this.gameServer, this);
    this.gameServer.CHUNKS[this.chunk].FACTION_LIST[this.name] = this;
    this.packetHandler.addFactionPackets(this);

    this.addHeadquarter();
};

Faction.prototype.getInitCoords = function () {
    var tile = null;
    var coords = {};
    while (tile === null || tile.faction !== null) {
        coords['x'] = Arithmetic.getRandomInt(entityConfig.BORDER_WIDTH, entityConfig.WIDTH - entityConfig.BORDER_WIDTH);
        coords['y'] = Arithmetic.getRandomInt(entityConfig.BORDER_WIDTH, entityConfig.WIDTH - entityConfig.BORDER_WIDTH);
        tile = this.gameServer.getEntityTile(coords);
    }
    this.x = tile.x + tile.length / 2;
    this.y = tile.y + tile.length / 2;
};

Faction.prototype.updateCoords = function () {
    var avgCoords = [0, 0];
    for (var i = 0; i < this.homes.length; i++) {
        var home = this.gameServer.HOME_LIST[this.homes[i]];
        avgCoords[0] += home.x;
        avgCoords[1] += home.y;
    }
    this.x = avgCoords[0] / this.homes.length;
    this.y = avgCoords[1] / this.homes.length;

    this.packetHandler.updateFactionPackets(this);
};

Faction.prototype.addPlayer = function (id, playerName) {
    var player = new Player(id, playerName, this, this.gameServer);
    this.controllers.push(player.id);
    return player;
};


Faction.prototype.addBot = function (home, player, shard) {
    var bot = new Bot(shard.name, player, home, this, this.gameServer);
    player.addBot(bot);
    this.controllers.push(bot.id);
    return bot;
};

Faction.prototype.addSuperBot = function (player) {
    var bot = new SuperBot(Math.random(), "SUPAHBot", this, this.gameServer, player);
    player.addBot(bot);
    this.controllers.push(bot.id);
    return bot;
};

Faction.prototype.addHeadquarter = function () {
    if (!this.headquarter) {
        var headquarter = new Headquarter(this, this.x, this.y, this.gameServer);
        this.headquarter = headquarter.id;
        this.homes.push(headquarter.id);
        this.updateCoords();
    }
};

Faction.prototype.addSentinel = function (player) {
    var tile = this.gameServer.getEntityTile(player);
    if (tile !== null && !tile.home &&
        Math.abs(tile.x + tile.length / 2 - player.x) < (tile.length) &&
        Math.abs(tile.y + tile.length / 2 - player.y) < (tile.length) &&
        player.shards.length >= 2) {

        var neighbor = this.isNeighboringFaction(tile, 2);
        if (neighbor) {
            var sentinel = new Sentinel(this, tile.x + tile.length / 2,
                tile.y + tile.length / 2, this.gameServer);
            sentinel.addNeighbor(neighbor);
            neighbor.addNeighbor(sentinel);

            for (var i = player.shards.length - 1; i >= 0; i--) {
                var shard = this.gameServer.PLAYER_SHARD_LIST[player.shards[i]];
                player.removeShard(shard);
                sentinel.addShard(shard);
            }
            this.homes.push(sentinel.id);
            this.updateCoords();
        }
        else {
            console.log("NOT NEIGHBORING THE FACTION!");
        }
    }
};


Faction.prototype.addBarracks = function (player) {
    var tile = this.gameServer.getEntityTile(player);
    var parent = this.isNeighboringFaction(tile, 1);
    if (parent &&
        player.shards.length >= 1) {
        var barracks = new Barracks(this, player.x, player.y, this.gameServer, parent);
        parent.addChild(barracks);

        for (var i = player.shards.length - 1; i >= 0; i--) {
            var shard = this.gameServer.PLAYER_SHARD_LIST[player.shards[i]];
            player.removeShard(shard);
            barracks.addShard(shard);
        }
    }
};




Faction.prototype.addTower = function (player) {
    var tile = this.gameServer.getEntityTile(player);
    var parent = this.isNeighboringFaction(tile, 1);
    if (parent &&
        player.shards.length >= 2) {
        var tower = new Tower(this, player.x, player.y, this.gameServer, parent);
        parent.addChild(tower);

        for (var i = player.shards.length - 1; i >= 0; i--) {
            var shard = this.gameServer.PLAYER_SHARD_LIST[player.shards[i]];
            player.removeShard(shard);
            tower.addShard(shard);
        }
    }
};

Faction.prototype.removeHome = function (home) {
    var index = this.homes.indexOf(home.id);
    this.homes.splice(index, 1);
    this.checkStatus();
};

Faction.prototype.removeController = function (player) {
    var index = this.controllers.indexOf(player.id);
    this.controllers.splice(index, 1);
    this.checkStatus();
};


Faction.prototype.checkStatus = function () {
    if (this.homes.length === 0 && this.controllers.length === 0) {
        this.onDelete();
    }
};


Faction.prototype.onDelete = function () {
    delete this.gameServer.FACTION_LIST[this.name];
    delete this.gameServer.CHUNKS[this.chunk].FACTION_LIST[this.name];
    this.packetHandler.deleteFactionPackets(this);
};


Faction.prototype.isNeighboringFaction = function (tile, range) { //has to neighbor sentinel or HQ
    var check;
    var coords = {};

    if (tile.faction === this.faction) { //not neighbor, but is part of the faction
        return false;
    }
    for (var i = -range; i <= range; i++) {
        for (var j = -range; j <= range; j++) {
            coords['x'] = tile.x + tile.length / 2 + tile.length * i;
            coords['y'] = tile.y + tile.length / 2 + tile.length * j;
            check = this.gameServer.getEntityTile(coords);
            if (check && check.faction === this.name) {
                var home = this.gameServer.HOME_LIST[check.home];
                if (home.type === "Headquarter" || home.type === "Sentinel") {
                    return home;
                }
            }
        }
    }
    return false;
};


module.exports = Faction;