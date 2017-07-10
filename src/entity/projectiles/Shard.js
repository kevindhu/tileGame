const entityConfig = require('../entityConfig');
var EntityFunctions = require('../EntityFunctions');
var lerp = require('lerp');

function Shard(x, y, gameServer) {
    this.gameServer = gameServer;
    this.packetHandler = gameServer.packetHandler;
    this.name = null;
    this.id = Math.random();
    this.x = x;
    this.y = y;
    this.type = "static";
    this.supply = 10;

    this.owner = null;
    this.home = null;
    this.faction = null;

    this.xVel = 0;
    this.yVel = 0;

    this.value = 0;
    this.timer = 0;
    this.theta = 0;

    this.visible = true;
    this.xSwitched = false;
    this.ySwitched = false;
    this.radius = entityConfig.SHARD_WIDTH;

    this.init();
}


Shard.prototype.init = function () {
    this.addQuadItem();
    this.gameServer.shardTree.insert(this.quadItem);
    this.chunk = EntityFunctions.findChunk(this.gameServer, this);
    this.gameServer.CHUNKS[this.chunk].STATIC_SHARD_LIST[this.id] = this;
    this.gameServer.STATIC_SHARD_LIST[this.id] = this;
    this.packetHandler.addShardPackets(this);
};


Shard.prototype.limbo = function () {
    this.removeOwner();
    this.removeHome();
    this.removeFaction();

    this.gameServer.shardTree.remove(this.quadItem);
    this.gameServer.shootingShardTree.remove(this.quadItem);

    delete this.gameServer.CHUNKS[this.chunk].STATIC_SHARD_LIST[this.id];
    delete this.gameServer.CHUNKS[this.chunk].PLAYER_SHARD_LIST[this.id];
    delete this.gameServer.CHUNKS[this.chunk].SHOOTING_SHARD_LIST[this.id];
    delete this.gameServer.CHUNKS[this.chunk].HOME_SHARD_LIST[this.id];

    delete this.gameServer.STATIC_SHARD_LIST[this.id];
    delete this.gameServer.PLAYER_SHARD_LIST[this.id];
    delete this.gameServer.SHOOTING_SHARD_LIST[this.id];
    delete this.gameServer.HOME_SHARD_LIST[this.id];
};

Shard.prototype.setName = function (name) {
    this.name = name;
};

Shard.prototype.setHome = function (home) {
    this.home = home.id;
};

Shard.prototype.setOwner = function (owner) {
    var faction = this.gameServer.FACTION_LIST[owner.faction];
    this.owner = owner.id;
    this.setFaction(faction);
};

Shard.prototype.setFaction = function (faction) {
    this.faction = faction.name;
};

Shard.prototype.removeOwner = function () {
    this.owner = null;
    this.faction = null;
};

Shard.prototype.removeHome = function () {
    this.home = null;
};

Shard.prototype.removeFaction = function () {
    this.faction = null;
}

Shard.prototype.becomeStatic = function () {
    this.limbo();
    this.type = "static";
    this.visible = true;
    this.timer = 0;

    this.updateQuadItem();
    this.gameServer.shardTree.insert(this.quadItem);
    this.gameServer.STATIC_SHARD_LIST[this.id] = this;
};

Shard.prototype.becomeShooting = function (xVel, yVel, temp) {
    this.limbo();
    if (temp) {
        this.type = "tempShooting";
    }
    else {
        this.type = "shooting";
    }
    this.visible = true;
    this.addVelocity(xVel, yVel);

    this.gameServer.shootingShardTree.insert(this.quadItem);
    this.gameServer.SHOOTING_SHARD_LIST[this.id] = this;
};


Shard.prototype.becomePlayerShooting = function (player, xVel, yVel, temp) {
    this.becomeShooting(xVel, yVel, temp);
    this.setOwner(player);
};

Shard.prototype.becomeHomeShooting = function (home, xVel, yVel, temp) {
    this.becomeShooting(xVel, yVel, temp);
    var faction = this.gameServer.FACTION_LIST[home.faction];
    this.setFaction(faction);
};


Shard.prototype.becomePlayer = function (player) {
    this.limbo();
    this.type = "player";
    this.timer = 100;
    this.visible = true;

    this.setOwner(player);
    this.updateQuadItem();

    this.gameServer.shardTree.insert(this.quadItem);
    this.gameServer.PLAYER_SHARD_LIST[this.id] = this;
};

