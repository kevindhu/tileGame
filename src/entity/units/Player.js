const entityConfig = require('../entityConfig');
const Arithmetic = require('../../modules/Arithmetic');
var EntityFunctions = require('../EntityFunctions');
var Controller = require('./Controller');
var lerp = require('lerp');

function Player(id, name, faction, gameServer) {
    Player.super_.call(this, id, faction, gameServer);
    this.name = getName(name);
    this.type = "Player";
    this.radius = 10;
    this.maxSpeed = 10;
    this.selectedCount = 0;

    this.bots = [];
    this.boosterBots = [];
    this.stealthBots = [];

    this.shards = [];
    this.shardNamer = "unnamed bot";
    this.viewing = null;
    this.init();
}

EntityFunctions.inherits(Player, Controller);


Player.prototype.addView = function (home) {
    this.viewing = home.id;
};

Player.prototype.removeView = function () {
    this.viewing = null;
};

Player.prototype.onDelete = function () {
    this.dropAllShards();
    var home = this.gameServer.HOME_LIST[this.viewing];
    if (home) {
        home.removeViewer(this);
    }
    Player.super_.prototype.onDelete.apply(this);
};

Player.prototype.shootShard = function (controller) {
};


Player.prototype.addBoosterBot = function (bot) {
    this.boosterBots.push(bot.id);
    this.addBot(bot);
};

Player.prototype.addStealthBot = function (bot) {
    this.stealthBots.push(bot.id);
    this.addBot(bot);
};

Player.prototype.removeStealthBot = function (bot) {
    var index = this.stealthBots.indexOf(bot.id);
    this.stealthBots.splice(index, 1);
};

Player.prototype.removeBoosterBot = function (bot) {
    var index = this.boosterBots.indexOf(bot.id);
    this.boosterBots.splice(index, 1);
};

Player.prototype.addBot = function (bot) {
    this.bots.push(bot.id);
};

Player.prototype.removeBot = function (bot) {
    var index = this.bots.indexOf(bot.id);
    this.bots.splice(index, 1);
};

Player.prototype.selectBot = function (bot) {
    bot.becomeSelected();
    this.selectedCount++;
};


Player.prototype.isTarget = function (x, y) {
    var target = null;
    var bound = {
        minx: x - 20,
        miny: y - 20,
        maxx: x + 20,
        maxy: y + 20
    };
    this.gameServer.controllerTree.find(bound, function (controller) {
        if (this.faction !== this.faction) {
            target = controller;
        }
    }.bind(this));
    if (!target) {
        this.gameServer.homeTree.find(bound, function (home) {
            target = home;
        }.bind(this));
    }
    return target;
};

Player.prototype.addShardNamer = function (name) {
    this.shardNamer = name;
};

Player.prototype.moveBots = function (x, y) {
    var target = this.isTarget(this.x + x, this.y + y);

    //make an array to go to
    var row = Math.floor(Math.sqrt(this.selectedCount)) + 1;

    var index = 0;
    for (var i = 0; i < this.bots.length; i++) {
        var bot = this.gameServer.CONTROLLER_LIST[this.bots[i]];
        var rIndex, cIndex;
        if (!bot) {
            return;
        }
        if (bot.selected) {
            if (target && target.faction) {
                if (target.faction === this.faction && target.type === "Barracks") {
                    bot.setFriendly(target);
                }
                else {
                    bot.setEnemy(target);
                }
            } else {
                rIndex = index % row;
                cIndex = Math.floor(index / row);
                bot.setManual(this.x + x + 100 * rIndex, this.y + y + 100 * cIndex);
                index++;
            }
        }

    }

};

Player.prototype.resetSelect = function () {
    this.selectedCount = 0;
    for (var i = 0; i < this.bots.length; i++) {
        var bot = this.gameServer.CONTROLLER_LIST[this.bots[i]];
        bot.removeSelect();
    }
};

Player.prototype.groupBots = function () { //get all bots back to player
    for (var i = 0; i < this.bots.length; i++) {
        var bot = this.gameServer.CONTROLLER_LIST[this.bots[i]];
        if (bot.selected) {
            bot.regroup();
        }
    }
};

Player.prototype.attemptBoost = function () {
    var bot;
    for (var i = 0; i < this.boosterBots.length; i++) {
        bot = this.gameServer.CONTROLLER_LIST[this.boosterBots[i]];
        if (bot) {
            bot.addBoost();
        }
    }
};

Player.prototype.attemptStealth = function () {
    var bot;

    for (var i = 0; i < this.stealthBots.length; i++) {
        bot = this.gameServer.CONTROLLER_LIST[this.stealthBots[i]];
        if (bot) {
            bot.addStealth();
        }
    }
};

Player.prototype.createBoundary = function (boundary) {
    var playerBoundary = {};
    playerBoundary.minx = this.x + boundary.minX;
    playerBoundary.miny = this.y + boundary.minY;
    playerBoundary.maxx = this.x + boundary.maxX;
    playerBoundary.maxy = this.y + boundary.maxY;
    playerBoundary.player = this.id;
    return playerBoundary;
};

