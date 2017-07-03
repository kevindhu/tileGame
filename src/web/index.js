var canvas = document.getElementById("bigCanvas");
var c2 = document.getElementById("draftCanvas");
var c3 = document.getElementById("c3");
var c4 = document.getElementById("c4");

c2.style.display = "none";
c3.style.display = "none";
c4.style.display = "none";

c2.width = window.innerWidth;
c2.height = window.innerHeight;

var ctx = canvas.getContext("2d");
var ctx2 = c2.getContext("2d");
var ctx3 = c3.getContext("2d");
var ctx4 = c4.getContext("2d");


var socket = io();

socket.on('addFactionsUI', addFactionstoUI)
socket.on('addEntities', addEntities);
socket.on('updateEntities', updateEntities);
socket.on('deleteEntities', deleteEntities);
socket.on('drawScene', drawScene);

var selfId = null;

var FACTION_LIST = {};
var FACTION_ARRAY = [];

var CONTROLLER_LIST = {};
var TILE_LIST = {};
var SHARD_LIST = {};
var HOME_LIST = {};

var ANIMATION_LIST = {};

var ARROW = null;
var BRACKET = null;
var serverMap = null;
var tileTimer = 0;
var mapTimer = 0;



var Faction = function (factionInfo) {
    this.id = factionInfo.id;
    this.name = factionInfo.name;
    this.x = factionInfo.x;
    this.y = factionInfo.y;
    this.size = factionInfo.size;
};
var Controller = function (controllerInfo) {
    this.id = controllerInfo.id;
    this.name = controllerInfo.name;
    this.x = controllerInfo.x;
    this.y = controllerInfo.y;
    this.health = controllerInfo.health;
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
    this.visible = shardInfo.visible;
};
var Home = function (homeInfo) {
    this.id = homeInfo.id;
    this.x = homeInfo.x;
    this.y = homeInfo.y;
    this.name = homeInfo.owner;
    this.type = homeInfo.type;
    this.radius = homeInfo.radius;
    this.shards = homeInfo.shards;
    this.level = homeInfo.level;
    this.hasColor = homeInfo.hasColor;
    this.health = homeInfo.health;
    this.neighbors = homeInfo.neighbors;
};


var Arrow = function (x,y) {
    this.preX = x;
    this.preY = y;
    this.postX = null;
    this.postY = null;
    this.deltaX = function() {
        return this.postX - this.preX;
    };
    this.deltaY = function() {
        return this.postY - this.preY;
    }
};

var Bracket = function (bracketInfo) {
    var tile = TILE_LIST[bracketInfo.tileId];
    this.x = tile.x;
    this.y = tile.y;
    this.length = tile.length;
};


