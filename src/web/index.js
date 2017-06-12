var canvas = document.getElementById("bigCanvas");
var ctx = canvas.getContext("2d");

var socket = io();
socket.on('init', clientInit);
socket.on('updateEntities', updateEntities);
socket.on('deleteEntities', deleteEntities);

var PLAYER_LIST = {};
var TILE_LIST = {};

var Player = function (playerInfo) {
    this.id = playerInfo.id;
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

function clientInit(data) {
    var playerPackage = data.playerInfo;
    for (var i = 0; i < playerPackage.length; i++) {
        var playerInfo = playerPackage[i];
        PLAYER_LIST[playerInfo.name] = new Player(playerInfo);
    }

    var tilePackage = data.tileInfo;
    for (var j = 0; j < tilePackage.length; j++) {
        var tileInfo = tilePackage[j];
        PLAYER_LIST[tileInfo.name] = new Tile(tileInfo);
    }
}

function updateEntities(data) {
    updatePlayers(data.players);
    updateTiles(data.tiles);
}

function deleteEntities(data) {
    var packet = data.playerIds;
    for (var i = 0; i < packet.length; i++) {
        var playerId = packet[i];
        delete PLAYER_LIST[playerId];
    }
}



var updatePlayers = function (packet) {
    for (var i = 0; i < packet.length; i++) {
        var playerInfo = packet[i];
        var player = PLAYER_LIST[playerInfo.id];
        player.x = playerInfo.x;
        player.y = playerInfo.y;
    }
};


var updateTiles = function (packet) {
    for (var i = 0; i < packet.length; i++) {
        var tileInfo = packet[i];
        var tile = TILE_LIST[tileInfo.id];
        //TODO: update tiles
    }
};



var drawScene = function () {
    drawTiles();
    drawPlayers();
};

var drawTiles = function () {
    ctx.clearRect(0, 0, 600, 600);
    for (var tileId in TILE_LIST) {
        var tile = TILE_LIST[tileId];
        ctx.fillStyle = tile.color;
        ctx.fillRect(tile.x, tile.y, tile.length, tile.length);
    }
};

var drawPlayers = function () {
    ctx.fillStyle = "#000000";
    for (var playerName in PLAYER_LIST) {
        var player = PLAYER_LIST[playerName];
        ctx.fillText(player.playerName, player.x, player.y);
    }
};

setInterval(drawScene, 1000 / 25);



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





