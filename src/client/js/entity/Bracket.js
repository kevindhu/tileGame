function Bracket(bracketInfo, client) {
    var tile = client.TILE_LIST[bracketInfo.tileId];

    this.x = tile.x;
    this.y = tile.y;
    this.length = tile.length;

    this.client = client;
}

Bracket.prototype.show = function () {
    var ctx = this.client.mainCtx;

    ctx.beginPath();
    ctx.fillStyle = "rgba(100,211,211,0.4)";
    ctx.fillRect(this.x + 30, this.y + 30, this.length - 30, this.length - 30);
    ctx.closePath();
};

module.exports = Bracket;