function Bracket(bracketInfo, client) {
    var tile = client.TILE_LIST[bracketInfo.tileId];

    this.x = tile.x;
    this.y = tile.y;
    this.length = tile.length;

    this.client = client;
}

Bracket.prototype.show = function () {
    var ctx = this.client.draftCtx;

    ctx.fillStyle = "rgba(100,211,211,0.6)";
    ctx.fillRect(this.x, this.y, this.length, this.length);
};

module.exports = Bracket;