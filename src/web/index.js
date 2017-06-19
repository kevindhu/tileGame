var canvas = document.getElementById("bigCanvas");
var ctx = canvas.getContext("2d");
var socket = io();

socket.on('addFactionsUI', addFactionstoUI)
socket.on('init', initClient);
socket.on('addEntities', addEntities);
socket.on('updateEntities', updateEntities);
socket.on('deleteEntities', deleteEntities);
socket.on('drawScene', drawScene);

var selfId = null;
var PLAYER_LIST = {};
var TILE_LIST = {};
var SHARD_LIST = {};
var HOME_LIST = {};
var ARROW = null;
var FACTIONS = ['meme','shit', 'ass'];


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
var Home = function (homeInfo) {
    this.supply = homeInfo.supply;
    this.id = homeInfo.id;
    this.x = homeInfo.x;
    this.y = homeInfo.y;
    this.name = homeInfo.owner;
    this.shards = homeInfo.shards;
};


var Arrow = function (x,y) {
    this.preX = x;
    this.preY = y;
    this.postX = null;
    this.postY = null;
    this.deltaX = function() {
        return this.postX - this.preX;
    }

    this.deltaY = function() {
        return this.postY - this.preY;
    }
};


function addFactionstoUI(data) {
    var factions = document.getElementById('factions');
    var packet = data.factions;

    for (var i = 0; i<packet.length; i++) {
        var name = packet[i];
        console.log(name);
        var option = document.createElement('option');
        option.value = name;
        factions.appendChild(option);
    }
}



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
    addEntity(data.homeInfo, HOME_LIST, Home);
    selfId = data.selfId;
}

function addEntities(data) {
    var addEntity = function (packet, list, Entity) {
        if (packet) {
            for (var i = 0; i < packet.length; i++) {
                var info = packet[i];
                list[info.id] = new Entity(info);
            }
        }
    };

    addEntity(data.playerInfo, PLAYER_LIST, Player);
    addEntity(data.shardInfo, SHARD_LIST, Shard);
    addEntity(data.homeInfo, HOME_LIST, Home);

    var UIPacket = data.UIInfo;
    if (UIPacket) {
        for (var i = 0; i < UIPacket.length; i++) {
            var UIInfo = UIPacket[i];
            if (selfId === UIInfo.id) {
                openUI(UIInfo.action);
            }
        }
    }

    var voicePacket = data.voiceInfo;
    if (voicePacket) {
        for (var i = 0; i < voicePacket.length; i++) {
            var voiceInfo = voicePacket[i];
            var msg = new SpeechSynthesisUtterance(voiceInfo.string);
            window.speechSynthesis.speak(msg);
        }
    }
}


function deleteEntities(data) {
    var deleteEntity = function (packet, list) {
        for (var i = 0; i < packet.length; i++) {
            var info = packet[i];
            delete list[info.id];
        }
    };

    deleteEntity(data.playerInfo, PLAYER_LIST);
    deleteEntity(data.shardInfo, SHARD_LIST);
    deleteEntity(data.HQInfo, HQ_LIST);


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

    var updateHomes = function (packet) {
        for (var i = 0; i < packet.length; i++) {
            var homeInfo = packet[i];
            var home = HOME_LIST[homeInfo.id];
            home.supply = homeInfo.supply;
            home.shards = homeInfo.shards;
        }
    };

    var updateSentinels = function (packet) {
        for (var i = 0; i < packet.length; i++) {
            var sentinelInfo = packet[i];
            var sentinel = SENTINEL_LIST[sentinelInfo.id];
            sentinel.supply = sentinelInfo.supply;
            sentinel.shards = sentinelInfo.shards;
        }
    }

    updatePlayers(data.playerInfo);
    updateTiles(data.tileInfo);
    updateShards(data.shardInfo);
    updateHomes(data.homeInfo);
}