Player.prototype.update = function () {
    var tile = this.gameServer.getEntityTile(this);
    var faction = this.gameServer.FACTION_LIST[this.faction];

    if (tile) {
        if (this.shards.length > 1 && faction.isNeighboringFaction(tile, 2) && !tile.faction) {
            this.packetHandler.addBracketPackets(this, tile);
            this.addSentinelPrompt();
        }
        else {
            this.removeSentinelPrompt();
        }
    }


    Player.super_.prototype.update.apply(this);
};


Player.prototype.updateMaxSpeed = function () { //resets to 10, change this
    this.maxXSpeed = this.maxSpeed;
    this.maxYSpeed = this.maxSpeed;
};


Player.prototype.getRandomShard = function () {
    var randomIndex = Arithmetic.getRandomInt(0, this.shards.length - 1);
    return this.shards[randomIndex];
};


Player.prototype.addShard = function (shard) {
    this.increaseHealth(1);
    if (shard.name === null) {
        this.transformEmptyShard(shard);
    }
    this.shards.push(shard.id);
    shard.becomePlayer(this);
    this.updateMaxSpeed();
    this.gameServer.PLAYER_SHARD_LIST[shard.id] = shard;
};

Player.prototype.removeShard = function (shard) {
    var index = this.shards.indexOf(shard.id);
    this.shards.splice(index, 1);
    this.updateMaxSpeed();
    shard.timer = 0;
    this.packetHandler.deleteBracketPackets(this);
};

Player.prototype.transformEmptyShard = function (shard) {
    shard.setName(this.shardNamer);
};

Player.prototype.decreaseHealth = function (amount) {
    if (this.shards.length > 0) {
        var filteredAmount = amount / this.shards.length;
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


Player.prototype.updateChunk = function () {
    var oldChunks = this.findNeighboringChunks();
    Player.super_.prototype.updateChunk.apply(this);
    var newChunks = this.findNeighboringChunks();
    this.chunkAdd = this.findChunkDifference(newChunks, oldChunks);
    this.chunkDelete = this.findChunkDifference(oldChunks, newChunks);
};

Player.prototype.findChunkDifference = function (chunks1, chunks2) {
    var delta = {};
    for (var id in chunks1) {
        if (chunks2[id] === undefined) {
            delta[id] = id;
        }
    }
    return delta;
};

Player.prototype.findNeighboringChunks = function () {
    var rowLength = Math.sqrt(entityConfig.CHUNKS);
    var chunks = {};

    for (var i = 0; i < 9; i++) {
        var chunk = this.chunk;
        var xIndex = i % 3 - 1;
        var yIndex = Math.floor(i / 3) - 1;

        while (!(chunk % rowLength + xIndex).between(0, rowLength - 1) ||
        !(Math.floor(chunk / rowLength) + yIndex).between(0, rowLength - 1)) {
            i++;
            if (i > 8) {
                return chunks;
            }
            xIndex = i % 3 - 1;
            yIndex = Math.floor(i / 3) - 1;
        }
        chunk += xIndex + rowLength * yIndex;
        chunks[chunk] = chunk;
    }
    return chunks;
};

Player.prototype.dropRandomShard = function () {
    var shard = this.getRandomShard();
    this.dropShard(shard);
};

Player.prototype.dropShard = function (shard) {
    if (shard) {
        this.removeShard(shard);
        shard.becomeControllerShooting(this, Arithmetic.getRandomInt(-30, 30),
            Arithmetic.getRandomInt(-30, 30))
    }
};

Player.prototype.dropAllShards = function () {
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
    var headquarter = this.gameServer.HOME_LIST[faction.headquarter];
    if (headquarter) {
        this.x = headquarter.x;
        this.y = headquarter.y;
    }
    else {
        this.x = entityConfig.WIDTH / 2;
        this.y = entityConfig.WIDTH / 2;
    }
    this.maxSpeed = 10;
    this.xSpeed = 0;
    this.ySpeed = 0;
    this.health = 5;
    this.stationary = false;
    this.updateQuadItem();
};


function getName(name) {
    if (name === "") {
        return "unnamed friend";
    }
    return name;
}

Player.prototype.addHomePrompt = function () {
    this.homePrompt = true;
    this.packetHandler.addPromptMsgPackets(this, "press Space for Home Info");
};
Player.prototype.removeHomePrompt = function () {
    if (this.homePrompt) {
        this.packetHandler.deletePromptMsgPackets(this, "home prompt");
        this.homePrompt = false;
    }
};


Player.prototype.addSentinelPrompt = function () {
    this.sentinelPrompt = true;
    this.packetHandler.addPromptMsgPackets(this, "press N to place Barracks");
};
Player.prototype.removeSentinelPrompt = function () {
    if (this.sentinelPrompt) {
        this.sentinelPrompt = false;
        this.packetHandler.deletePromptMsgPackets(this, "sentinel prompt");
        this.packetHandler.deleteBracketPackets(this);
    }
};


module.exports = Player;
