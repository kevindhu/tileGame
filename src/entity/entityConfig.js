var CHUNKS = 0;
var WIDTH = 0;
var TILES_INPUT = 0;
var SHARDS = 0;
var BORDER_WIDTH = 0;


var small = function () {
    CHUNKS = 1;
    WIDTH = 2000;
    TILES_INPUT = 60;
    SHARDS = 35;
    BORDER_WIDTH = 100;
};


var medium = function () {
    CHUNKS = 4;
    WIDTH = 5000;
    TILES_INPUT = 1000;
    SHARDS = 200;
    BORDER_WIDTH = 300;
};


var large = function () {
    CHUNKS = 9;
    WIDTH = 10000;
    TILES_INPUT = 2000;
    SHARDS = 200;
    BORDER_WIDTH = 1000;
};


var superLarge = function () {
    CHUNKS = 2500;
    WIDTH = 400000;
    TILES_INPUT = 1000000;
    SHARDS = 100000;
    BORDER_WIDTH = 50000;
};


small();


var tileRoot = Math.floor(Math.sqrt(TILES_INPUT));
var TILES = tileRoot * tileRoot;
var SHARD_WIDTH = 10;

module.exports = {
    CHUNKS: CHUNKS,
    WIDTH: WIDTH,
    TILES: TILES,
    SHARDS: SHARDS,
    SHARD_WIDTH: SHARD_WIDTH,
    BORDER_WIDTH: BORDER_WIDTH
};