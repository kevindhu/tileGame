var canvas = document.getElementById("bigCanvas");
var c2 = document.getElementById("draftCanvas");
var c3 = document.getElementById("c3");
var c4 = document.getElementById("c4");

c2.style.display = "none";
c3.style.display = "none";
c4.style.display = "none";

c2.width = canvas.width;
c2.height = canvas.height;

var ctx = canvas.getContext("2d");
var ctx2 = c2.getContext("2d");
var ctx3 = c3.getContext("2d");
var ctx4 = c4.getContext("2d");


var socket = io();

socket.on('addFactionsUI', addFactionstoUI);
socket.on('addEntities', addEntities);
socket.on('updateEntities', packetHandler);
socket.on('deleteEntities', deleteEntities);
socket.on('drawScene', drawScene);

var selfId = null;

var FACTION_LIST = {};
var FACTION_ARRAY = [];

var CONTROLLER_LIST = {};
var TILE_LIST = {};
var SHARD_LIST = {};
var LASER_LIST = {};
var HOME_LIST = {};
var ANIMATION_LIST = {};

var rightClick = false;
var ARROW = null;
var BRACKET = null;
var serverMap = null;
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
    this.selected = controllerInfo.selected;
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
var Laser = function (laserInfo) {
    this.id = laserInfo.id;
    this.owner = laserInfo.owner;
    this.target = laserInfo.target;
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
var Arrow = function (x, y) {
    this.preX = x;
    this.preY = y;
    this.postX = x;
    this.postY = y;
    this.deltaX = function () {
        return this.postX - canvas.width / 2;
    };
    this.deltaY = function () {
        return this.postY - canvas.height / 2;
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
    this.timer = getRandom(10, 14);

    if (this.x) {
        this.endX = this.x + getRandom(-100, 100);
        this.endY = this.y + getRandom(-100, 100);
    }
};


function packetHandler(data) {
    var packet, i;
    for (i = 0; i < data.length; i++) {
        packet = data[i];
        switch (packet.master) {
            case "add":
                addEntities(packet);
                break;
            case "delete":
                deleteEntities(packet);
                break;
            case "update":
                updateEntities(packet);
                break;
        }
    }
}

function addEntities(packet) {
    var addEntity = function (packet, list, Entity, array) {
        if (!packet) {
            return;
        }
        list[packet.id] = new Entity(packet);
        if (array && findWithAttr(array, "id", packet.id) === -1) {
            array.push(list[packet.id]);
        }
    };

    switch (packet.class) {
        case "tileInfo":
            addEntity(packet, TILE_LIST, Tile);
            break;
        case "controllerInfo":
            addEntity(packet, CONTROLLER_LIST, Controller);
            break;
        case "shardInfo":
            addEntity(packet, SHARD_LIST, Shard);
            break;
        case "laserInfo":
            addEntity(packet, LASER_LIST, Laser);
            break;
        case "homeInfo":
            addEntity(packet, HOME_LIST, Home);
            break;
        case "factionInfo":
            addEntity(packet, FACTION_LIST, Faction, FACTION_ARRAY);
            break;
        case "animationInfo":
            addEntity(packet, ANIMATION_LIST, Animation);
            break;
        case "bracketInfo":
            if (selfId === packet.playerId) {
                BRACKET = new Bracket(packet);
            }
            break;
        case "UIInfo":
            if (selfId === packet.playerId) {
                openUI(packet);
            }
            break;
        case "selfId":
            selfId = packet.selfId;
            break;
    }

}

function updateEntities(packet) {
    function updateEntity(packet, list, callback) {
        if (!packet) {
            return;
        }
        var entity = list[packet.id];
        if (!entity) {
            return;
        }
        callback(entity, packet);
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
        shard.visible = shardInfo.visible;
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
        controller.selected = controllerInfo.selected;
    };

    switch (packet.class) {
        case "controllerInfo":
            updateEntity(packet, CONTROLLER_LIST, updateControllers);
            break;
        case "tileInfo":
            updateEntity(packet, TILE_LIST, updateTiles);
            break;
        case "shardInfo":
            updateEntity(packet, SHARD_LIST, updateShards);
            break;
        case "homeInfo":
            updateEntity(packet, HOME_LIST, updateHomes);
            break;
        case "factionInfo":
            updateEntity(packet, FACTION_LIST, updateFactions);
            break;
    }
}

function deleteEntities(packet) {

    var deleteEntity = function (packet, list, array) {
        if (!packet) {
            return;
        }
        if (array) {
            var index = findWithAttr(array, "id", info.id);
            array.splice(index, 1);
        }
        delete list[packet.id];
    };

    switch (packet.class) {
        case "tileInfo":
            deleteEntity(packet, TILE_LIST);
            break;
        case "controllerInfo":
            deleteEntity(packet, CONTROLLER_LIST);
            break;
        case "shardInfo":
            deleteEntity(packet, SHARD_LIST);
            break;
        case "homeInfo":
            deleteEntity(packet, HOME_LIST);
            break;
        case "factionInfo":
            deleteEntity(packet, FACTION_LIST, FACTION_ARRAY);
            break;
        case "animationInfo":
            deleteEntity(packet, ANIMATION_LIST);
            break;
        case "laserInfo":
            deleteEntity(packet, LASER_LIST);
            break;
        case "bracketInfo":
            if (selfId === packet.id) {
                BRACKET = null;
            }
            break;
        case "UIInfo":
            if (selfId === packet.id) {
                closeUI(packet.action);
            }
            break;
    }

}


function addFactionstoUI(data) {
    var factions = document.getElementById('factions');
    var packet = data.factions;

    for (var i = 0; i < packet.length; i++) {
        var name = packet[i];
        var option = document.createElement('option');
        option.value = name;
        factions.appendChild(option);
    }
}

function findWithAttr(array, attr, value) {
    for (var i = 0; i < array.length; i += 1) {
        if (array[i][attr] === value) {
            return i;
        }
    }
    return -1;
}

function drawScene(data) {
    var selfPlayer = CONTROLLER_LIST[selfId];

    if (!selfPlayer) {
        return;
    }

    var inBounds = function (player, x, y) {
        return x < (player.x + canvas.width) && x > (player.x - 5 / 4 * canvas.width)
            && y < (player.y + canvas.width) && y > (player.y - 5 / 4 * canvas.width);
    };

    var drawControllers = function () {
        ctx2.font = "20px Arial";
        ctx2.fillStyle = "#000000";
        for (var id in CONTROLLER_LIST) {
            var controller = CONTROLLER_LIST[id];
            ctx2.beginPath();
            ctx2.arc(controller.x, controller.y, 30, 0, 2 * Math.PI, false);
            ctx2.fill();
            ctx2.fillText(controller.name, controller.x, controller.y + 30);
            ctx2.fillRect(controller.x - controller.health * 10 / 2, controller.y + 10,
                controller.health * 10, 10);
            if (controller.selected) {
                ctx2.lineWidth = 5;
                ctx2.strokeStyle = "#1d55af";
                ctx2.stroke();
            }
        }
    };

    var drawTiles = function () {
        for (var id in TILE_LIST) {
            var tile = TILE_LIST[id];
            if (inBounds(selfPlayer, tile.x, tile.y)) {
                if (!tile.color) {
                    tile.color = {
                        r: Math.round(getRandom(210, 214)),
                        g: Math.round(getRandom(210, 214)),
                        b: Math.round(getRandom(200, 212))
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

    var drawLasers = function () {
        var id, laser, target, owner;
        for (id in LASER_LIST) {
            laser = LASER_LIST[id];
            target = CONTROLLER_LIST[laser.target];
            owner = CONTROLLER_LIST[laser.owner];
            if (target && owner && inBounds(selfPlayer, owner.x, owner.y)) {
                ctx2.beginPath();
                ctx2.moveTo(owner.x, owner.y);
                ctx2.strokeStyle = "#912222";
                ctx2.lineWidth = 10;
                ctx2.lineTo(target.x, target.y);
                ctx2.stroke();
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
            ctx2.strokeStyle = "#521522";

            var preX = selfPlayer.x + (ARROW.preX - c2.width / 2) / scaleFactor;
            var preY = selfPlayer.y + (ARROW.preY - c2.height / 2) / scaleFactor;

            var postX = selfPlayer.x + (ARROW.postX - c2.width / 2) / scaleFactor;
            var postY = selfPlayer.y + (ARROW.postY - c2.height / 2) / scaleFactor;

            ctx2.fillRect(preX, preY, postX - preX, postY - preY);

            ctx2.arc(postX, postY, 3, 0, 2 * Math.PI, true);
            ctx2.stroke();
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
                ctx2.lineWidth = 3 * animation.timer;
                ctx2.strokeStyle = "#012CCC";
                ctx2.arc(home.x, home.y, home.radius, 0, animation.timer / 1.2, true);
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
                ctx2.arc(home.x, home.y, home.radius, 0, 2 * Math.PI, false);
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
        ctx2.setTransform(1, 0, 0, 1, 0, 0);
        if (keys[17] && keys[38] && scaleFactor < 2) {
            scaleFactor += 0.2;
        }
        if (keys[17] && keys[40] && scaleFactor > 0.7) {
            scaleFactor -= 0.2;
        }
        ctx2.translate(canvas.width / 2, canvas.height / 2);
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
                if (tile.color && tile.alert || inBounds(selfPlayer, tile.x, tile.y)) {
                    tileRGB.r = tile.color.r;
                    tileRGB.g = tile.color.g;
                    tileRGB.b = tile.color.b;
                }
                else {
                    tileRGB.r = 0;
                    tileRGB.g = 0;
                    tileRGB.b = 0;
                }

                imgData.data[i] = tileRGB.r;
                imgData.data[i + 1] = tileRGB.g;
                imgData.data[i + 2] = tileRGB.b;
                imgData.data[i + 3] = 255;
                i += 4;
            }
            imgData = scaleImageData(imgData, 2, ctx);

            ctx3.putImageData(imgData, 0, 0);

            ctx4.rotate(90 * Math.PI / 180);
            ctx4.scale(1, -1);
            ctx4.drawImage(c3, 0, 0);
            ctx4.scale(1, -1);
            ctx4.rotate(270 * Math.PI / 180);

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
            ctx.fillText(faction.name, canvas.width * 3 / 4, 10 + (FACTION_ARRAY.length - i) * 30);
        }
    };

    ctx.clearRect(0, 0, 11000, 11000);
    ctx2.clearRect(0, 0, 11000, 11000);
    ctx3.clearRect(0, 0, 500, 500);
    drawTiles();
    drawControllers();
    drawShards();
    drawLasers();
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


function factionSort(a, b) {
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
            for (var x = 0; x < scale; x++) subLine.set(sourcePixel, x * 4)
            for (var y = 0; y < scale; y++) {
                var destRow = row * scale + y;
                var destCol = col * scale;
                scaled.data.set(subLine, (destRow * scaled.width + destCol) * 4)
            }
        }
    }

    return scaled;
}

function lerp(a, b, ratio) {
    return a + ratio * (b - a);
}


var keys = [];
var scaleFactor = 1.5;

document.onkeydown = function (event) {
    keys[event.keyCode] = true;
    socket.emit('keyEvent', {id: event.keyCode, state: true});
};

document.onkeyup = function (event) {
    keys[event.keyCode] = false;
    socket.emit('keyEvent', {id: event.keyCode, state: false});
};


canvas.addEventListener("mousedown", function (event) {
    if (event.button === 2) {
        rightClick = true;
    } else if (CONTROLLER_LIST[selfId]) {
        ARROW = new Arrow(event.x / canvas.offsetWidth * 1000,
            event.y / canvas.offsetHeight * 500);
    }
});



document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
}, false);

canvas.addEventListener("mouseup", function (event) {
    if (!rightClick) {
        ARROW.postX = event.x / canvas.offsetWidth * 1000;
        ARROW.postY = event.y / canvas.offsetHeight * 500;

        var minX = (ARROW.preX - c2.width / 2) / scaleFactor;
        var minY = (ARROW.preY - c2.height / 2) / scaleFactor;
        var maxX = (ARROW.postX - c2.width / 2) / scaleFactor;
        var maxY = (ARROW.postY - c2.height / 2) / scaleFactor;
        console.log("SELECT BOTS");
        socket.emit("selectBots", {
            minX: minX,
            minY: minY,
            maxX: maxX,
            maxY: maxY
        });
    }
    else {
        var x = event.x / canvas.offsetWidth * 1000;
        var y = event.y / canvas.offsetHeight * 500;
        maxX = (x - c2.width / 2) / scaleFactor;
        maxY = (y - c2.height / 2) / scaleFactor;

        socket.emit("botCommand", {
            x: maxX,
            y: maxY
        });
    }

    rightClick = false;
    ARROW = null;
});


canvas.addEventListener("mousemove", function (event) {
    if (ARROW) {
        ARROW.postX = event.x / canvas.offsetWidth * 1000;
        ARROW.postY = event.y / canvas.offsetHeight * 500;
    }
});


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

