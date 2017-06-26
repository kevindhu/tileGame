var WIDTH = 10000;
var HEIGHT = 10000;
var TILES_INPUT = 1000;
var tileRoot = Math.floor(Math.sqrt(TILES_INPUT));
var TILES = tileRoot * tileRoot;
var SHARDS = 2000;
var SHARD_WIDTH = 10;
var BORDER_WIDTH = 100;

module.exports = {
    WIDTH: WIDTH,
    HEIGHT: HEIGHT,
    TILES: TILES,
    SHARDS: SHARDS,
    SHARD_WIDTH: SHARD_WIDTH,
    BORDER_WIDTH: BORDER_WIDTH
};