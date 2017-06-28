var WIDTH;
var TILES_INPUT;
var SHARDS;
var BORDER_WIDTH;


var medium = function () {
    WIDTH = 5000;
    TILES_INPUT = 1000;
    SHARDS = 200;
    BORDER_WIDTH = 300;
};

var small = function () {
    WIDTH = 1000;
    TILES_INPUT = 100;
    SHARDS = 35;
    BORDER_WIDTH = 100;
};

var large  = function () {
    WIDTH = 10000;
    TILES_INPUT = 2000;
    SHARDS = 2000;
    BORDER_WIDTH = 1000;
};

medium();


var tileRoot = Math.floor(Math.sqrt(TILES_INPUT));
var TILES = tileRoot * tileRoot;
var SHARD_WIDTH = 10;

module.exports = {
    WIDTH: WIDTH,
    TILES: TILES,
    SHARDS: SHARDS,
    SHARD_WIDTH: SHARD_WIDTH,
    BORDER_WIDTH: BORDER_WIDTH
};