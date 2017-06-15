var canvas = document.getElementById("bigCanvas");
var ctx = canvas.getContext("2d");

var socket = io();
socket.on('init', clientInit);
socket.on('updateEntities', updateEntities);
socket.on('deleteEntities', deleteEntities);
socket.on('addEntities', addEntities);

var selfId = null;
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
    this.color = tileInfo.color;
};
var Shard = function (shardInfo) {
    this.id = shardInfo.id;
    this.x = shardInfo.x;
    this.y = shardInfo.y;
    this.name = shardInfo.name;
};
var Headquarter = function (HQInfo) {
    this.supply = HQInfo.supply;
    this.id = HQInfo.id;
    this.x = HQInfo.x;
    this.y = HQInfo.y;
    this.name = HQInfo.owner;
    this.shards = HQInfo.shards;
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
        console.log("HQINFO: " + HQInfo);
        HQ_LIST[HQInfo.id] = new Headquarter(HQInfo);
    }
    selfId = data.selfId;
}

function deleteEntities(data) {
    var packet = data.playerInfo;
    for (var i = 0; i < packet.length; i++) {
        var playerInfo = packet[i];
        console.log(playerInfo.id + " has left the server!");
        delete PLAYER_LIST[playerInfo.id];
    }

    var shardPacket = data.shardInfo;
    for (var i = 0; i < shardPacket.length; i++) {
        var shardInfo = shardPacket[i];
        delete SHARD_LIST[shardInfo.id];
    }

    var HQPacket = data.HQInfo;
    for (var l = 0; l < HQPacket.length; l++) {
        var HQInfo = HQPacket[l];
        delete HQ_LIST[HQInfo.id];
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

    var UIPacket = data.UIInfo;
    for (var i = 0; i < UIPacket.length; i++) {
        var UIInfo = UIPacket[i];
        if (selfId = UIInfo.id) {
            openUI(UIInfo.action);
        }
    }
}


function updateEntities(data) {
    updatePlayers(data.players);
    updateTiles(data.tiles);
    updateShards(data.shards);
    updateHQs(data.HQs);
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
    }
};

var updateShards = function (packet) {
    for (var i = 0; i < packet.length; i++) {
        var shardInfo = packet[i];
        var shard = SHARD_LIST[shardInfo.id];
        shard.x = shardInfo.x;
        shard.y = shardInfo.y;
        shard.name = shardInfo.name;
    }
};

var updateHQs = function (packet) {
    for (var i = 0; i < packet.length; i++) {
        var HQInfo = packet[i];
        var HQ = HQ_LIST[HQInfo.id];
        HQ.supply = HQInfo.supply;
        HQ.shards = HQInfo.shards;
        if (HQ.id === selfId) {
            //TODO: add it to the list of shards in HQ
            //myFunction();
        }
    }
};


var drawScene = function () {
    drawTiles();
    drawPlayers();
    drawShards();
    drawHQs();
};

var drawPlayers = function () {
    ctx.font = "20px Arial";
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
    }
};

var drawShards = function () {
    for (var id in SHARD_LIST) {
        var shard = SHARD_LIST[id];
        ctx.fillStyle = "#008000";
        if (shard.name !== null) {
            ctx.font = "30px Arial";
            ctx.fillText(shard.name, shard.x, shard.y);
        }

        ctx.beginPath();
        ctx.arc(shard.x, shard.y, 5, 0, 2 * Math.PI, false);
        ctx.fill();

    }
};

var drawHQs = function () {
    for (var id in HQ_LIST) {
        var HQ = HQ_LIST[id];
        var radius = 10;
        if (HQ.supply > 10) {
            radius = 20;
        }
        ctx.fillStyle = "#003290";
        ctx.beginPath();
        ctx.arc(HQ.x, HQ.y, radius, 0, 2 * Math.PI, false);
        ctx.fill();
        ctx.fillStyle = "#000000";
        if (HQ.owner !== null) {
            ctx.fillText(HQ.name, HQ.x, HQ.y + 20);
            ctx.fillText(HQ.supply, HQ.x, HQ.y + 40);
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
    if (event.keyCode === 32) {
        socket.emit('keyEvent', {id: 'space', state: true});
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
    if (event.keyCode === 32) {
        socket.emit('keyEvent', {id: 'space', state: false});
    }
};


var textInput = document.getElementById("textInput");

function defineMessage() {
    var text = textInput.value;
    if (text !== null) {
        socket.emit('textInput',
            {
                id: selfId,
                word: text
            }
        )
    }
    textInput.value = "";
    closeUI("name shard");
}

function addShardstoList(list) {
    for (var i = 0; i < HQ_LIST[selfId].shards.length; i++) {
        var entry = document.createElement('li');
        var shard = SHARD_LIST[HQ_LIST[selfId].shards[i]];
        entry.id = shard.id;

        (function (_id) {
            entry.addEventListener("click", function () {
                console.log(_id);
            });
        })(entry.id);


        entry.appendChild(document.createTextNode(shard.name));
        list.appendChild(entry);
    }
}





