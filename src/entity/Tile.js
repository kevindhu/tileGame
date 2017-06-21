const entityConfig = require('./entityConfig');

function Tile(x, y) {
    var randomId = Math.random();
    this.id = randomId;
    this.x = x;
    this.y = y;
    this.owner = null;
    this.color = getRandomColor();
    this.health = 0;
    this.length = entityConfig.WIDTH / Math.sqrt(entityConfig.TILES);
    this.sentinel = null;
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



Tile.prototype.updateOwner = function (newOwner) {
    if (this.health > 0 && newOwner.name !== this.owner) {
        this.health--;
    }
    else {
        this.owner = newOwner.name;
        this.health++;
        this.color = newOwner.color;
    }
};

Tile.prototype.setSentinel = function (sentinel) {
    this.sentinel = sentinel;
    this.color = sentinel.color;
    this.owner = sentinel.owner;
};

module.exports = Tile;
