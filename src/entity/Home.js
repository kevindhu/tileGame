const entityConfig = require('./entityConfig');
const Arithmetic = require('../modules/Arithmetic');
var EntityFunctions = require('./EntityFunctions');

function Home(faction, x, y, gameServer) {
    if (!gameServer) {
        throw "forgot the gameServer dumbass";
    }

    this.gameServer = gameServer;
    this.packetHandler = gameServer.packetHandler;

    this.id = Math.random();
    this.owner = faction;
    this.name = faction.name;

    this.x = x;
    this.y = y;

    this.children = [];
    this.shards = [];
    this.tile = null;

    this.level = 0;
    this.hasColor = false;

    this.radius = 10;
    this.health = 1;

    this.randomPlayer = this.gameServer.PLAYER_LIST[this.owner.getRandomPlayer()];
}

Home.prototype.mainInit = function () {
    var tile = this.gameServer.getEntityTile(this);
    if (!tile.hasHome()) {
        tile.setHome(this);
        this.tile = tile;
        this.packetHandler.updateTilesPackets(tile);
    }
    this.gameServer.HOME_LIST[this.id] = this;
    this.addQuadItem();
    this.gameServer.homeTree.insert(this.quadItem);
    this.packetHandler.addHomePackets(this);
}

Home.prototype.decreaseHealth = function (amount) {
    this.health -= amount;
    if (this.tile) {
        this.tile.alert = true;
        this.packetHandler.updateTilesPackets(this.tile);
    }
    if (this.health <= 0) {
        this.onDelete();
    }
    else {
        this.packetHandler.updateHomePackets(this);
    }
};


Home.prototype.getRandomShard = function () {   
    var randomIndex = Arithmetic.getRandomInt(0,this.shards.length-1);
    return this.shards[randomIndex];
};

Home.prototype.shootShard = function (player) {
    return;
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

    this.owner.removeHome(this);
    if (this.tile) {
        this.tile.removeHome();
    }

    this.gameServer.homeTree.remove(this.quadItem);
    delete this.gameServer.HOME_LIST[this.id];
    this.packetHandler.deleteHomePackets(this);
};


Home.prototype.dropShard = function () {
    var shard = this.getRandomShard();
    if (shard) {
        var shard = this.gameServer.HOME_SHARD_LIST[this.getRandomShard()];
        this.removeShard(shard);
        shard.becomeShooting(this.randomPlayer, Arithmetic.getRandomInt(-30, 30), 
            Arithmetic.getRandomInt(-30, 30))
    }
};

Home.prototype.giveShard = function (home) {
    var shard = this.gameServer.HOME_SHARD_LIST[this.getRandomShard()];
    this.removeShard(shard);
    home.addShard(shard);
}

Home.prototype.addShard = function (shard) {
    shard.becomeHome(this);
    this.shards.push(shard.id);
    this.updateLevel();
    this.packetHandler.updateHomePackets(this);
};

Home.prototype.addChild = function (home) {
    this.children.push(home.id);
};

Home.prototype.updateLevel = function () {
    if (this.getSupply() < 1) {
        this.level = 0;
        this.radius = 10;
        this.health = 1;
        this.updateHomeTree();
    }
    else if (this.getSupply() < 4) {
        this.level = 1;
        this.radius = 30;
        this.health = 30;
        this.updateHomeTree();
    }
    else if (this.getSupply() > 6) {
        this.level = 2;
        this.radius = 50;
        this.health = 80;
        this.updateHomeTree();
    }
};


Home.prototype.updateHomeTree = function () {
    this.updateQuadItem();
    this.gameServer.homeTree.remove(this.quadItem);
    this.gameServer.homeTree.insert(this.quadItem);
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
}

Home.prototype.updateQuadItem = function () {
    this.quadItem.bound = {
            minx: this.x - this.radius,
            miny: this.y - this.radius,
            maxx: this.x + this.radius,
            maxy: this.y + this.radius
    };
}


module.exports = Home;
