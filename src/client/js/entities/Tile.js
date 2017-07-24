function Tile(tileInfo) {
    this.id = tileInfo.id;
    this.x = tileInfo.x;
    this.y = tileInfo.y;
    this.length = tileInfo.length;
    this.color = tileInfo.color;
    this.alert = tileInfo.alert;
    this.random = Math.floor(getRandom(0, 3));
}

Tile.prototype.show = function () {

};
