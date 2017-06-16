var canvas = document.getElementById("bigCanvas");
var ctx = canvas.getContext("2d");

var socket = io();
socket.on('init', initClient);
socket.on('updateEntities', updateEntities);
socket.on('deleteEntities', deleteEntities);
socket.on('addEntities', addEntities);

var selfId = null;
var PLAYER_LIST = {};
var TILE_LIST = {};
var SHARD_LIST = {};
var HQ_LIST = {};
var SENTINEL_LIST = {};

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
var Sentinel = function (sentinelInfo) {
    this.supply = sentinelInfo.supply;
    this.id = sentinelInfo.id;
    this.x = sentinelInfo.x;
    this.y = sentinelInfo.y;
    this.name = sentinelInfo.owner;
    this.shards = sentinelInfo.shards;
};



function initClient(data) {
    var addEntity = function (packet, list, Entity) {
        for (var i = 0; i < packet.length; i++) {
            var info = packet[i];
            list[info.id] = new Entity(info);
        }
    };
    addEntity(data.tileInfo, TILE_LIST, Tile);
    addEntity(data.playerInfo, PLAYER_LIST, Player);
    addEntity(data.shardInfo, SHARD_LIST, Shard);
    addEntity(data.HQInfo, HQ_LIST, Headquarter);
    addEntity(data.sentinelInfo, SENTINEL_LIST, Sentinel);
    selfId = data.selfId;
}

function addEntities(data) {
    var addEntity = function (packet, list, Entity) {
        for (var i = 0; i < packet.length; i++) {
            var info = packet[i];
            list[info.id] = new Entity(info);
        }
    };

    addEntity(data.playerInfo, PLAYER_LIST, Player);
    addEntity(data.shardInfo, SHARD_LIST, Shard);
    addEntity(data.HQInfo, HQ_LIST, Headquarter);
    addEntity(data.sentinelInfo, SENTINEL_LIST, Sentinel);

    var UIPacket = data.UIInfo;
    for (var i = 0; i < UIPacket.length; i++) {
        var UIInfo = UIPacket[i];
        if (selfId === UIInfo.id) {
            openUI(UIInfo.action);
        }
    }


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

    var UIPacket = data.UIInfo;
    for (var i = 0; i < UIPacket.length; i++) {
        var UIInfo = UIPacket[i];
        if (selfId === UIInfo.id) {
            closeUI(UIInfo.action);
        }
    }


}

function updateEntities(data) {
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
        }
    };

    updatePlayers(data.playerInfo);
    updateTiles(data.tileInfo);
    updateShards(data.shardInfo);
    updateHQs(data.HQInfo);
}

var drawScene = function () {
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

    var drawSentinels = function () {
        for (var id in SENTINEL_LIST) {
            var sentinel = SENTINEL_LIST[id];
            var radius = 5;
            if (sentinel.supply > 10) {
                radius = 7;
            }
            ctx.fillStyle = "#003290";
            ctx.beginPath();
            ctx.arc(sentinel.x, sentinel.y, radius, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.fillStyle = "#000000";
            if (sentinel.owner !== null) {
                ctx.font = "10px Arial";
                ctx.fillText(sentinel.name, sentinel.x, sentinel.y + 20);
                ctx.fillText(sentinel.supply, sentinel.x, sentinel.y + 40);
            }
        }
    };

    drawTiles();
    drawPlayers();
    drawShards();
    drawHQs();
    drawSentinels();
};

setInterval(drawScene, 1000 / 25);


document.onkeydown = function (event) {
    var id = returnId(event.keyCode);
    if (id !== null) {
        socket.emit('keyEvent', {id: id, state: true});
    }
};

document.onkeyup = function (event) {
    var id = returnId(event.keyCode);
    if (id !== null) {
        socket.emit('keyEvent', {id: id, state: false});
    }
};

var returnId = function (keyCode) {
    var id = null;
    switch (keyCode) {
        case 39:
            id = 'right';
            break;
        case 40:
            id = 'down';
            break;
        case 37:
            id = 'left';
            break;
        case 38:
            id = 'up';
            break;
        case 32:
            id = 'space';
            break;
        case 65:
            id = 'A';
            break;
    }
    return id;
};

function defineMessage() {
    var text = document.getElementById("textInput").value;
    if (text !== null) {
        socket.emit('textInput',
            {
                id: selfId,
                word: text
            }
        )
    }
    closeUI("name shard");
}

function addShardsToList(list) {
    for (var i = 0; i < HQ_LIST[selfId].shards.length; i++) {
        var entry = document.createElement('li');
        var shard = SHARD_LIST[HQ_LIST[selfId].shards[i]];
        entry.id = shard.id;

        (function (_id) {
            entry.addEventListener("click", function () {
                socket.emit("removeShardHQ", {id: _id});
            });
        })(entry.id);


        entry.appendChild(document.createTextNode(shard.name));
        list.appendChild(entry);
    }
}





