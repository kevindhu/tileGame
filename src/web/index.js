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

var serverMap = null;
var mapTimer = 0;




var Player = function (playerInfo) {
    this.id = playerInfo.id;
    this.name = playerInfo.name;
    this.x = playerInfo.x;
    this.y = playerInfo.y;
    this.health = playerInfo.health;
};
var Tile = function (tileInfo) {
    this.id = tileInfo.id;
    this.x = tileInfo.x;
    this.y = tileInfo.y;
    this.length = tileInfo.length;
    this.color = tileInfo.color;
    this.alert = tileInfo.alert;
};
var Shard = function (shardInfo) {
    this.id = shardInfo.id;
    this.x = shardInfo.x;
    this.y = shardInfo.y;
    this.name = shardInfo.name;
};
var Home = function (homeInfo) {
    this.id = homeInfo.id;
    this.x = homeInfo.x;
    this.y = homeInfo.y;
    this.name = homeInfo.owner;
    this.shards = homeInfo.shards;
    this.level = homeInfo.level;
    this.hasColor = homeInfo.hasColor;
    this.health = homeInfo.health;
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
            if (selfId === UIInfo.playerId) {
                openUI(UIInfo);
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
    deleteEntity(data.homeInfo, HOME_LIST);


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
            player.health = playerInfo.health;
        }
    };

    var updateTiles = function (packet) {
        for (var i = 0; i < packet.length; i++) {
            var tileInfo = packet[i];
            var tile = TILE_LIST[tileInfo.id];
            tile.color = tileInfo.color;
            tile.alert = tileInfo.alert;
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

            home.shards = homeInfo.shards;
            home.level = homeInfo.level;
            home.health = homeInfo.health;
            home.hasColor = homeInfo.hasColor;
        }
    };

    updatePlayers(data.playerInfo);
    updateTiles(data.tileInfo);
    updateShards(data.shardInfo);
    updateHomes(data.homeInfo);
}

function drawScene(data) {

    var selfPlayer = PLAYER_LIST[selfId];

    var inBounds = function(player,x,y) {
        return x < (player.x+canvas.width/2) && x > (player.x-canvas.width/2)
        && y < (player.y+canvas.width/2) && y > (player.y-canvas.width/2);
    }

    var drawPlayers = function () {
        ctx.font = "20px Arial";
        ctx.fillStyle = "#000000";
        for (var playerId in PLAYER_LIST) {
            var player = PLAYER_LIST[playerId];
            ctx.fillText(player.name, player.x - 4.6 * player.name.length, player.y - 10);
            ctx.fillRect(player.x - 5 * player.health, player.y + 10, player.health * 10, 10);
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

    var drawHomes = function () {
        for (var id in HOME_LIST) {
            ctx.beginPath();
            var home = HOME_LIST[id];
            var radius = 10;
            if (home.level === 1) {
                radius = 30;
            }
            if (home.level === 2) {
                
                radius = 50;
            }
            ctx.fillStyle = "#003290";
            ctx.arc(home.x, home.y, radius, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.fillStyle = "#000000";
            if (home.owner !== null) {
                ctx.fillText(home.name, home.x, home.y + 20);
                ctx.fillText(home.shards.length, home.x, home.y + 40);
            }
            ctx.closePath();
        }
    };



    var drawMap = function () {
        var player = PLAYER_LIST[selfId];
        function hexToRgb(hex) {
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            }
        }
        if (mapTimer <= 0 || serverMap === null) {
            var tileLength = Math.sqrt(Object.size(TILE_LIST));
            if (tileLength === 0 || !player) {
                return;
            }   
            var imgData = ctx.createImageData(tileLength, tileLength);
            var tile;
            var tileRGB = {};
            var i = 0;


            for (var id in TILE_LIST) {
                tile = TILE_LIST[id];
                if (tile.alert || tile && inBounds(selfPlayer,tile.x, tile.y)) {
                    tileRGB = hexToRgb(tile.color);
                }
                else {
                    tileRGB.r = 0;
                    tileRGB.g = 0;
                    tileRGB.b = 0;
                }

                imgData.data[i]= tileRGB.r;
                imgData.data[i+1]= tileRGB.g;
                imgData.data[i+2]= tileRGB.b;
                imgData.data[i+3]=255;
                i += 4;
            }
            imgData = scaleImageData(imgData,3,ctx);

            var tempCanvas = document.createElement("canvas"),
            tempCtx = tempCanvas.getContext("2d");
            tempCanvas.width = 500;
            tempCanvas.height = 500;

            tempCtx.putImageData(imgData, 0, 0);
            serverMap = tempCanvas;
            mapTimer = 25;
        }

        else {
            mapTimer -= 1;
        }

        ctx.rotate(90*Math.PI/180);
        ctx.scale(1/scaleFactor,-1/scaleFactor);
        ctx.drawImage(serverMap, player.y * scaleFactor + canvas.width/4, player.x * scaleFactor - canvas.width/2 + 40);
        ctx.scale(scaleFactor,-scaleFactor);
        ctx.rotate(270*Math.PI/180);
    };


    var translateScene = function () {
        ctx.setTransform(1,0,0,1,0,0);
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

    ctx.clearRect(0, 0, 10000, 10000);
    drawTiles();
    drawPlayers();
    drawShards();
    drawHomes();
    drawArrow();
    translateScene();
    drawMap();

}



function scaleImageData(imageData, scale, ctx) {
    var scaled = ctx.createImageData(imageData.width * scale, imageData.height * scale);
    var subLine = ctx.createImageData(scale, 1).data
    for (var row = 0; row < imageData.height; row++) {
        for (var col = 0; col < imageData.width; col++) {
            var sourcePixel = imageData.data.subarray(
                (row * imageData.width + col) * 4,
                (row * imageData.width + col) * 4 + 4
            );
            for (var x = 0; x < scale; x++) subLine.set(sourcePixel, x*4)
            for (var y = 0; y < scale; y++) {
                var destRow = row * scale + y;
                var destCol = col * scale;
                scaled.data.set(subLine, (destRow * scaled.width + destCol) * 4)
            }
        }
    }

    return scaled;
}


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
        case 88:
            id = 'X';
            break;
    }
    return id;
};






Object.size = function (obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