Shard.prototype.becomeHome = function (home) {
    this.limbo();
    this.type = "home";
    this.visible = false;

    this.setHome(home);
    this.gameServer.HOME_SHARD_LIST[this.id] = this;
};

Shard.prototype.updatePosition = function () {
    if (this.timer > 0) {
        this.timer -= 1;
    }
    this.updateQuadItem();

    switch (this.type) {
        case "shooting":
        case "tempShooting":
            this.move();
            break;
        case "player":
            var player = this.gameServer.CONTROLLER_LIST[this.owner];
            this.follow(player);
            break;
        case "home":
            //this.rotate();
            break;
    }
    this.packetHandler.updateShardsPackets(this);
};

Shard.prototype.updateChunk = function () {
    var newChunk = EntityFunctions.findChunk(this.gameServer, this);
    if (newChunk !== this.chunk) {
        //delete old chunk shard
        switch (this.type) {
            case "shooting":
            case "tempShooting":
                delete this.gameServer.CHUNKS[this.chunk].SHOOTING_SHARD_LIST[this.id];
                this.chunk = newChunk;
                this.gameServer.CHUNKS[this.chunk].SHOOTING_SHARD_LIST[this.id] = this;
                break;
            case "player":
                delete this.gameServer.CHUNKS[this.chunk].PLAYER_SHARD_LIST[this.id];
                this.chunk = newChunk;
                this.gameServer.CHUNKS[this.chunk].PLAYER_SHARD_LIST[this.id] = this;
                break;
            case "home":
                delete this.gameServer.CHUNKS[this.chunk].HOME_SHARD_LIST[this.id];
                this.chunk = newChunk;
                this.gameServer.CHUNKS[this.chunk].HOME_SHARD_LIST[this.id] = this;
                break;
        }
    }
};

Shard.prototype.useSupply = function () {
    this.supply -= 1;
};


Shard.prototype.follow = function (owner) {
    this.x = owner.x;//+ Arithmetic.getRandomInt(-5, 5);
    this.y = owner.y;//+ Arithmetic.getRandomInt(-5, 5);

    this.gameServer.shardTree.remove(this.quadItem);
    this.gameServer.shardTree.insert(this.quadItem);
};

Shard.prototype.addVelocity = function (x, y) {
    this.xVel = x;
    this.yVel = y;

    this.xSwitched = false;
    this.ySwitched = false;
};


Shard.prototype.onDelete = function () {
    this.limbo();
    this.packetHandler.addShardAnimationPackets(this, "shardDeath");
    this.packetHandler.deleteShardPackets(this);
};

Shard.prototype.move = function () {
    if (this.xVel === 0) {
        if (this.type === "tempShooting") {
            return this.onDelete();
        }
        return this.becomeStatic();
    }

    if (this.xVel > -0.1 && this.xVel < 0.1) {
        this.xVel = 0;
        this.yVel = 0;
    }

    if (onBoundary(this.x) && !this.xSwitched) {
        this.xVel = -this.xVel;
        this.xSwitched = true;
    }
    if (onBoundary(this.y) && !this.ySwitched) {
        this.yVel = -this.yVel;
        this.ySwitched = true;
    }

    this.x += this.xVel;
    this.y += this.yVel;

    this.xVel = lerp(this.xVel, 0, 0.2);
    this.yVel = lerp(this.yVel, 0, 0.2);

    this.gameServer.shootingShardTree.remove(this.quadItem);
    this.gameServer.shootingShardTree.insert(this.quadItem);
};

Shard.prototype.addQuadItem = function () {
    this.quadItem = {
        cell: this,
        bound: {
            minx: this.x - this.radius,
            miny: this.y - this.radius,
            maxx: this.x + this.radius,
            maxy: this.y + this.radius
        }
    };
};

Shard.prototype.updateQuadItem = function () {
    this.quadItem.bound = {
        minx: this.x - this.radius * 4,
        miny: this.y - this.radius * 4,
        maxx: this.x + this.radius * 4,
        maxy: this.y + this.radius * 4
    };
};

Shard.prototype.rotate = function () { //DEPRECATED
    if (this.home !== null) {
        var home = this.gameServer.HOME_LIST[this.home];

        var radius = home.radius;
        this.x = home.x + radius * Math.cos(this.theta);
        this.y = home.y + radius * Math.sin(this.theta);
        this.theta += Math.PI / 50;
    }
};


var onBoundary = function (coord) {
    return coord <= entityConfig.BORDER_WIDTH || coord >= entityConfig.WIDTH - entityConfig.BORDER_WIDTH;
};


module.exports = Shard;