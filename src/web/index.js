var canvas = document.getElementById("bigCanvas");
var ctx = canvas.getContext("2d");

var socket = io();
socket.on('init', clientInit);
socket.on('updateEntities', updateEntities);
socket.on('deleteEntities', deleteEntities);
socket.on('addEntities', addEntities);

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
    this.owner = tileInfo.owner;
    this.color = tileInfo.color;
    this.health = tileInfo.health;
};

function clientInit(data) {
    var playerPacket = data.playerPacket;
    for (var i = 0; i < playerPacket.length; i++) {
        var playerInfo = playerPacket[i];
        PLAYER_LIST[playerInfo.id] = new Player(playerInfo);
    }

    var tilePacket = data.tilePacket;
    for (var j = 0; j < tilePacket.length; j++) {
        var tileInfo = tilePacket[j];
        TILE_LIST[tileInfo.id] = new Tile(tileInfo);
    }
}


function updateEntities(data) {
    updatePlayers(data.players);
    updateTiles(data.tiles);
}

function deleteEntities(data) {
    var packet = data.playerInfo;
    for (var i = 0; i < packet.length; i++) {
        var playerInfo = packet[i];
        console.log(playerInfo.id + " has left the server!");
        delete PLAYER_LIST[playerInfo.id];
    }
}

function addEntities(data) {
    var packet = data.playerInfo;
    for (var i = 0; i < packet.length; i++) {
        var playerInfo = packet[i];
        PLAYER_LIST[playerInfo.id] = new Player(playerInfo);
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
        tile.color = tileInfo.color;
        tile.health = tileInfo.health;
        tile.owner = tileInfo.owner;
    }
};


var drawScene = function () {
    drawTiles();
    drawPlayers();
};

var drawPlayers = function () {
    ctx.fillStyle = "#000000";
    for (var playerId in PLAYER_LIST) {
        var player = PLAYER_LIST[playerId];
        ctx.fillText(player.name, player.x, player.y);
    }
};

var drawTiles = function () {
    ctx.clearRect(0, 0, 600, 600);
    for (var id in TILE_LIST) {
        var tile = TILE_LIST[id];
        ctx.fillStyle = tile.color;
        ctx.fillRect(tile.x, tile.y, tile.length, tile.length);
        ctx.fillStyle = "#000000";
        if (tile.owner !== null && tile.health !== 0) {
            ctx.fillText(tile.owner, tile.x, tile.y + 20);
            ctx.fillText(tile.health, tile.x, tile.y + 40);
        }
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





