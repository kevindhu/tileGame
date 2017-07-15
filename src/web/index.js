var mainCanvas = document.getElementById("bigCanvas");
var draftCanvas = document.getElementById("draftCanvas");
var mMap = document.getElementById("mMap");
var mMapRot = document.getElementById("mMapRot");

draftCanvas.style.display = "none";
mMap.style.display = "none";
mMapRot.style.display = "none";

draftCanvas.width = mainCanvas.width;
draftCanvas.height = mainCanvas.height;

var mainCtx = mainCanvas.getContext("2d");
var draftCtx = draftCanvas.getContext("2d");
var mMapCtx = mMap.getContext("2d");
var mMapCtxRot = mMapRot.getContext("2d");

var socket = io();
socket.verified = false;

socket.on('addFactionsUI', addFactionstoUI);
socket.on('updateEntities', packetHandler);
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
    this.maxHealth = controllerInfo.maxHealth;
    this.selected = controllerInfo.selected;
    this.owner = controllerInfo.owner;
    this.theta = controllerInfo.theta;
    this.type = controllerInfo.type;
};
var Tile = function (tileInfo) {
    this.id = tileInfo.id;
    this.x = tileInfo.x;
    this.y = tileInfo.y;
    this.length = tileInfo.length;
    this.color = tileInfo.color;
    this.alert = tileInfo.alert;
    this.random = Math.floor(getRandom(0, 3));
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
    this.power = homeInfo.power;
    this.level = homeInfo.level;
    this.hasColor = homeInfo.hasColor;
    this.health = homeInfo.health;
    this.neighbors = homeInfo.neighbors;
    this.unitDmg =  homeInfo.unitDmg;
    this.unitSpeed =  homeInfo.unitSpeed;
    this.unitArmor =  homeInfo.unitArmor;
    this.queue = homeInfo.queue;
};
var Arrow = function (x, y) {
    this.preX = x;
    this.preY = y;
    this.postX = x;
    this.postY = y;
    this.deltaX = function () {
        return this.postX - mainCanvas.width / 2;
    };
    this.deltaY = function () {
        return this.postY - mainCanvas.height / 2;
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
        home.power = homeInfo.power;
        home.health = homeInfo.health;
        home.hasColor = homeInfo.hasColor;
        home.neighbors = homeInfo.neighbors;
        home.unitDmg =  homeInfo.unitDmg;
        home.unitSpeed =  homeInfo.unitSpeed;
        home.unitArmor =  homeInfo.unitArmor;
        home.queue = homeInfo.queue;
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
        controller.maxHealth = controllerInfo.maxHealth;
        controller.selected = controllerInfo.selected;
        controller.theta = controllerInfo.theta;
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
            var index = findWithAttr(array, "id", packet.id);
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
        case "tileInfo":
            deleteEntity(packet, TILE_LIST);
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
    if (!socket.verified) {
        console.log("VERIFIED");
        socket.emit("verify", {});
        socket.verified = true;
    }
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
        var range = mainCanvas.width / (1.2 * scaleFactor);
        return x < (player.x + range) && x > (player.x - 5 / 4 * range)
            && y < (player.y + range) && y > (player.y - 5 / 4 * range);
    };


    var inBoundsClose = function (player, x, y) {
        var range = 150;
        return x < (player.x + range) && x > (player.x - 5 / 4 * range)
            && y < (player.y + range) && y > (player.y - 5 / 4 * range);
    };

    var drawControllers = function () {
        draftCtx.font = "20px Arial";

        draftCtx.strokeStyle = "#ff9d60";
        for (var id in CONTROLLER_LIST) {
            var controller = CONTROLLER_LIST[id], i;
            draftCtx.fillStyle = "rgba(123,0,0," + controller.health / (4 *controller.maxHealth) + ")";
            draftCtx.lineWidth = 10;
            draftCtx.beginPath();

            //draw player object
            if (controller.type === "Player") {
                var radius = 30;
                draftCtx.moveTo(controller.x + radius, controller.y);
                for (i = Math.PI / 4; i <= 2 * Math.PI - Math.PI / 4; i += Math.PI / 4) {
                    theta = i + getRandom(-(controller.maxHealth / controller.health) / 7, (controller.maxHealth / controller.health) / 7);
                    x = radius * Math.cos(theta);
                    y = radius * Math.sin(theta);
                    draftCtx.lineTo(controller.x + x, controller.y + y);
                }
                draftCtx.lineTo(controller.x + radius, controller.y + 3);
                draftCtx.stroke();
                draftCtx.fill();
            } else { //bot
                var x, y, theta, startX, startY;
                var smallRadius = 12;
                var bigRadius = 20;

                theta = controller.theta;
                startX = bigRadius * Math.cos(theta);
                startY = bigRadius * Math.sin(theta);
                draftCtx.moveTo(controller.x + startX, controller.y + startY);
                for (i = 1; i <= 2; i++) {
                    theta = controller.theta + 2 * Math.PI / 3 * i +
                        getRandom(-controller.maxHealth / controller.health / 7, controller.maxHealth / controller.health / 7);
                    x = smallRadius * Math.cos(theta);
                    y = smallRadius * Math.sin(theta);
                    draftCtx.lineTo(controller.x + x, controller.y + y);
                }
                theta = controller.theta;
                draftCtx.lineTo(controller.x + startX, controller.y + startY);
                draftCtx.fill();
            }

            draftCtx.fillStyle = "#ff9d60";
            draftCtx.fillText(controller.name, controller.x, controller.y + 70);
            if (controller.selected && controller.owner === selfPlayer.id) {
                draftCtx.lineWidth = 5;
                draftCtx.strokeStyle = "#1d55af";
                draftCtx.stroke();
            }
        }
    };

    var drawTiles = function () {
        for (var id in TILE_LIST) {
            var tile = TILE_LIST[id];
            if (inBounds(selfPlayer, tile.x, tile.y)) {
                draftCtx.beginPath();
                draftCtx.fillStyle = "rgb(" +
                    tile.color.r + "," +
                    tile.color.g + "," +
                    tile.color.b +
                    ")";

                draftCtx.lineWidth = 15;

                draftCtx.strokeStyle = "#1e2a2b";

                draftCtx.rect(tile.x, tile.y, tile.length, tile.length);
                draftCtx.stroke();
                draftCtx.fill();
            }
        }
    };


    var drawShards = function () {
        for (var id in SHARD_LIST) {
            var shard = SHARD_LIST[id];
            draftCtx.lineWidth = 2;

            if (inBounds(selfPlayer, shard.x, shard.y) && shard.visible) {
                draftCtx.beginPath();
                if (shard.name !== null) {
                    draftCtx.font = "30px Arial";
                    draftCtx.fillText(shard.name, shard.x, shard.y);
                }
                draftCtx.fillStyle = "rgba(100, 255, 227, 0.1)";
                draftCtx.arc(shard.x, shard.y, 20, 0, 2 * Math.PI, false);
                draftCtx.fill();
                draftCtx.closePath();



                draftCtx.beginPath();
                draftCtx.fillStyle = "#dfff42";

                var radius = 10, i;
                var startTheta = getRandom(0,0.2);
                var theta = 0;
                var startX = radius * Math.cos(startTheta);
                var startY = radius * Math.sin(startTheta);
                draftCtx.moveTo(shard.x + startX, shard.y + startY);
                for (i = Math.PI / 2; i <= 2 * Math.PI - Math.PI / 2; i += Math.PI / 2) {
                    theta = startTheta + i + getRandom(-1 / 24, 1 / 24);
                    var x = radius * Math.cos(theta);
                    var y = radius * Math.sin(theta);
                    draftCtx.lineTo(shard.x + x, shard.y + y);
                }
                draftCtx.lineTo(shard.x + startX, shard.y + startY);
                draftCtx.stroke();
                draftCtx.fill();
                draftCtx.closePath();
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
                draftCtx.beginPath();
                draftCtx.moveTo(owner.x, owner.y);
                draftCtx.strokeStyle = "#912222";
                draftCtx.lineWidth = 10;
                draftCtx.lineTo(target.x, target.y);
                draftCtx.stroke();
            }
        }
    };


    var drawConnectors = function () {
        for (var id in HOME_LIST) {
            var home = HOME_LIST[id];
            if (home.neighbors) {
                for (var i = 0; i < home.neighbors.length; i++) {
                    var neighbor = HOME_LIST[home.neighbors[i]];
                    draftCtx.moveTo(home.x, home.y);
                    if (inBoundsClose(selfPlayer, home.x, home.y)) {
                        draftCtx.strokeStyle = "#f442b0";
                    } else {
                        draftCtx.strokeStyle = "#912381";
                    }
                    draftCtx.lineWidth = 10;
                    draftCtx.lineTo(neighbor.x, neighbor.y);
                    draftCtx.stroke();
                }
            }
        }
    };

    var drawHomes = function () {
        for (var id in HOME_LIST) {
            var home = HOME_LIST[id];

            draftCtx.beginPath();
            if (home.neighbors.length >= 4) {
                draftCtx.fillStyle = "#4169e1";
            } else {
                draftCtx.fillStyle = "#396a6d";
            }

            draftCtx.arc(home.x, home.y, home.radius, 0, 2 * Math.PI, false);
            draftCtx.fill();

            if (inBoundsClose(selfPlayer, home.x, home.y)) {
                if (home.faction )
                draftCtx.strokeStyle = "rgba(12, 255, 218, 0.7)";
                draftCtx.lineWidth = 10;
                draftCtx.stroke();
            }

            if (home.owner !== null) {
                draftCtx.fillText(home.shards.length, home.x, home.y + 40);
            }
            draftCtx.closePath();
        }
    };

    var drawFactions = function () {
        for (var id in FACTION_LIST) {
            var faction = FACTION_LIST[id];
            draftCtx.font = faction.size * 30 + "px Arial";
            draftCtx.textAlign = "center";
            draftCtx.fillText(faction.name, faction.x, faction.y);
        }
    };

    var drawBracket = function () {
        if (BRACKET) {
            draftCtx.fillStyle = "rgba(100,211,211,0.6)";
            draftCtx.fillRect(BRACKET.x, BRACKET.y, BRACKET.length, BRACKET.length);
            draftCtx.font = "20px Arial";
            draftCtx.fillText("Press Z to Place Sentinel", selfPlayer.x, selfPlayer.y + 100);
        }
    };

    var drawArrow = function () {
        if (ARROW && ARROW.postX) {
            draftCtx.beginPath();
            draftCtx.strokeStyle = "#521522";

            var preX = selfPlayer.x + (ARROW.preX - draftCanvas.width / 2) / scaleFactor;
            var preY = selfPlayer.y + (ARROW.preY - draftCanvas.height / 2) / scaleFactor;

            var postX = selfPlayer.x + (ARROW.postX - draftCanvas.width / 2) / scaleFactor;
            var postY = selfPlayer.y + (ARROW.postY - draftCanvas.height / 2) / scaleFactor;

            draftCtx.fillRect(preX, preY, postX - preX, postY - preY);

            draftCtx.arc(postX, postY, 3, 0, 2 * Math.PI, true);
            draftCtx.stroke();
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
                draftCtx.beginPath();
                draftCtx.lineWidth = 3 * animation.timer;
                draftCtx.strokeStyle = "#012CCC";
                draftCtx.arc(home.x, home.y, home.radius, 0, animation.timer / 1.2, true);
                draftCtx.stroke();
                draftCtx.closePath();
            }

            if (animation.type === "removeShard") {
                home = HOME_LIST[animation.id];
                if (!home) {
                    delete ANIMATION_LIST[id];
                    return;
                }
                draftCtx.beginPath();
                draftCtx.lineWidth = 15 - animation.timer;
                draftCtx.strokeStyle = "rgba(255, 0, 0, " + animation.timer * 10 / 100 + ")";
                draftCtx.arc(home.x, home.y, home.radius, 0, 2 * Math.PI, false);
                draftCtx.stroke();
                draftCtx.closePath();
            }

            if (animation.type === "shardDeath") {
                draftCtx.font = 60 - animation.timer + "px Arial";
                draftCtx.save();
                draftCtx.translate(animation.x, animation.y);
                draftCtx.rotate(-Math.PI / 50 * animation.theta);
                draftCtx.textAlign = "center";
                draftCtx.fillStyle = "rgba(255, 168, 86, " + animation.timer * 10 / 100 + ")";
                draftCtx.fillText(animation.name, 0, 15);
                draftCtx.restore();

                draftCtx.fillStyle = "#000000";
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
        draftCtx.setTransform(1, 0, 0, 1, 0, 0);
        scaleFactor = lerp(scaleFactor, mainScaleFactor, 0.3);

        draftCtx.translate(mainCanvas.width / 2, mainCanvas.height / 2);
        draftCtx.scale(scaleFactor, scaleFactor);
        draftCtx.translate(-selfPlayer.x, -selfPlayer.y);
    };

    var drawMiniMap = function () {
        if (mapTimer <= 0 || serverMap === null) {
            var tileLength = Math.sqrt(Object.size(TILE_LIST));
            if (tileLength === 0 || !selfPlayer) {
                return;
            }
            var imgData = mainCtx.createImageData(tileLength, tileLength);
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
            console.log(400 / Object.size(TILE_LIST));
            imgData = scaleImageData(imgData, Math.floor(400 / Object.size(TILE_LIST)), mainCtx);

            mMapCtx.putImageData(imgData, 0, 0);

            mMapCtxRot.rotate(90 * Math.PI / 180);
            mMapCtxRot.scale(1, -1);
            mMapCtxRot.drawImage(mMap, 0, 0);
            mMapCtxRot.scale(1, -1);
            mMapCtxRot.rotate(270 * Math.PI / 180);

            serverMap = mMapRot;
            mapTimer = 25;
        }

        else {
            mapTimer -= 1;
        }

        mainCtx.drawImage(serverMap, 800, 400);
    };


    var drawScoreBoard = function () {
        mainCtx.fillText("LEADERBOARD:", mainCanvas.width * 3 / 4, 40);
        for (var i = FACTION_ARRAY.length - 1; i >= 0; i--) {
            var faction = FACTION_ARRAY[i];
            mainCtx.font = "30px Arial";
            mainCtx.fillText(faction.name, mainCanvas.width * 3 / 4, 40 + (FACTION_ARRAY.length - i) * 30);
        }
    };

    mainCtx.clearRect(0, 0, 11000, 11000);
    draftCtx.clearRect(0, 0, 11000, 11000);
    mMapCtx.clearRect(0, 0, 500, 500);
    drawTiles();
    drawControllers();
    drawShards();
    drawLasers();
    drawConnectors();
    drawHomes();
    //drawFactions();
    drawAnimations();

    drawBracket();
    drawArrow();

    translateScene();
    mainCtx.drawImage(draftCanvas, 0, 0);
    //drawMiniMap();
    drawScoreBoard();
}


function factionSort(a, b) {
    return a.size - b.size;
}


function scaleImageData(imageData, scale, mainCtx) {
    var scaled = mainCtx.createImageData(imageData.width * scale, imageData.height * scale);
    var subLine = mainCtx.createImageData(scale, 1).data;
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
var scaleFactor = 1;
var mainScaleFactor = 1;

document.onkeydown = function (event) {
    keys[event.keyCode] = true;
    socket.emit('keyEvent', {id: event.keyCode, state: true});
};

document.onkeyup = function (event) {
    keys[event.keyCode] = false;
    socket.emit('keyEvent', {id: event.keyCode, state: false});
};


mainCanvas.addEventListener("mousedown", function (event) {
    if (event.button === 2) {
        rightClick = true;
    } else if (CONTROLLER_LIST[selfId]) {
        ARROW = new Arrow(event.x / mainCanvas.offsetWidth * 1000,
            event.y / mainCanvas.offsetHeight * 500);
    }
});


document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
}, false);

