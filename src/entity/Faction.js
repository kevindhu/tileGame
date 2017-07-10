const entityConfig = require('./entityConfig');
const Arithmetic = require('../modules/Arithmetic');
var EntityFunctions = require('./EntityFunctions');
var Player = require('./Player');
var Bot = require('./Bot');
var SuperBot = require("./SuperBot");
var Headquarter = require('./Headquarter');
var Tower = require('./Tower');
var Sentinel = require('./Sentinel');

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


Faction.prototype.addBot = function (player) {
    var bot = new Bot(Math.random(), "shitBot", this, this.gameServer, player);
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
        Math.abs(tile.x + tile.length / 2 - player.x) < (tile.length ) &&
        Math.abs(tile.y + tile.length / 2 - player.y) < (tile.length ) &&
        player.shards.length >= 2) {

        if (this.isNeighboringFaction(tile)) {
            var sentinel = new Sentinel(this, tile.x + tile.length / 2,
                tile.y + tile.length / 2, this.gameServer);

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


Faction.prototype.addTower = function (player) {
    var tile = this.gameServer.getEntityTile(player);
    if (tile !== null &&
        tile.home !== null &&
        tile.faction === player.faction &&
        player.shards.length >= 2) {

        var home = this.gameServer.HOME_LIST[tile.home];
        var tower = new Tower(this, player.x, player.y, this.gameServer, home);

        home.addChild(tower);

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



Faction.prototype.isNeighboringFaction = function (tile) {
    var check;
    var coords = {};

    if (tile.faction === this.faction) { //not neighbor, but is part of the faction
        return false;
    }
    for (var i = -1; i <= 1; i++) {
        coords['x'] = tile.x + tile.length / 2 + tile.length * i;
        coords['y'] = tile.y + tile.length / 2;
        check = this.gameServer.getEntityTile(coords);
        if (check && check.faction === this.name) {
            return true;
        }
    }
    for (var j = -1; j <= 1; j++) {
        coords['x'] = tile.x + tile.length / 2;
        coords['y'] = tile.y + tile.length / 2 + tile.length * j;
        check = this.gameServer.getEntityTile(coords);
        if (check && check.faction === this.name) {
            return true;
        }
    }
    return false;
};



module.exports = Faction;