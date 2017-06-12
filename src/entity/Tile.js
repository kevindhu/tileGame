const entityConfig = require('./entityConfig');

function Tile(x, y) {
    this.x = x;
    this.y = y;
    this.owner = null;
    this.color = "#FFFFFF";
    this.health = 0;
}



Tile.prototype.updateOwner = function (newOwner) {
    if (this.health > 0) {
        this.health--;
    }
    else {
        this.owner = newOwner;
        this.health++;
    }
};



module.exports = Tile;
