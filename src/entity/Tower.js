const entityConfig = require('./entityConfig');
const Arithmetic = require('../modules/Arithmetic');
var Home = require('./Home');

function Tower(faction, x, y, gameServer) {
    Tower.super_.call(this, faction, x, y, gameServer);

    this.hasColor = true;
    this.level = 0;
    this.radius = 10;
    this.health = 30;
    this.init();
}

EntityFunctions.inherits(Tower, Home);


Tower.prototype.init = function () {
    this.addBigQuadItem();
    this.gameServer.towerTree.insert(this.bigQuadItem);
}


Tower.prototype.addBigQuadItem = function () {
    this.bigQuadItem = {
        cell: this,
        bound: {
            minx: this.x - 300,
            miny: this.y - 300,
            maxx: this.x + 300,
            maxy: this.y + 300
        }
    };
};

module.exports = Tower;
