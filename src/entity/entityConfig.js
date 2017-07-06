var WIDTH = 0;
var TILES_INPUT = 0;
var SHARDS = 0;
var BORDER_WIDTH = 0;
var STAGES = 0;


var medium = function () {
    WIDTH = 5000;
    TILES_INPUT = 1000;
    SHARDS = 200;
    BORDER_WIDTH = 300;
    STAGES = 3;
};

var small = function () {
    WIDTH = 1000;
    TILES_INPUT = 40;
    SHARDS = 35;
    BORDER_WIDTH = 100;
    STAGES = 2;
};

var large  = function () {
    WIDTH = 10000;
    TILES_INPUT = 2000;
    SHARDS = 2000;
    BORDER_WIDTH = 1000;
    STAGES = 5;
};


var superLarge  = function () {
    WIDTH = 80000;
    TILES_INPUT = 50000;
    SHARDS = 10000;
    BORDER_WIDTH = 5000;
    STAGES = 20;
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
    BORDER_WIDTH: BORDER_WIDTH,
    STAGES: STAGES
};