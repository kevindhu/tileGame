const entityConfig = require('./entityConfig');
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
    this.gameServer.STATIC_SHARD_LIST[this.id] = this;
    this.packetHandler.addShardPackets(this);
};


Shard.prototype.limbo = function () {
    this.gameServer.shardTree.remove(this.quadItem);
    this.gameServer.shootingShardTree.remove(this.quadItem);

    delete this.gameServer.PLAYER_SHARD_LIST[this.id];
    delete this.gameServer.SHOOTING_SHARD_LIST[this.id];
    delete this.gameServer.HOME_SHARD_LIST[this.id];
    delete this.gameServer.STATIC_SHARD_LIST[this.id];
};

Shard.prototype.setName = function (name) {
    this.name = name;
};


Shard.prototype.becomeStatic = function () {
    this.visible = true;
    this.owner = null;
    this.timer = 0;
    this.type = "static";
    this.limbo();

    this.updateQuadItem();
    this.gameServer.shardTree.insert(this.quadItem);
    this.gameServer.STATIC_SHARD_LIST[this.id] = this;
};

Shard.prototype.becomeShooting = function (player, xVel, yVel, temp) {
    if (temp) {
        this.type = "tempShooting";
    }
    else {
        this.type = "shooting";
    }
    this.visible = true;
    this.limbo();
    this.owner = player.id;
    this.addVelocity(xVel, yVel);

    this.gameServer.shootingShardTree.insert(this.quadItem);
    this.gameServer.SHOOTING_SHARD_LIST[this.id] = this;
};

Shard.prototype.becomePlayer = function (player) {
    this.visible = true;
    this.owner = player.id;
    this.timer = 100;
    this.type = "player";
    this.updateQuadItem();
    this.limbo();

    this.gameServer.shardTree.insert(this.quadItem);
    this.gameServer.PLAYER_SHARD_LIST[this.id] = this;
};

Shard.prototype.becomeHome = function (home) {
    this.visible = false;
    this.home = home;
    this.type = "home";
    this.limbo();
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
            var player = this.gameServer.PLAYER_LIST[this.owner];
            this.follow(player);
            break;
        case "home":
            //this.rotate();
            break;
    }
    this.packetHandler.updateShardsPackets(this);
};

Shard.prototype.useSupply = function () {
    this.supply -= 1;
};

Shard.prototype.rotate = function () {
    if (this.home !== null) {
        var radius = this.home.radius;
        this.x = this.home.x + radius * Math.cos(this.theta);
        this.y = this.home.y + radius * Math.sin(this.theta);
        this.theta += Math.PI / 50;
    }
};

Shard.prototype.follow = function (owner) {
    this.x = owner.x ;//+ Arithmetic.getRandomInt(-5, 5);
    this.y = owner.y ;//+ Arithmetic.getRandomInt(-5, 5);

    this.gameServer.shardTree.remove(this.quadItem);
    this.gameServer.shardTree.insert(this.quadItem);
};

Shard.prototype.addVelocity = function (x,y) {
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

    this.xVel = lerp(this.xVel,0,0.2);
    this.yVel = lerp(this.yVel,0,0.2);

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


var onBoundary = function (coord) {
    return coord <= entityConfig.BORDER_WIDTH || coord >= entityConfig.WIDTH - entityConfig.BORDER_WIDTH;
};

module.exports = Shard;