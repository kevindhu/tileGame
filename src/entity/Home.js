const entityConfig = require('./entityConfig');
const Arithmetic = require('../modules/Arithmetic');
var EntityFunctions = require('./EntityFunctions');

function Home(faction, x, y, gameServer) {
    this.gameServer = gameServer;
    this.packetHandler = gameServer.packetHandler;

    this.id = Math.random();

    this.x = x;
    this.y = y;

    this.faction = faction.name;
    this.tile = null;
    this.neighbors = [];

    this.children = [];
    this.shards = [];

    this.level = 0;
    this.radius = 10;
    this.health = 1;
    this.hasColor = false;
}

Home.prototype.mainInit = function () {
    var tile = this.gameServer.getEntityTile(this);
    if (!tile.hasHome()) {
        tile.setHome(this);
        this.tile = tile.id;
        this.packetHandler.updateTilesPackets(tile);
    }
    if (this.type !== "Tower") {
        this.addAllNeighbors();
    }
    this.gameServer.HOME_LIST[this.id] = this;
    this.addQuadItem();
    this.gameServer.homeTree.insert(this.quadItem);
    this.packetHandler.addHomePackets(this);
};


Home.prototype.addAllNeighbors = function () {
    var coords = {};
    var tile = this.gameServer.TILE_LIST[this.tile];
    var check;

    for (var i = -1; i <= 1; i++) {
        for (var j = -1; j <= 1; j++) {
            if (!(i === 0 && j === 0)) {
                coords['x'] = tile.x + tile.length / 2 + tile.length * i;
                coords['y'] = tile.y + tile.length / 2 + tile.length * j;
                check = this.gameServer.getEntityTile(coords);
                if (check && check.faction === this.faction) {
                    this.neighbors.push(check.home);
                    var neighbor = this.gameServer.HOME_LIST[check.home];
                    neighbor.addNeighbor(this);
                }
            }
        }
    }
};

Home.prototype.removeAllNeighbors = function () {
    var neighbor;
    for (var i = this.neighbors.length - 1; i >= 0; i--) {
        neighbor = this.gameServer.HOME_LIST[this.neighbors[i]];
        neighbor.removeNeighbor(this);
    }
};

Home.prototype.addNeighbor = function (home) {
    this.neighbors.push(home.id);
    this.packetHandler.updateHomePackets(this);
};

Home.prototype.removeChild = function (home) {
    var index = this.children.indexOf(home.id);
    this.children.splice(index, 1);
};



Home.prototype.removeNeighbor = function (home) {
    var index = this.neighbors.indexOf(home.id);
    this.neighbors.splice(index, 1);
    this.updateLevel();
    this.packetHandler.updateHomePackets(this);
};


Home.prototype.decreaseHealth = function (amount) {
    var faction = this.gameServer.FACTION_LIST[this.faction];
    var hq = this.gameServer.HOME_LIST[faction.headquarter];

    if (this.neighbors.length === 4) {
        var neighbor = this.gameServer.HOME_LIST[this.neighbors[Math.floor(Arithmetic.getRandomInt(0, 3))]];
        neighbor.decreaseHealth(1);
        return;
    }

    this.health -= amount;
    if (this.tile) {
        var tile = this.gameServer.TILE_LIST[this.tile];
        tile.alert = true;
        this.packetHandler.updateTilesPackets(tile);
    }

    if (amount >= 1) {
        this.dropShard();
        hq.giveShard(this);
    }

    if (this.health <= 0) {
        this.onDelete();
    }
    else {
        this.packetHandler.updateHomePackets(this);
    }
};


Home.prototype.getRandomShard = function () {
    var randomIndex = Arithmetic.getRandomInt(0, this.shards.length - 1);
    return this.shards[randomIndex];
};


Home.prototype.shootShard = function (player) {
};

Home.prototype.removeShard = function (shard) {
    shard.home = null;
    var index = this.shards.indexOf(shard.id);
    this.shards.splice(index, 1);
    this.updateLevel();
    this.packetHandler.updateHomePackets(this);
};

Home.prototype.getSupply = function () {
    return this.shards.length;
};

Home.prototype.onDelete = function () {
    for (var i = this.shards.length - 1; i >= 0; i--) {
        this.dropShard();
    }
    for (var i = this.children.length - 1; i >= 0; i--) {
        var tower = this.gameServer.HOME_LIST[this.children[i]];
        tower.onDelete();
    }
    this.removeAllNeighbors();
    var faction = this.gameServer.FACTION_LIST[this.faction];
    faction.removeHome(this);
    if (this.tile) {
        this.gameServer.TILE_LIST[this.tile].removeHome();
    }

    this.gameServer.homeTree.remove(this.quadItem);
    delete this.gameServer.HOME_LIST[this.id];
    this.packetHandler.deleteHomePackets(this);
};


Home.prototype.dropShard = function () {
    var shard = this.gameServer.HOME_SHARD_LIST[this.getRandomShard()];
    if (shard) {
        this.removeShard(shard);
        shard.becomeHomeShooting(this, Arithmetic.getRandomInt(-30, 30),
            Arithmetic.getRandomInt(-30, 30));
    }
    this.packetHandler.removeHomeAnimationPackets(this);
};

Home.prototype.giveShard = function (home) {
    if (this !== home && this.getSupply() > 0) {
        var shard = this.gameServer.HOME_SHARD_LIST[this.getRandomShard()];
        this.removeShard(shard);
        shard.becomeHomeShooting(this, home.x - this.x / 10,
            home.y - this.y / 10);
    }
};

Home.prototype.addShard = function (shard) {
    shard.becomeHome(this);
    this.shards.push(shard.id);
    this.updateLevel();
    this.packetHandler.addHomeAnimationPackets(this);
    this.packetHandler.updateHomePackets(this);
};

Home.prototype.addChild = function (home) {
    this.children.push(home.id);
};

Home.prototype.updateLevel = function () {
    if (this.getSupply() < 2) {
        if (this.level !== 0) {
            this.health = 1;
        }
        this.level = 0;
        this.radius = 10;
        this.updateQuadItem();
    }
    else if (this.getSupply() < 4) {
        if (this.level < 1) {
            this.health = 1;
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



Home.prototype.addQuadItem = function () {
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

Home.prototype.updateQuadItem = function () {
    this.quadItem.bound = {
        minx: this.x - this.radius,
        miny: this.y - this.radius,
        maxx: this.x + this.radius,
        maxy: this.y + this.radius
    };
    this.gameServer.homeTree.remove(this.quadItem);
    this.gameServer.homeTree.insert(this.quadItem);
};


module.exports = Home;
