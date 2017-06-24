const randomWord = require('random-word');
const entityConfig = require('./entityConfig');
const Arithmetic = require('../modules/Arithmetic');
var lerp = require('lerp');

function Player(id, name, faction, gameServer) {
    this.gameServer = gameServer;
    this.packetHandler = gameServer.packetHandler;
    this.id = id;

    this.x = entityConfig.WIDTH / 2;
    this.y = entityConfig.WIDTH / 2;
    this.color = getRandomColor();
    this.name = getName(name);
    this.health = 5;
    this.maxSpeed = 10;
    this.timer = 0;
    this.xSpeed = 0;
    this.ySpeed = 0;
    this.shards = [];

    this.faction = faction;
    this.emptyShard = null;
    this.init();
}

Player.prototype.init = function () {
    this.gameServer.PLAYER_LIST[this.id] = this;
    this.gameServer.packetHandler.addPlayerPackets(this);
}

Player.prototype.dropAllShards = function () {
    for (var i = this.shards.length - 1; i >= 0; i--) {
        var shard = this.gameServer.PLAYER_SHARD_LIST[this.shards[i]];
        this.dropShard(shard);
    }
    if (this.emptyShard !== null) {
        this.dropShard(this.emptyShard);
        this.emptyShard = null;
    }
};

Player.prototype.onDelete = function () {
    this.dropAllShards();
    this.faction.removePlayer(this);
    delete this.gameServer.PLAYER_LIST[this.id];
    this.packetHandler.deletePlayerPackets(this);
}


Player.prototype.update = function () {
    if (this.timer > 0) {
        this.timer -= 1;
    }
    this.updatePosition();

    var tile = this.gameServer.getEntityTile(this);
    if (tile) {
        if (tile.owner === this.faction) {
            this.increaseHealth(0.1);
        }
        else if (tile.owner !== null) {
            this.decreaseHealth(0.1);
        }
    }
    this.packetHandler.updatePlayersPackets(this);
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
    if (shard.name === null) {
        this.emptyShard = shard;
    }
    else {
        this.shards.push(shard.id);
    }
    shard.becomePlayer(this);
    this.gameServer.PLAYER_SHARD_LIST[shard.id] = shard;
};

Player.prototype.removeShard = function (shard) {
    if (shard === this.emptyShard) {
        this.emptyShard = null;
    }
    else {
        var index = this.shards.indexOf(shard.id);
        this.shards.splice(index, 1);
    }
    shard.timer = 0;
};

Player.prototype.transformEmptyShard = function (name) {
    if (this.emptyShard !== null) {
        this.emptyShard.setName(name);
        this.addShard(this.emptyShard);
        this.emptyShard = null;
    }
};

Player.prototype.decreaseHealth = function (amount) {
    this.health -= amount;
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

    this.x = entityConfig.WIDTH / 2;
    this.y = entityConfig.WIDTH / 2;
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

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
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
