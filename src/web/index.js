var canvas = document.getElementById("bigCanvas");
var ctx = canvas.getContext("2d");

var socket = io();
socket.on('init', clientInit);
socket.on('updateEntities', updateEntities);
socket.on('deleteEntities', deleteEntities);


var PLAYER_LIST = {};
var TILE_LIST = {};


var Player = function (playerInfo) {
    this.name = playerInfo.name;
    this.x = playerInfo.x;
    this.y = playerInfo.y;
};

var Tile = function (tileInfo) {
    this.id = tileInfo.id;
    this.x = tileInfo.x;
    this.y = tileInfo.y;
    this.length = tileInfo.length;
    this.health = tileInfo.health;
    this.owner = tileInfo.owner;
    this.color = tileInfo.color;
};


var clientInit = function (data) {
    var playerInfo = data.playerInfo;
    for (var i = 0; i < playerInfo.length; i++) {
        var player = playerInfo[i];
        PLAYER_LIST[player.name] = new Player(player);
    }

    var tileInfo = data.tileInfo;
    for (var j = 0; j < tileInfo.length; j++) {
        var tile = tileInfo[j];
        TILE_LIST[tile.id] = new Tile(tile);
    }
};

var updateMap = function () {
    drawTiles();
    //TODO: change updatePositions to drawPlayers
    drawPlayers();
};


var drawTiles = function () {
    ctx.clearRect(0, 0, 600, 600);
    ctx.fillStyle = "#FF0000";
    var packet = data.tiles;
    for (var i = 0; i < packet.length; i++) {
        var tileInfo = packet[i];
        ctx.fillRect(tileInfo.x, tileInfo.y, tileInfo.length, tileInfo.length);
    }
};

var drawPlayers = function () {
    ctx.clearRect(0, 0, 600, 600);
    ctx.fillStyle = "#FF0000";
    var packet = data.tiles;
    for (var i = 0; i < packet.length; i++) {
        var tileInfo = packet[i];
        ctx.fillRect(tileInfo.x, tileInfo.y, tileInfo.length, tileInfo.length);
    }
};

var updatePositions = function (data) {
    ctx.fillStyle = "#000000";
    var packet = data.positions;
    for (var i = 0; i < packet.length; i++) {
        var playerInfo = packet[i];
        ctx.fillText(playerInfo.playerName, playerInfo.x, playerInfo.y);
    }
};

setInterval(updateMap, 1000 / 25);


document.onkeydown = function (event) {
    if (event.keyCode === 68 || event.keyCode === 39) { //d
        socket.emit('keyEvent', {id: 'right', state: true});
    }
    if (event.keyCode === 83 || event.keyCode === 40) { //s
        socket.emit('keyEvent', {id: 'down', state: true});
    }
    if (event.keyCode === 65 || event.keyCode === 37) { //a
        socket.emit('keyEvent', {id: 'left', state: true});
    }
    if (event.keyCode === 87 || event.keyCode === 38) { //w
        socket.emit('keyEvent', {id: 'up', state: true});
    }
};

document.onkeyup = function (event) {
    if (event.keyCode === 68 || event.keyCode === 39) { //d
        socket.emit('keyEvent', {id: 'right', state: false});
    }
    if (event.keyCode === 83 || event.keyCode === 40) { //s
        socket.emit('keyEvent', {id: 'down', state: false});
    }
    if (event.keyCode === 65 || event.keyCode === 37) { //a
        socket.emit('keyEvent', {id: 'left', state: false});
    }
    if (event.keyCode === 87 || event.keyCode === 38) { //w
        socket.emit('keyEvent', {id: 'up', state: false});
    }
};





