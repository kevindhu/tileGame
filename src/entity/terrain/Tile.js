const entityConfig = require('../entityConfig');
var EntityFunctions = require('../EntityFunctions');

function Tile(x, y, gameServer) {
    this.gameServer = gameServer;
    this.packetHandler = gameServer.packetHandler;

    this.id = Math.random();
    this.x = x;
    this.y = y;

    this.home = null;
    this.faction = null;

    this.color = null;
    this.length = (entityConfig.WIDTH - entityConfig.BORDER_WIDTH * 2) / Math.sqrt(entityConfig.TILES);
    this.alert = false; 
    this.init();
}

Tile.prototype.init = function () {
    this.addQuadItem();
    this.gameServer.tileTree.insert(this.quadItem);
    this.gameServer.TILE_LIST[this.id] = this;
    this.chunk = EntityFunctions.findChunk(this.gameServer, this);
    this.gameServer.CHUNKS[this.chunk].TILE_LIST[this.id] = this;
};



Tile.prototype.setColor = function (color) {
    if (color !== undefined && color !== null) {
        this.color = color;
        this.packetHandler.updateTilesPackets(this);
    }
};


Tile.prototype.removeHome = function () {
    this.color = null;
    this.home = null;
    this.faction = null;
    this.packetHandler.updateTilesPackets(this);
};


Tile.prototype.hasHome = function () {
    return this.home;
};

Tile.prototype.setHome = function (home) {
    this.home = home.id;
    this.faction = home.faction;
};


Tile.prototype.addQuadItem = function () {
    var centerX = this.x + this.length / 2;
    var centerY = this.y + this.length / 2;

    this.quadItem = {
        cell: this,
        bound: {
            minx: centerX - this.length / 2,
            miny: centerY - this.length / 2,
            maxx: centerX + this.length / 2,
            maxy: centerY + this.length / 2
        }
    };
};


function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

module.exports = Tile;