mainCanvas.addEventListener("mouseup", function (event) {
    if (!rightClick) {
        ARROW.postX = event.x / mainCanvas.offsetWidth * 1000;
        ARROW.postY = event.y / mainCanvas.offsetHeight * 500;

        var minX = (ARROW.preX - draftCanvas.width / 2) / scaleFactor;
        var minY = (ARROW.preY - draftCanvas.height / 2) / scaleFactor;
        var maxX = (ARROW.postX - draftCanvas.width / 2) / scaleFactor;
        var maxY = (ARROW.postY - draftCanvas.height / 2) / scaleFactor;
        socket.emit("selectBots", {
            minX: minX,
            minY: minY,
            maxX: maxX,
            maxY: maxY
        });
    }
    else {
        var x = event.x / mainCanvas.offsetWidth * 1000;
        var y = event.y / mainCanvas.offsetHeight * 500;
        maxX = (x - draftCanvas.width / 2) / scaleFactor;
        maxY = (y - draftCanvas.height / 2) / scaleFactor;

        socket.emit("botCommand", {
            x: maxX,
            y: maxY
        });
    }

    rightClick = false;
    ARROW = null;
});


mainCanvas.addEventListener("mousemove", function (event) {
    if (ARROW) {
        ARROW.postX = event.x / mainCanvas.offsetWidth * 1000;
        ARROW.postY = event.y / mainCanvas.offsetHeight * 500;
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