var Animation = function (animationInfo) {
    this.type = animationInfo.type;
    this.id = animationInfo.id;
    this.name = animationInfo.name;
    this.x = animationInfo.x;
    this.y = animationInfo.y;
    this.theta = 15;
    this.timer = getRandom(10,14);

    if (this.x) {
        this.endX = this.x + getRandom(-100, 100);
        this.endY = this.y + getRandom(-100, 100);
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



function addEntities(data) {
    var addEntity = function (packet, list, Entity, array) {
        if (!packet) {
            return;
        }
        for (var i = 0; i < packet.length; i++) {
            var info = packet[i];
            list[info.id] = new Entity(info);
            if (array && findWithAttr(array, "id", info.id) === -1) {
                array.push(list[info.id]);
            }
        }
    };

    addEntity(data.tileInfo, TILE_LIST, Tile);
    addEntity(data.controllerInfo, CONTROLLER_LIST, Controller);
    addEntity(data.shardInfo, SHARD_LIST, Shard);
    addEntity(data.homeInfo, HOME_LIST, Home);
    addEntity(data.factionInfo, FACTION_LIST, Faction, FACTION_ARRAY);
    addEntity(data.animationInfo, ANIMATION_LIST, Animation);


    var bracketPacket = data.bracketInfo;
    if (bracketPacket) {
        for (var i = 0; i < bracketPacket.length; i++) {
            var bracketInfo = bracketPacket[i];
            if (selfId === bracketInfo.playerId) {
                BRACKET = new Bracket(bracketInfo);
            }
        }
    }

    var UIPacket = data.UIInfo;
    if (UIPacket) {
        for (var i = 0; i < UIPacket.length; i++) {
            var UIInfo = UIPacket[i];
            if (selfId === UIInfo.playerId) {
                openUI(UIInfo);
            }
        }
    }
    if (data.selfId) {
        selfId = data.selfId;
    }
}


function findWithAttr(array, attr, value) {
    for(var i = 0; i < array.length; i += 1) {
        if(array[i][attr] === value) {
            return i;
        }
    }
    return -1;  
}



function deleteEntities(data) {
    var deleteEntity = function (packet, list, array) {
        if (!packet) {
            return;
        }
        for (var i = 0; i < packet.length; i++) {
            var info = packet[i];
            if (array) {
                var index = findWithAttr(array, "id", info.id);
                array.splice(index,1);
            }
            delete list[info.id];
        }
    };

    deleteEntity(data.controllerInfo, CONTROLLER_LIST);
    deleteEntity(data.shardInfo, SHARD_LIST);
    deleteEntity(data.homeInfo, HOME_LIST);
    deleteEntity(data.factionInfo, FACTION_LIST, FACTION_ARRAY);

    var bracketPacket = data.bracketInfo;
    if (bracketPacket) {
        for (var i = 0; i < bracketPacket.length; i++) {
            var bracketInfo = bracketPacket[i];
            if (selfId === bracketInfo.id) {
                BRACKET = null;
            }
        }
    }


    var UIPacket = data.UIInfo;
    if (UIPacket) {
        for (var i = 0; i < UIPacket.length; i++) {
            var UIInfo = UIPacket[i];
            if (selfId === UIInfo.id) {
                closeUI(UIInfo.action);
            }
        }
    }
}


function updateEntities(data) {
    function updateEntities(packet, list, callback) {
        if (!packet) {
            return;
        }
        for (var i = 0; i < packet.length; i++) {
            var entityInfo = packet[i];
            var entity = list[entityInfo.id];
            if (!entity) {
                return;
            }
            callback(entity, entityInfo);
        }
    }

    var updateFactions = function (faction, factionInfo) {
        faction.x = factionInfo.x;
        faction.y = factionInfo.y;
        faction.size = factionInfo.size;
        FACTION_ARRAY.sort(factionSort);
    };
    
    var updateHomes = function (home, homeInfo) {
        home.shards = homeInfo.shards;
        home.level = homeInfo.level;
        home.radius = homeInfo.radius;
        home.health = homeInfo.health;
        home.hasColor = homeInfo.hasColor;
        home.neighbors = homeInfo.neighbors;
    };

    var updateShards = function (shard, shardInfo) {
        shard.x = shardInfo.x;
        shard.y = shardInfo.y;
        shard.visible = shardInfo.visible,
        shard.name = shardInfo.name;
    };

    var updateTiles = function (tile, tileInfo) {
        if (tile) {
            tile.color = tileInfo.color;
            tile.alert = tileInfo.alert;
        }
    };

    var updateControllers = function (controller, controllerInfo) {
        controller.x = controllerInfo.x;
        controller.y = controllerInfo.y;
        controller.health = controllerInfo.health;
    };


    updateEntities(data.controllerInfo, CONTROLLER_LIST, updateControllers);
    updateEntities(data.tileInfo, TILE_LIST, updateTiles);
    updateEntities(data.shardInfo, SHARD_LIST, updateShards);
    updateEntities(data.homeInfo, HOME_LIST, updateHomes);
    updateEntities(data.factionInfo, FACTION_LIST, updateFactions);
}

//canvas.height = window.innerHeight;
//canvas.width = window.innerWidth;


c2.width = canvas.width;
c2.height = canvas.height;

function drawScene(data) {
    var selfPlayer = CONTROLLER_LIST[selfId];


    if (!selfPlayer) {
        return;
    }

    var inBounds = function(player,x,y) {
        return x < (player.x+canvas.width) && x > (player.x-5/4*canvas.width)
        && y < (player.y+canvas.width) && y > (player.y-5/4*canvas.width);
    };

    var drawControllers = function () {
        ctx2.font = "20px Arial";
        ctx2.fillStyle = "#000000";
        for (var id in CONTROLLER_LIST) {
            var controller = CONTROLLER_LIST[id];
            ctx2.fillText(controller.name, controller.x, controller.y + 30);
            ctx2.fillRect(controller.x - controller.health * 10 / 2, controller.y + 10, controller.health * 10, 10);
        }
    };

    var drawTiles = function () {
        for (var id in TILE_LIST) {
            var tile = TILE_LIST[id];
            if (inBounds(selfPlayer,tile.x, tile.y)) {
                if (!tile.color) {
                    tile.color = {
                        r: Math.round(getRandom(210,214)),
                        g: Math.round(getRandom(210,214)),
                        b: Math.round(getRandom(200,212))
                    };
                }

                ctx2.fillStyle = "rgb(" +
                    tile.color.r + "," +
                    tile.color.g + "," +
                    tile.color.b +
                    ")";

                ctx2.fillRect(tile.x, tile.y, tile.length, tile.length);
            }
        }
    };



    var drawShards = function () {
        for (var id in SHARD_LIST) {
            var shard = SHARD_LIST[id];

            if (inBounds(selfPlayer, shard.x, shard.y) && shard.visible) {
                ctx2.beginPath();
                ctx2.fillStyle = "#008000";
                if (shard.name !== null) {
                    ctx2.font = "30px Arial";
                    ctx2.fillText(shard.name, shard.x, shard.y);
                }
                ctx2.arc(shard.x, shard.y, 5, 0, 2 * Math.PI, false);
                ctx2.fill();
                ctx2.closePath();
            }
        }
    };

    var drawConnectors = function () {
        for (var id in HOME_LIST) {
            var home = HOME_LIST[id];
            if (home.neighbors) {
                for (var i = 0; i < home.neighbors.length; i++) {
                    var neighbor = HOME_LIST[home.neighbors[i]];
                    ctx2.moveTo(home.x, home.y);
                    ctx2.strokeStyle = "#912381";
                    ctx2.lineWidth = 10;
                    ctx2.lineTo(neighbor.x, neighbor.y);
                    ctx2.stroke();
                }
            }
        }
    };

    var drawHomes = function () {
        for (var id in HOME_LIST) {
            var home = HOME_LIST[id];

            ctx2.beginPath();
            if (home.neighbors.length >= 4) {
                ctx2.fillStyle = "#4169e1";
            } else {
                ctx2.fillStyle = "#003290";
            }
            ctx2.strokeStyle = "rgba(255,30, 1, 0.1)";
            ctx2.lineWidth = 20;

            ctx2.arc(home.x, home.y, home.radius, 0, 2 * Math.PI, false);
            ctx2.fill();
            ctx2.stroke();

            if (home.owner !== null) {
                ctx2.fillText(home.shards.length, home.x, home.y + 40);
            }
            ctx2.closePath();
        }
    };

    var drawFactions = function () {
        for (var id in FACTION_LIST) {
            var faction = FACTION_LIST[id];
            ctx2.font = faction.size * 30 + "px Arial";
            ctx2.textAlign = "center";
            ctx2.fillText(faction.name, faction.x, faction.y);
        }
    };

    var drawBracket = function () {
        if (BRACKET) {
            ctx2.fillStyle = "rgba(100,211,211,0.6)";
            ctx2.fillRect(BRACKET.x, BRACKET.y, BRACKET.length, BRACKET.length);
        }
    };

    var drawArrow = function () {
        if (ARROW && ARROW.postX) {
            ctx2.beginPath();
            ctx2.moveTo(selfPlayer.x, selfPlayer.y);
            ctx2.strokeStyle = "#521522";
            ctx2.lineWidth = 10;
            ctx2.lineTo(selfPlayer.x+ARROW.deltaX(), selfPlayer.y + ARROW.deltaY());
            ctx2.stroke();
            ctx2.closePath();
        }
    };

    var drawAnimations = function () {
        for (var id in ANIMATION_LIST) {
            var home;
            var animation = ANIMATION_LIST[id];
            if (animation.type === "addShard") {
                home = HOME_LIST[animation.id];
                if (!home) {
                    return;
                }
                ctx2.beginPath();
                ctx2.lineWidth = 3*animation.timer;
                ctx2.strokeStyle = "#012CCC";
                ctx2.arc(home.x, home.y, home.radius, 0, animation.timer/1.2, true);
                ctx2.stroke();
                ctx2.closePath();
            }

            if (animation.type === "removeShard") {
                home = HOME_LIST[animation.id];
                if (!home) {
                    delete ANIMATION_LIST[id];
                    return;
                }
                ctx2.beginPath();
                ctx2.lineWidth = 15 - animation.timer;
                ctx2.strokeStyle = "rgba(255, 0, 0, " + animation.timer * 10 / 100 + ")";
                ctx2.arc(home.x, home.y, home.radius, 0, 2*Math.PI, false);
                ctx2.stroke();
                ctx2.closePath();
            }

            if (animation.type === "shardDeath") {
                ctx2.font = 60 - animation.timer + "px Arial";
                ctx2.save();
                ctx2.translate(animation.x, animation.y);
                ctx2.rotate(-Math.PI / 50 * animation.theta);
                ctx2.textAlign = "center";
                ctx2.fillStyle = "rgba(0, 0, 0, " + animation.timer * 10 / 100 + ")";
                ctx2.fillText(animation.name, 0, 15);
                ctx2.restore();

                ctx2.fillStyle = "#000000";
                animation.theta = lerp(animation.theta, 0, 0.08);
                animation.x = lerp(animation.x, animation.endX, 0.1);
                animation.y = lerp(animation.y, animation.endY, 0.1);
            }

            animation.timer--;
            if (animation.timer <= 0) {
                delete ANIMATION_LIST[id];
            }
        }
    };



    var translateScene = function () {
        ctx2.setTransform(1,0,0,1,0,0);
        if (keys[17] && keys[38] && scaleFactor < 2) {
            scaleFactor += 0.2;
        }
        if (keys[17] && keys[40] && scaleFactor > 0.7) {
            scaleFactor -= 0.2;
        }
        ctx2.translate(canvas.width/2, canvas.height/2);
        ctx2.scale(scaleFactor, scaleFactor);
        ctx2.translate(-selfPlayer.x, -selfPlayer.y);
    };

    var drawMiniMap = function () {
        if (mapTimer <= 0 || serverMap === null) {
            var tileLength = Math.sqrt(Object.size(TILE_LIST));
            if (tileLength === 0 || !selfPlayer) {
                return;
            }   
            var imgData = ctx.createImageData(tileLength, tileLength);
            var tile;
            var tileRGB;
            var i = 0;


            for (var id in TILE_LIST) {
                tileRGB = {};
                tile = TILE_LIST[id];
                if (tile.color && tile.alert || inBounds(selfPlayer,tile.x, tile.y)) {
                    tileRGB.r = tile.color.r;
                    tileRGB.g = tile.color.g;
                    tileRGB.b = tile.color.b;
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
            imgData = scaleImageData(imgData,2,ctx);

            ctx3.putImageData(imgData, 0, 0);

            ctx4.rotate(90*Math.PI/180);
            ctx4.scale(1, -1);
            ctx4.drawImage(c3, 0, 0);
            ctx4.scale(1, -1);
            ctx4.rotate(270*Math.PI/180);

            serverMap = c4;
            mapTimer = 25;
        }

        else {
            mapTimer -= 1;
        }

        ctx.drawImage(serverMap, 100, 400);
    };

    
    var drawScoreBoard = function () {
        for (var i = FACTION_ARRAY.length - 1; i >= 0; i--) {
            var faction = FACTION_ARRAY[i];
            ctx.font = "30px Arial";
            ctx.fillText(faction.name, canvas.width * 3/4, 10 + (FACTION_ARRAY.length - i) * 30);
        }
    };

    ctx.clearRect(0, 0, 11000, 11000);
    ctx2.clearRect(0, 0, 11000, 11000);
    ctx3.clearRect(0,0, 500, 500);

    drawTiles();
    drawControllers();
    drawShards();
    drawConnectors();
    drawHomes();
    drawFactions();
    drawAnimations();

    drawBracket();
    drawArrow();

    translateScene();
    ctx.drawImage(c2, 0, 0);
    drawMiniMap();
    drawScoreBoard();
}


function factionSort(a,b) {
    return a.size - b.size;
}


function scaleImageData(imageData, scale, ctx) {
    var scaled = ctx.createImageData(imageData.width * scale, imageData.height * scale);
    var subLine = ctx.createImageData(scale, 1).data;
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

function lerp(a,b,ratio) {
    return a + ratio * (b-a);
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
    if (CONTROLLER_LIST[selfId]) {
        var rect = canvas.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;
        ARROW = new Arrow(x, y);
    }
});


canvas.addEventListener("mouseup", function (event) {
    var rect = canvas.getBoundingClientRect();
    var magnitude = function (x,y) {
        return x * x + y * y;
    };
    var normalize = function(x,y) {
        return [x/magnitude(x,y), y/magnitude(x,y)];
    };
    var x,y;

    ARROW.postX = event.clientX - rect.left;
    ARROW.postY = event.clientY - rect.top;

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
        case 66:
            id = 'B';
            break;
        case 13:
            id = 'enter';
            break;
    }
    return id;
};




function getRandom(min, max) {
  return Math.random() * (max - min) + min;
}

Object.size = function (obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

