const entityConfig = require('./entityConfig');

function Tile(x, y) {
    var randomId = Math.random();
    this.id = randomId;
    this.x = x;
    this.y = y;
    this.owner = null;
    this.color = "#FFFFFF";
    this.health = 0;
    this.length = entityConfig.WIDTH / Math.sqrt(entityConfig.TILES);
    this.sentinel = null;
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



module.exports = Tile;
