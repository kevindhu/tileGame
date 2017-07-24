function Bracket(bracketInfo) {
    var tile = TILE_LIST[bracketInfo.tileId];
    this.x = tile.x;
    this.y = tile.y;
    this.length = tile.length;
}