var canvas = document.getElementById("bigCanvas");
var ctx = canvas.getContext("2d");

var socket = io();
socket.on('init', clientInit);
socket.on('updateEntities', updateEntities);
socket.on('deleteEntities', deleteEntities);
socket.on('addEntities', addEntities);

var PLAYER_LIST = {};
var TILE_LIST = {};
var SHARD_LIST = {};
var HQ_LIST = {};

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
var Shard = function (shardInfo) {
    this.id = shardInfo.id;
    this.x = shardInfo.x;
    this.y = shardInfo.y;
};
var Headquarter = function (HQInfo) {
    this.id = HQInfo.id;
    this.x = HQInfo.x;
    this.y = HQInfo.y;
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

    var shardPacket = data.shardPacket;
    for (var k = 0; k < shardPacket.length; k++) {
        var shardInfo = shardPacket[k];
        SHARD_LIST[shardInfo.id] = new Shard(shardInfo);
    }
    var HQPacket = data.HQPacket;
    for (var l = 0; l < HQPacket.length; l++) {
        var HQInfo = HQPacket[l];
        HQ_LIST[HQInfo.id] = new Headquarter(HQInfo);
    }
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
    var playerPacket = data.playerInfo;
    for (var i = 0; i < playerPacket.length; i++) {
        var playerInfo = playerPacket[i];
        PLAYER_LIST[playerInfo.id] = new Player(playerInfo);
    }

    var shardPacket = data.shardInfo;
    for (var i = 0; i < shardPacket.length; i++) {
        var shardInfo = shardPacket[i];
        SHARD_LIST[shardInfo.id] = new Shard(shardInfo);
    }

    var HQPacket = data.HQInfo;
    for (var i = 0; i < HQPacket.length; i++) {
        var HQInfo = HQPacket[i];
        HQ_LIST[HQInfo.id] = new Headquarter(HQInfo);
    }
}


function updateEntities(data) {
    //updateEntity(data.players, PLAYER_LIST);
    //updateEntity(data.tiles, TILE_LIST);
    //updateEntity(data.shards, SHARD_LIST);
    //updateEntity(data.HQs, HQ_LIST);
    updatePlayers(data.players);
    updateTiles(data.tiles);
    updateShards(data.shards);
    updateHQs(data.HQs);
}

function updateEntity(packet,list) {
    for (var i = 0; i < packet.length; i++) {
        var entityInfo = packet[i];
        var entity = list[entityInfo.id];
        if (entity.constructor.name === Player) {
            entity.x = entityInfo.x;
            entity.y = entityInfo.y;
        }
        if (entity.constructor.name === Tile) {
            entity.color = entityInfo.color;
            entity.health = entityInfo.health;
            entity.owner = entityInfo.owner;
        }
        if (entity.constructor.name === Shard) {
            entity.x = entityInfo.x;
            entity.y = entityInfo.y;
        }
        if (entity.constructor.name === Headquarter) {
            entity.health = entityInfo.health;
        }
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

var updateShards = function (packet) {
    for (var i = 0; i < packet.length; i++) {
        var shardInfo = packet[i];
        var shard = SHARD_LIST[shardInfo.id];
        shard.x = shardInfo.x;
        shard.y = shardInfo.y;
    }
};

var updateHQs = function (packet) {
    for (var i = 0; i < packet.length; i++) {
        var HQInfo = packet[i];
        var HQ = HQ_LIST[HQInfo.id];
        HQ.supply = HQInfo.supply;
    }
};


var drawScene = function () {
    drawTiles();
    drawPlayers();
    drawShards();
    drawHQs();
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

var drawShards = function () {
    for (var id in SHARD_LIST) {
        var shard = SHARD_LIST[id];
        ctx.fillStyle = "#008000";
        ctx.beginPath();
        ctx.arc(shard.x, shard.y, 5, 0, 2 * Math.PI, false);
        ctx.fill();
    }
};

var drawHQs = function () {
    for (var id in HQ_LIST) {
        var HQ = HQ_LIST[id];
        ctx.fillStyle = "#003290";
        ctx.beginPath();
        ctx.arc(HQ.x, HQ.y, 10, 0, 2 * Math.PI, false);
        ctx.fill();
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
    if (event.keyCode === 32) {
        socket.emit('keyEvent', {id: 'space', state:true});
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





