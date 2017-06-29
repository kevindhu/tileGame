const entityConfig = require('./entityConfig');
const Arithmetic = require('../modules/Arithmetic');
var lerp = require('lerp');

function Player(id, name, faction, gameServer) {
    this.gameServer = gameServer;
    this.packetHandler = gameServer.packetHandler;
    this.id = id;

    this.x = entityConfig.WIDTH / 2;
    this.y = entityConfig.WIDTH / 2;
    this.name = getName(name);
    this.health = 5;
    this.maxSpeed = 10;
    this.timer = 0;
    this.xSpeed = 0;
    this.ySpeed = 0;
    this.shards = [];

    this.faction = faction.name;
    this.emptyShard = null;
    this.init();
}

Player.prototype.init = function () {
    this.gameServer.PLAYER_LIST[this.id] = this;
    this.gameServer.packetHandler.addPlayerPackets(this);
}

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

Player.prototype.onDelete = function () {
    this.dropAllShards();
    this.gameServer.FACTION_LIST[this.faction].removePlayer(this);
    delete this.gameServer.PLAYER_LIST[this.id];
    this.packetHandler.deletePlayerPackets(this);
};


Player.prototype.update = function () {
    var tile = this.gameServer.getEntityTile(this);
    var faction = this.gameServer.FACTION_LIST[this.faction];

    if (this.timer > 0) {
        this.timer -= 1;
    }
    this.updatePosition();

    if (tile) {
        if (tile.faction === this.faction) {
            this.increaseHealth(0.1);
        }
        else if (tile.faction !== null) {
            var home = this.gameServer.HOME_LIST[tile.home];
            home.shootShard(this);
            this.decreaseHealth(0.1);
        }
        else if (this.shards.length > 1 && faction.isNeighboringFaction(tile)) {
            this.packetHandler.addBracketPackets(this, tile);
        }
    }
    this.packetHandler.updatePlayersPackets(this);
};


Player.prototype.updateMaxSpeed = function () {
    this.maxSpeed = 10 * Math.pow(0.9,this.shards.length);
}


Player.prototype.updatePosition = function () {
    if (this.pressingDown) {
        if (!onBoundary(this.y + this.maxSpeed)) {
            this.ySpeed = lerp(this.ySpeed, this.maxSpeed, 0.3);
        }
        else {
            this.ySpeed = 0;
        }
    }
    if (this.pressingUp) {
        if (!onBoundary(this.y - this.maxSpeed)) {
            this.ySpeed = lerp(this.ySpeed, -this.maxSpeed, 0.3);
        }
        else {
            this.ySpeed = 0;
        }
    }
    if (this.pressingLeft) {
        if (!onBoundary(this.x - this.maxSpeed)) {
            this.xSpeed = lerp(this.xSpeed, -this.maxSpeed, 0.3);
        }
        else {
            this.xSpeed = 0;
        }
    }
    if (this.pressingRight) {
        if (!onBoundary(this.x + this.maxSpeed)) {
            this.xSpeed = lerp(this.xSpeed, this.maxSpeed, 0.3);
        }
        else {
            this.xSpeed = 0;
        }
    }


    if (!this.pressingRight && !this.pressingLeft) {
        this.xSpeed = lerp(this.xSpeed,0,0.3);
    }
    if (!this.pressingUp && !this.pressingDown) {
        this.ySpeed = lerp(this.ySpeed,0,0.3);
    }
    this.y += this.ySpeed;
    this.x += this.xSpeed;


    var checkStuck = function (coord) {
        var newCoord;
        if (overBoundary(coord)) {
            if (coord < entityConfig.WIDTH/2) {
                var newCoord = entityConfig.BORDER_WIDTH + 100;
                return newCoord;
            }
            else {
                var newCoord = entityConfig.WIDTH - entityConfig.BORDER_WIDTH - 100;
                return newCoord;
            }
        }
        return coord;
    };

    this.x = checkStuck(this.x);
    this.y = checkStuck(this.y);
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
    this.packetHandler.updatePlayersPackets(this);
}

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
        shard.becomeShooting(this, Arithmetic.getRandomInt(-30, 30), 
            Arithmetic.getRandomInt(-30, 30))
    }
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
}


function getName(name) {
    if (name === "") {
        return "unnamed friend";
    }
    return name;
}



function onBoundary (coord) {
    return coord <= entityConfig.BORDER_WIDTH ||
        coord >= entityConfig.WIDTH - entityConfig.BORDER_WIDTH;
};

function overBoundary (coord) {
    return coord < entityConfig.BORDER_WIDTH - 1 ||
        coord > entityConfig.WIDTH - entityConfig.BORDER_WIDTH + 1;
};

module.exports = Player;