function drawScene(data) {
    var selfPlayer = PLAYER_LIST[selfId];

    var inBounds = function(player,x,y) {
        return x < (player.x+canvas.width) && x > (player.x-canvas.width)
        && y < (player.y+canvas.width) && y > (player.y-canvas.width);
    }

    var drawPlayers = function () {
        ctx.font = "20px Arial";
        ctx.fillStyle = "#000000";
        for (var playerId in PLAYER_LIST) {
            var player = PLAYER_LIST[playerId];
            ctx.fillText(player.name, player.x, player.y);
        }
    };

    var drawTiles = function () {
        for (var id in TILE_LIST) {
            var tile = TILE_LIST[id];
            if (inBounds(selfPlayer,tile.x, tile.y)) {
                ctx.fillStyle = tile.color;
                ctx.fillRect(tile.x, tile.y, tile.length, tile.length);
            }
        }
    };

    var drawShards = function () {
        for (var id in SHARD_LIST) {
            ctx.beginPath();
            var shard = SHARD_LIST[id];
            ctx.fillStyle = "#008000";
            if (shard.name !== null) {
                ctx.font = "30px Arial";
                ctx.fillText(shard.name, shard.x, shard.y);
            }

            ctx.arc(shard.x, shard.y, 5, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.closePath();
        }
    };

    var drawHQs = function () {
        for (var id in HQ_LIST) {
            ctx.beginPath();
            var HQ = HQ_LIST[id];
            var radius = 10;
            if (HQ.supply > 10) {
                radius = 20;
            }
            ctx.fillStyle = "#003290";
            ctx.arc(HQ.x, HQ.y, radius, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.fillStyle = "#000000";
            if (HQ.owner !== null) {
                ctx.fillText(HQ.name, HQ.x, HQ.y + 20);
                ctx.fillText(HQ.supply, HQ.x, HQ.y + 40);
            }
            ctx.closePath();
        }
    };

    var drawSentinels = function () {
        for (var id in SENTINEL_LIST) {
            ctx.beginPath();
            var sentinel = SENTINEL_LIST[id];
            var radius = 5;
            if (sentinel.supply > 10) {
                radius = 7;
            }
            ctx.fillStyle = "#003290";
            ctx.arc(sentinel.x, sentinel.y, radius, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.fillStyle = "#000000";
            if (sentinel.owner !== null) {
                ctx.font = "10px Arial";
                ctx.fillText(sentinel.name, sentinel.x, sentinel.y + 20);
                ctx.fillText(sentinel.supply, sentinel.x, sentinel.y + 40);
            }
            ctx.closePath();
        }
    };

    var translateScene = function () {
        ctx.setTransform(1,0,0,1,0,0);
        console.log(selfId);
        var player = PLAYER_LIST[selfId];
        if (player) {
            if (keys[17] && keys[38] && scaleFactor < 2) {
                scaleFactor += 0.2;
            }
            if (keys[17] && keys[40] && scaleFactor > 0.7) {
                scaleFactor -= 0.2;
            }
            ctx.translate(canvas.width/2, canvas.height/2);
            ctx.scale(scaleFactor, scaleFactor);
            ctx.translate(-player.x, -player.y)
        }
    };

    var drawArrow = function () {
        if (ARROW && ARROW.postX) {
            var player = PLAYER_LIST[selfId];
            ctx.beginPath();
            ctx.moveTo(player.x, player.y);
            ctx.lineTo(player.x+ARROW.deltaX(), player.y + ARROW.deltaY());
            ctx.stroke();
            ctx.closePath();
        }
    };

    ctx.clearRect(0, 0, 8000, 8000);
    drawTiles();
    drawPlayers();
    drawShards();
    drawHQs();
    drawSentinels();
    drawArrow();
    translateScene();
};

var keys = [];
var scaleFactor = 1.5; 

document.onkeydown = function (event) {
    keys[event.keyCode] = true;
    var id = returnId(event.keyCode);
    if (id !== null) {
        socket.emit('keyEvent', {id: id, state: true});
    }
};

document.onkeyup = function (event) {   
    keys[event.keyCode] = false;
    var id = returnId(event.keyCode);
    if (id !== null) {
        socket.emit('keyEvent', {id: id, state: false});
    }
};



canvas.addEventListener("mousedown", function (event) {
    if (PLAYER_LIST[selfId]) {
        var rect = canvas.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;
        ARROW = new Arrow(x, y);
    }
});


canvas.addEventListener("mouseup", function (event) {
    var magnitude = function (x,y) {
        return x * x + y * y;
    };

    var normalize = function(x,y) {
        return [x/magnitude(x,y), y/magnitude(x,y)];
    };
    var x,y;

    if (magnitude(ARROW.deltaX(),ARROW.deltaY()) > 10000) {
        var vector = normalize(ARROW.deltaX(), ARROW.deltaY());
        x = -vector[0] * 10000;
        y = -vector[1] * 10000;
    }
    else {
        x = -ARROW.deltaX();
        y = -ARROW.deltaY();
    }
    socket.emit("arrowVector", {
        x: x,
        y: y
    });
    ARROW = null;
});


canvas.addEventListener("mousemove", function (event) {
    if (ARROW){
        var rect = canvas.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;
        ARROW.postX = x;
        ARROW.postY = y;
    }
});

var returnId = function (keyCode) {
    var id = null;
    switch (keyCode) {
        case 39:
        case 68:
            id = 'right';
            break;
        case 40:
        case 83:
            id = 'down';
            break;
        case 37:
        case 65:
            id = 'left';
            break;
        case 38:
        case 87:
            id = 'up';
            break;
        case 32:
            id = 'space';
            break;
        case 90:
            id = 'Z';
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






