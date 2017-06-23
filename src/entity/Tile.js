const entityConfig = require('./entityConfig');

function Tile(x, y, gameServer) {
    this.gameServer = gameServer;
    this.packetHandler = gameServer.packetHandler;
    var randomId = Math.random();
    this.id = randomId;
    this.x = x;
    this.y = y;
    this.home = null;
    this.owner = null;
    this.color = "#FFFFFF"; //getRandomColor();
    this.length = entityConfig.WIDTH / Math.sqrt(entityConfig.TILES);
    this.alert = false;
}

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}


Tile.prototype.setColor = function (color) {
    if (color !== "" && color !== undefined && color !== null) {
        this.color = color;
        this.packetHandler.updateTilesPackets(tile);
    }
};


Tile.removeHome = function (home) {
    if (this.home === home) {
        this.home = null;
        this.owner = null;
    }
}


Tile.prototype.hasHome = function () {
    return this.home;
}

Tile.prototype.setHome = function (home) {
    this.home = home;
    this.owner = home.owner;
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
}


module.exports = Tile;
