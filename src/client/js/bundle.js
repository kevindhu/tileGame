(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Entity = require('./entities');

function Client() {
    this.SELFID = null;
    this.ARROW = null;
    this.BRACKET = null;
    this.serverMap = null;
    this.mapTimer = 0;
    this.rightClick = false;
    this.init();
}

Client.prototype.init = function () {
    this.initSocket();
    this.initCanvases();
    this.initLists();
    this.initViewer();
};


Client.prototype.initCanvases = function () {
    this.mainCanvas = document.getElementById("main_canvas");
    this.draftCanvas = document.createElement("canvas");
    this.mMap = document.createElement("canvas");
    this.mMapRot = document.createElement("canvas");

    this.mainCanvas.style.visibility = "hidden";
    this.draftCanvas.style.display = "none";
    this.mMap.style.display = "none";
    this.mMapRot.style.display = "none";

    this.draftCanvas.height = this.mainCanvas.height;
    this.draftCanvas.width = this.mainCanvas.width;
    this.mMap.height = 500;
    this.mMap.width = 500;
    this.mMapRot.height = 500;
    this.mMapRot.width = 500;

    this.mainCtx = this.mainCanvas.getContext("2d");
    this.draftCtx = this.draftCanvas.getContext("2d");
    this.mMapCtx = this.mMap.getContext("2d");
    this.mMapCtxRot = this.mMapRot.getContext("2d");

    this.mainCanvas.addEventListener("mousedown", function (event) {
        if (event.button === 2) {
            this.rightClick = true;
        } else if (this.CONTROLLER_LIST[this.SELFID]) {
            this.ARROW = new Arrow(event.x / mainCanvas.offsetWidth * 1000,
                event.y / mainCanvas.offsetHeight * 500);
        }
    });

    this.mainCanvas.addEventListener("mouseup", function (event) {
        if (!rightClick) {
            this.ARROW.postX = event.x / mainCanvas.offsetWidth * 1000;
            this.ARROW.postY = event.y / mainCanvas.offsetHeight * 500;

            var minX = (this.ARROW.preX - draftCanvas.width / 2) / scaleFactor;
            var minY = (this.ARROW.preY - draftCanvas.height / 2) / scaleFactor;
            var maxX = (this.ARROW.postX - draftCanvas.width / 2) / scaleFactor;
            var maxY = (this.ARROW.postY - draftCanvas.height / 2) / scaleFactor;
            this.socket.emit("selectBots", {
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

            this.socket.emit("botCommand", {
                x: maxX,
                y: maxY
            });
        }

        this.rightClick = false;
        this.ARROW = null;
    });

    this.mainCanvas.addEventListener("mousemove", function (event) {
        if (this.ARROW) {
            this.ARROW.postX = event.x / mainCanvas.offsetWidth * 1000;
            this.ARROW.postY = event.y / mainCanvas.offsetHeight * 500;
        }
    });

};

Client.prototype.initLists = function () {
    this.FACTION_LIST = {};
    this.FACTION_ARRAY = [];

    this.CONTROLLER_LIST = {};
    this.TILE_LIST = {};
    this.SHARD_LIST = {};
    this.LASER_LIST = {};
    this.HOME_LIST = {};
    this.ANIMATION_LIST = {};
};

Client.prototype.initSocket = function () {
    this.socket = io();
    this.socket.verified = false;

    this.socket.on('addFactionsUI', this.addFactionstoUI.bind(this));
    this.socket.on('updateEntities', this.handlePacket.bind(this));
    this.socket.on('drawScene', this.drawScene.bind(this));
};

Client.prototype.initViewer = function () {
    this.keys = [];
    this.scaleFactor = 1;
    this.mainScaleFactor = 1;
};


Client.prototype.addFactionstoUI = function (data) {
    if (!this.socket.verified) {
        console.log("VERIFIED");
        this.socket.emit("verify", {});
        this.socket.verified = true;
    }
    var factions = document.getElementById('factions');
    var packet = data.factions;

    for (var i = 0; i < packet.length; i++) {
        var name = packet[i];
        var option = document.createElement('option');
        option.value = name;
        factions.appendChild(option);
    }
};

Client.prototype.handlePacket = function (data) {
    console.log("HANDLING PACKET");
    var packet, i;
    for (i = 0; i < data.length; i++) {
        packet = data[i];
        switch (packet.master) {
            case "add":
                this.addEntities(packet);
                break;
            case "delete":
                this.deleteEntities(packet);
                break;
            case "update":
                this.updateEntities(packet);
                break;
        }
    }
};

Client.prototype.updateEntities = function (packet) {
    function updateEntity(packet, list) {
        if (!packet) {
            return;
        }
        var entity = list[packet.id];
        if (!entity) {
            return;
        }
        entity.update(packet);
    }

    switch (packet.class) {
        case "controllerInfo":
            updateEntity(packet, this.CONTROLLER_LIST);
            break;
        case "tileInfo":
            updateEntity(packet, this.TILE_LIST);
            break;
        case "shardInfo":
            updateEntity(packet, this.SHARD_LIST);
            break;
        case "homeInfo":
            updateEntity(packet, this.HOME_LIST);
            break;
        case "factionInfo":
            updateEntity(packet, this.FACTION_LIST);
            break;
        case "UIInfo":
            if (this.SELFID === packet.playerId) {
                updateUI(packet);
            }
            break;
    }
};

Client.prototype.deleteEntities = function (packet) {
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
            deleteEntity(packet, this.TILE_LIST);
            break;
        case "controllerInfo":
            deleteEntity(packet, this.CONTROLLER_LIST);
            break;
        case "shardInfo":
            deleteEntity(packet, this.SHARD_LIST);
            break;
        case "homeInfo":
            deleteEntity(packet, this.HOME_LIST);
            break;
        case "factionInfo":
            deleteEntity(packet, this.FACTION_LIST, this.FACTION_ARRAY);
            drawLeaderBoard();
            break;
        case "animationInfo":
            deleteEntity(packet, this.ANIMATION_LIST);
            break;
        case "laserInfo":
            deleteEntity(packet, this.LASER_LIST);
            break;
        case "bracketInfo":
            if (this.SELFID === packet.id) {
                BRACKET = null;
            }
            break;
        case "UIInfo":
            if (this.SELFID === packet.id) {
                closeUI(packet.action);
            }
            break;
    }
};

Client.prototype.addEntities = function (packet) {
    var addEntity = function (packet, list, entity, array) {

        console.log(entity);

        if (!packet) {
            return;
        }
        list[packet.id] = new entity(packet);
        if (array && findWithAttr(array, "id", packet.id) === -1) {
            array.push(list[packet.id]);
        }
    };
    switch (packet.class) {
        case "tileInfo":
            addEntity(packet, this.TILE_LIST, Entity.Tile);
            break;
        case "controllerInfo":
            addEntity(packet, this.CONTROLLER_LIST, Entity.Controller);
            break;
        case "shardInfo":
            addEntity(packet, this.SHARD_LIST, Entity.Shard);
            break;
        case "laserInfo":
            addEntity(packet, this.LASER_LIST, Entity.Laser);
            break;
        case "homeInfo":
            addEntity(packet, this.HOME_LIST, Entity.Home);
            break;
        case "factionInfo":
            addEntity(packet, this.FACTION_LIST, Entity.Faction, this.FACTION_ARRAY);
            drawLeaderBoard();
            break;
        case "animationInfo":
            addEntity(packet, this.ANIMATION_LIST, Entity.Animation);
            break;
        case "bracketInfo":
            if (SELFID === packet.playerId) {
                this.BRACKET = new Entity.Bracket(packet);
            }
            break;
        case "UIInfo":
            if (this.SELFID === packet.playerId) {
                openUI(packet);
            }
            break;
        case "this.SELFID":
            this.SELFID = packet.this.SELFID;
            break;
    }
};

Client.prototype.updateFactionsList = function () {
    var factionSort = function (a, b) {
        return a.size - b.size;
    };

};

Client.prototype.drawScene = function (data) {
    var selfPlayer = this.CONTROLLER_LIST[this.SELFID];
    if (!selfPlayer) {
        return;
    }

    var inBounds = function (player, x, y) {
        var range = mainCanvas.width / (1.2 * this.scaleFactor);
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
        for (var id in this.CONTROLLER_LIST) {
            var controller = this.CONTROLLER_LIST[id], i;
            draftCtx.fillStyle = "rgba(123,0,0," + controller.health / (4 * controller.maxHealth) + ")";
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
        for (var id in this.TILE_LIST) {
            var tile = this.TILE_LIST[id];
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
        for (var id in this.SHARD_LIST) {
            var shard = this.SHARD_LIST[id];
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
                var startTheta = getRandom(0, 0.2);
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
        for (id in this.LASER_LIST) {
            laser = this.LASER_LIST[id];
            target = this.CONTROLLER_LIST[laser.target];
            owner = this.CONTROLLER_LIST[laser.owner];
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
        for (var id in this.HOME_LIST) {
            var home = this.HOME_LIST[id];
            if (home.neighbors) {
                for (var i = 0; i < home.neighbors.length; i++) {
                    var neighbor = this.HOME_LIST[home.neighbors[i]];
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
        for (var id in this.HOME_LIST) {
            var home = this.HOME_LIST[id];

            draftCtx.beginPath();
            if (home.neighbors.length >= 4) {
                draftCtx.fillStyle = "#4169e1";
            } else {
                draftCtx.fillStyle = "#396a6d";
            }

            draftCtx.arc(home.x, home.y, home.radius, 0, 2 * Math.PI, false);
            draftCtx.fill();

            if (inBoundsClose(selfPlayer, home.x, home.y)) {
                if (home.faction)
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
        for (var id in this.FACTION_LIST) {
            var faction = this.FACTION_LIST[id];
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
        if (this.ARROW && this.ARROW.postX) {
            draftCtx.beginPath();
            draftCtx.strokeStyle = "#521522";

            var preX = selfPlayer.x + (this.ARROW.preX - draftCanvas.width / 2) / this.scaleFactor;
            var preY = selfPlayer.y + (this.ARROW.preY - draftCanvas.height / 2) / this.scaleFactor;

            var postX = selfPlayer.x + (this.ARROW.postX - draftCanvas.width / 2) / this.scaleFactor;
            var postY = selfPlayer.y + (this.ARROW.postY - draftCanvas.height / 2) / this.scaleFactor;

            draftCtx.fillRect(preX, preY, postX - preX, postY - preY);

            draftCtx.arc(postX, postY, 3, 0, 2 * Math.PI, true);
            draftCtx.stroke();
        }
    };

    var drawAnimations = function () {
        for (var id in this.ANIMATION_LIST) {
            var home;
            var animation = this.ANIMATION_LIST[id];
            if (animation.type === "addShard") {
                home = this.HOME_LIST[animation.id];
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
                home = this.HOME_LIST[animation.id];
                if (!home) {
                    delete this.ANIMATION_LIST[id];
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
                delete this.ANIMATION_LIST[id];
            }
        }
    };


    var translateScene = function () {
        draftCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.scaleFactor = lerp(this.scaleFactor, this.mainScaleFactor, 0.3);

        draftCtx.translate(mainCanvas.width / 2, mainCanvas.height / 2);
        draftCtx.scale(this.scaleFactor, this.scaleFactor);
        draftCtx.translate(-selfPlayer.x, -selfPlayer.y);
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
    drawFactions();
    drawAnimations();

    drawBracket();
    drawArrow();

    translateScene();
    mainCtx.drawImage(draftCanvas, 0, 0);
};






function lerp(a, b, ratio) {
    return a + ratio * (b - a);
}

function findWithAttr(array, attr, value) {
    for (var i = 0; i < array.length; i += 1) {
        if (array[i][attr] === value) {
            return i;
        }
    }
    return -1;
}

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

module.exports = Client;
},{"./entities":11}],2:[function(require,module,exports){
function Arrow(x, y) {
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
},{}],3:[function(require,module,exports){
function Bracket(bracketInfo) {
    var tile = TILE_LIST[bracketInfo.tileId];
    this.x = tile.x;
    this.y = tile.y;
    this.length = tile.length;
}
},{}],4:[function(require,module,exports){
function Controller(controllerInfo) {
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
    this.level = controllerInfo.level;
}

Controller.prototype.update = function (controller, controllerInfo) {
    this.x = controllerInfo.x;
    this.y = controllerInfo.y;
    this.health = controllerInfo.health;
    this.maxHealth = controllerInfo.maxHealth;
    this.selected = controllerInfo.selected;
    this.theta = controllerInfo.theta;
    this.level = controllerInfo.level;
};

Controller.prototype.show = function () {

};
},{}],5:[function(require,module,exports){
function Faction(factionInfo) {
    this.id = factionInfo.id;
    this.name = factionInfo.name;
    this.x = factionInfo.x;
    this.y = factionInfo.y;
    this.size = factionInfo.size;
}

Faction.prototype.update = function (faction, factionInfo) {
    this.x = factionInfo.x;
    this.y = factionInfo.y;
    this.size = factionInfo.size;


    FACTION_ARRAY.sort(factionSort);
    drawLeaderBoard(); //change this
};
},{}],6:[function(require,module,exports){
function Home(homeInfo) {
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

    this.unitDmg = homeInfo.unitDmg;
    this.unitSpeed = homeInfo.unitSpeed;
    this.unitArmor = homeInfo.unitArmor;
    this.queue = homeInfo.queue;
    this.bots = homeInfo.bots;
}


Home.prototype.update = function (homeInfo) {
    this.shards = homeInfo.shards;
    this.level = homeInfo.level;
    this.radius = homeInfo.radius;
    this.power = homeInfo.power;
    this.health = homeInfo.health;
    this.hasColor = homeInfo.hasColor;
    this.neighbors = homeInfo.neighbors;
    this.unitDmg = homeInfo.unitDmg;
    this.unitSpeed = homeInfo.unitSpeed;
    this.unitArmor = homeInfo.unitArmor;
    this.queue = homeInfo.queue;
    this.bots = homeInfo.bots;
};
},{}],7:[function(require,module,exports){
function Laser(laserInfo) {
    this.id = laserInfo.id;
    this.owner = laserInfo.owner;
    this.target = laserInfo.target;
}
},{}],8:[function(require,module,exports){
function MiniMap() {
}

MiniMap.prototype.draw = function () {
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
}; //deprecated

MiniMap.prototype.scaleImageData = function (imageData, scale, mainCtx) {
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
};
},{}],9:[function(require,module,exports){
function Shard(shardInfo) {
    this.id = shardInfo.id;
    this.x = shardInfo.x;
    this.y = shardInfo.y;
    this.name = shardInfo.name;
    this.visible = shardInfo.visible;
}

Shard.prototype.updateShards = function (shardInfo) {
    this.x = shardInfo.x;
    this.y = shardInfo.y;
    this.visible = shardInfo.visible;
    this.name = shardInfo.name;
};


Shard.prototype.show = function () {

};
},{}],10:[function(require,module,exports){
function Tile(tileInfo) {
    this.id = tileInfo.id;
    this.x = tileInfo.x;
    this.y = tileInfo.y;
    this.length = tileInfo.length;
    this.color = tileInfo.color;
    this.alert = tileInfo.alert;
    this.random = Math.floor(getRandom(0, 3));
}

Tile.prototype.update = function (tileInfo) {
    this.color = tileInfo.color;
    this.alert = tileInfo.alert;
};

Tile.prototype.show = function () {

};

},{}],11:[function(require,module,exports){
module.exports = {
    Arrow: require('./Arrow'),
    Bracket: require('./Bracket'),
    Controller: require('./Controller'),
    Faction: require('./Faction'),
    Home: require('./Home'),
    Laser: require('./Laser'),
    MiniMap: require('./MiniMap'),
    Shard: require('./Shard'),
    Tile: require('./Tile')
};
},{"./Arrow":2,"./Bracket":3,"./Controller":4,"./Faction":5,"./Home":6,"./Laser":7,"./MiniMap":8,"./Shard":9,"./Tile":10}],12:[function(require,module,exports){
var Client = require('./Client.js');
var MainUI = require('./ui/MainUI');

var client = new Client();
var mainUI = new MainUI(client, client.socket);


mainUI.playerNamerUI.open();
mainUI.gameUI.open();


document.onkeydown = function (event) {
    client.keys[event.keyCode] = true;
    client.socket.emit('keyEvent', {id: event.keyCode, state: true});
};

document.onkeyup = function (event) {
    client.keys[event.keyCode] = false;
    client.socket.emit('keyEvent', {id: event.keyCode, state: false});
};

document.addEventListener('contextmenu', function (e) { //prevent right-click context menu
    e.preventDefault();
}, false);
},{"./Client.js":1,"./ui/MainUI":15}],13:[function(require,module,exports){
function GameUI() {

}

GameUI.prototype.open = function () {
    var shardNamerPrompt = document.getElementById('shard_namer_prompt');
    shardNamerPrompt.addEventListener("click", function () {
        openShardNamerUI();
    });
};

module.exports =  GameUI;
},{}],14:[function(require,module,exports){
function HomeUI(client,socket) {
    this.client = client;
    this.socket = socket;
    this.template = document.getElementById('home_ui');
    this.home = null;
}

HomeUI.prototype.open = function (home) {
    this.template.style.display = 'block';
    this.home = home;

    this.addTabListeners();
    this.openHomeInfo();
    this.openUpgradesPage();
    this.openColorPicker(colorPicker);
};

HomeUI.prototype.openHomeInfo = function () {
    document.getElementById('home_type').innerHTML = this.home.type;
    document.getElementById('home_level').innerHTML = this.home.level;
    document.getElementById('home_health').innerHTML = this.home.health;
    document.getElementById('home_power').innerHTML = this.home.power;
    document.getElementById('home_faction_name').innerHTML = this.home.faction;
};

HomeUI.prototype.openUpgradesPage = function () {
    var unitUpgrades = document.getElementById("unit_upgrades");
    var bldBaseHealthBtn = document.getElementById('bld_home_btn');
    var bldArmorBtn = document.getElementById('bld_armor');
    var bldSpeedBtn = document.getElementById('bld_speed');
    var bldDmgBtn = document.getElementById('bld_damage');

    bldBaseHealthBtn.upgType = "homeHealth";
    bldArmorBtn.upgType = "armor";
    bldSpeedBtn.upgType = "speed";
    bldDmgBtn.upgType = "dmg";

    var bldHome = function () {
        this.socket.emit('buildHome', {
            home: this.home.id,
            shards: SELECTED_SHARDS
        })
    }.bind(this);

    var upgUnit = function () {
        this.socket.emit('upgradeUnit', {
            home: this.home.id,
            type: this.upgType,
            shards: SELECTED_SHARDS
        });
    }.bind(this);

    this.resetButton(bldBaseHealthBtn, bldHome);

    if (this.home.type === "Barracks") {
        unitUpgrades.style.display = "block";
        this.resetButton(bldArmorBtn, upgUnit);
        this.resetButton(bldSpeedBtn, upgUnit);
        this.resetButton(bldDmgBtn, upgUnit);
    }
    else {
        unitUpgrades.style.display = "none";
    }


};

HomeUI.prototype.openCreatePage = function () {
    var createBot = document.getElementById("create_bot_container");
    var buildQueue = document.getElementById('build_queue');
    var makeBotsBtn = document.getElementById('make_bots_btn');

    var makeBots = function () {
        console.log(SELECTED_SHARDS);
        socket.emit('makeBots', {
            home: this.home.id,
            shards: SELECTED_SHARDS
        });
    };

    buildQueue.addEventListener('scroll', function (event) {
        this.client.LIST_SCROLL = true;
    });

    if (this.home.type === "Barracks") {
        console.log("RESETTING MAKE_BOTS");
        this.resetButton(makeBotsBtn, makeBots);
        createBot.style.display = "flex";
    } else {
        createBot.style.display = "none";
    }

    addQueueInfo(buildQueue, home);
};

HomeUI.prototype.openBotsPage = function () {
    var botsList = document.getElementById('bots_list');
    if (this.home.type === "Barracks") {
        addBots(botsList, home);
    }
};

HomeUI.prototype.openColorPicker = function (colorPicker, home) {
    var colorCanvas = document.getElementById("color_canvas");
    var colorCtx = colorCanvas.getContext("2d");

    colorCanvas.width = 100;
    colorCanvas.height = 100;

    if (!home.hasColor && home.level > 1) {
        colorPicker.style.display = "block";
    }
    else {
        colorPicker.style.display = "none";
        return;
    }
    var colors = new Image();
    colors.src = 'colors.jpg';
    colors.onload = function () {
        colorCtx.fillStyle = "#333eee";
        colorCtx.fillRect(0, 0, colorCanvas.width / 2, colorCanvas.height / 2);
        colorCtx.fillStyle = "#623eee";
        colorCtx.fillRect(colorCanvas.width / 2, colorCanvas.height / 2, colorCanvas.width, colorCanvas.height);
    };

    colorCanvas.addEventListener('mouseup', function (event) {
        var rect = colorCanvas.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;
        var img_data = colorCtx.getImageData(x, y, 100, 100).data;
        this.socket.emit("newColor", {
            home: home.id,
            color: {
                r: img_data[0],
                g: img_data[1],
                b: img_data[2]
            }
        });
    });
};



HomeUI.prototype.addTabListeners = function () {
    var upgradesPage = document.getElementById("upgrades_page");
    var createPage = document.getElementById("create_page");
    var botsPage = document.getElementById("bots_page");

    var upgradesTab = document.getElementById('upgrades_tab');
    var createTab = document.getElementById('create_tab');
    var botsTab = document.getElementById('bots_tab');

    upgradesTab.addEventListener('click', function (evt) {
        upgradesPage.style.display = "block";
        createPage.style.display = "none";
        botsPage.style.display = "none";
        this.openUpgradesPage();
    });

    createTab.addEventListener('click', function (evt) {
        upgradesPage.style.display = "none";
        createPage.style.display = "block";
        botsPage.style.display = "none";
        this.openCreatePage();
    });

    botsTab.addEventListener('click', function (evt) {
        upgradesPage.style.display = "none";
        createPage.style.display = "none";
        botsPage.style.display = "block";
        this.openBotsPage();
    });
};


HomeUI.prototype.addShards = function (lists) {
    var checkSelection = function () {
        var bldBaseHealthBtn = document.getElementById('bld_home_btn');
        var makeBotsBtn = document.getElementById('make_bots_btn');
        var bldArmorBtn = document.getElementById('bld_armor');
        var bldSpeedBtn = document.getElementById('bld_speed');
        var bldDmgBtn = document.getElementById('bld_damage');

        if (Object.size(SELECTED_SHARDS) > 0) {
            bldBaseHealthBtn.disabled = false;
            bldArmorBtn.disabled = false;
            bldSpeedBtn.disabled = false;
            bldDmgBtn.disabled = false;
            makeBotsBtn.disabled = false;
        } else {
            bldBaseHealthBtn.disabled = "disabled";
            bldArmorBtn.disabled = "disabled";
            bldSpeedBtn.disabled = "disabled";
            bldDmgBtn.disabled = "disabled";
            makeBotsBtn.disabled = "disabled";
        }
    };
    for (var i = 0; i < lists.length; i++) {
        var list = lists[i];
        checkSelection();
        list.innerHTML = "";
        for (var j = 0; j < home.shards.length; j++) {
            var entry = document.createElement('li');
            var shard = SHARD_LIST[home.shards[j]];
            entry.id = shard.id;

            (function (_id) {
                entry.addEventListener("click", function () {
                    if (!this.clicked) {
                        this.clicked = true;
                        this.style.background = "#fffb22";
                        SELECTED_SHARDS[_id] = _id;
                        checkSelection();
                    }
                    else {
                        this.clicked = false;
                        this.style.background = "#542fce";
                        delete SELECTED_SHARDS[_id];
                        checkSelection();
                    }
                });
            })(entry.id);


            entry.appendChild(document.createTextNode(shard.name));
            list.appendChild(entry);
        }
        list.addEventListener('scroll', function (event) {
            LIST_SCROLL = true;
        });
    }
};

HomeUI.prototype.addBots = function (list, home) {
    list.innerHTML = "";
    for (var i = 0; i < home.bots.length; i++) {
        var botInfo = home.bots[i];
        var entry = document.createElement('li');
        entry.appendChild(document.createTextNode(
            botInfo.name + " -- LEVEL:" + botInfo.level));
        list.appendChild(entry);
    }
};

HomeUI.prototype.resetButton = function (button, callback) {
    var setSkillMeter = function (button) {
        var findChildCanvas = function (skillDiv) {
            for (var i = 0; i < skillDiv.childNodes.length; i++) {
                if (skillDiv.childNodes[i].nodeName.toLowerCase() === "canvas") {
                    return skillDiv.childNodes[i];
                }
            }
            return null;
        };

        var canvas = findChildCanvas(button.parentNode);
        canvas.width = 260;
        canvas.height = 100;
        var ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, 1000, 200);
        var magnitude = 0;
        ctx.fillStyle = "#FFFFFF";
        switch (button.upgType) {
            case "homeHealth":
                magnitude = this.home.power;
                break;
            case "dmg":
                magnitude = this.home.unitDmg;
                break;
            case "armor":
                magnitude = this.home.unitArmor;
                break;
            case "speed":
                magnitude = this.home.unitSpeed;
                break;

        }
        ctx.fillRect(0, 0, magnitude * 10, 200);
    };
    var newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    button = newButton;
    button.addEventListener('click', callback);
    if (button.upgType) {
        setSkillMeter(button);
    }
};

module.exports = HomeUI;

},{}],15:[function(require,module,exports){
document.documentElement.style.overflow = 'hidden';  // firefox, chrome
document.body.scroll = "no";
var PlayerNamerUI = require('./PlayerNamerUI');
var ShardNamerUI = require('./ShardNamerUI');
var GameUI = require('./GameUI');
var HomeUI = require("./HomeUI");


function MainUI(client, socket) {
    this.client = client;
    this.socket = socket;
    this.SELECTED_SHARDS = {};
    this.LIST_SCROLL = false;

    this.playerNamerUI = new PlayerNamerUI(this.client, this.socket);
    this.gameUI = new GameUI(this.client, this.socket);
    this.shardNamerUI = new ShardNamerUI(this.client, this.socket);
    this.homeUI = new HomeUI(this.client, this.socket);
}

MainUI.prototype.openUI = function (info) {
    var action = info.action;
    var home;

    if (action === "name shard") {
        this.shardNamerUI.open();
    }
    if (action === "home info") {
        home = HOME_LIST[info.homeId];
        this.homeUI.open();
    }
};


MainUI.prototype.closeUI = function (action) {
    var shardNamer = document.getElementById('shard_namer_ui');
    var homeInfo = document.getElementById('home_ui');

    if (action === "name shard") {
        shardNamer.close();
    }
    if (action === "home info") {
        LIST_SCROLL = false;
        homeInfo.style.display = 'none';
        socket.emit("removeViewer", {});
    }
};


MainUI.prototype.updateLeaderBoard = function () {
    var leaderboard = document.getElementById("leaderboard");
    leaderboard.innerHTML = "";
    for (var i = FACTION_ARRAY.length - 1; i >= 0; i--) {
        var faction = FACTION_ARRAY[i];

        var entry = document.createElement('li');
        entry.appendChild(document.createTextNode(faction.name));
        leaderboard.appendChild(entry);
    }
};




/** DEPRECATED METHODS **/
MainUI.prototype.updateUI = function (info) {
    var action = info.action;
    var home;
    if (action === "update queue") {
        var buildQueue = document.getElementById('build_queue');
        home = HOME_LIST[info.homeId];
        addQueueInfo(buildQueue, home);
    }
};

function addQueueInfo(list, home) {
    list.innerHTML = "";
    if (!home.queue) {
        return;
    }
    for (var i = 0; i < home.queue.length; i++) {
        var buildInfo = home.queue[i];
        var entry = document.createElement('li');
        entry.id = Math.random();

        (function (_id) {
            entry.addEventListener("click", function () {
                if (!this.clicked) {
                    this.clicked = true;
                    this.style.background = "#fffb22";
                }
                else {
                    this.clicked = false;
                    this.style.background = "#542fce";
                }
            });
        })(entry.id);

        entry.appendChild(document.createTextNode(
            buildInfo.shardName + " -- " + Math.floor(buildInfo.timer / 1000) +
            ":" + Math.floor(buildInfo.timer % 1000)));
        list.appendChild(entry);
    }
}


module.exports = MainUI;
},{"./GameUI":13,"./HomeUI":14,"./PlayerNamerUI":16,"./ShardNamerUI":17}],16:[function(require,module,exports){
function PlayerNamerUI (client, socket) {
    this.client = client;
    this.socket = socket;

    this.leaderboard = document.getElementById("leaderboard_container");
    this.nameBtn = document.getElementById("nameSubmit");
    this.playerNameInput = document.getElementById("playerNameInput");
    this.factionNameInput = document.getElementById("factionNameInput");
    this.playerNamer = document.getElementById("player_namer");
}

PlayerNamerUI.prototype.open = function () {

    this.playerNameInput.addEventListener("keyup", function (event) {
        event.preventDefault();
        if (event.keyCode === 13) {
            this.factionNameInput.focus();
        }
    }.bind(this));

    this.factionNameInput.addEventListener("keyup", function (event) {
        event.preventDefault();
        if (event.keyCode === 13) {
            this.nameBtn.click();
        }
    }.bind(this));

    this.nameBtn.addEventListener("click", function () {
        this.client.mainCanvas.style.visibility = "visible";
        this.leaderboard.style.visibility = "visible";
        this.socket.emit("newPlayer",
            {
                name: this.playerNameInput.value,
                faction: this.factionNameInput.value
            });
        this.playerNamer.style.display = 'none';
    }.bind(this));

    this.playerNamer.style.visibility = "visible";
    this.playerNameInput.focus();
    this.leaderboard.style.visibility = "hidden";
};

module.exports = PlayerNamerUI;
},{}],17:[function(require,module,exports){
var ui = require('./ShardNamerUI');

function ShardNamerUI(client, socket) {
    this.client = client;
    this.socket = socket;

    this.shardNamer = document.getElementById('shard_namer_ui');
    this.textInput = document.getElementById("textInput");
    this.nameShardBtn = document.getElementById("nameShardBtn");
}

ShardNamerUI.prototype.open = function () {
    var shardNamer = document.getElementById('shard_namer_ui');
    var textInput = document.getElementById("textInput");
    var nameShardBtn = document.getElementById("nameShardBtn");

    shardNamer.style.display = 'block';

    document.addEventListener("keyup", this.focusTextInput);

    textInput.addEventListener("keyup", function (event) {
        event.preventDefault();
        if (event.keyCode === 13) {
            var text = document.getElementById("textInput").value;
            if (text !== null && text !== "") {
                this.socket.emit('textInput',
                    {
                        id: selfId,
                        word: text
                    }
                )
            }
            ui.closeUI("name shard");
        }
    });
};

ShardNamerUI.prototype.focusTextInput = function (event) {
    event.preventDefault();
    if (event.keyCode === 13) {
        textInput.focus();
        document.removeEventListener("keyup", focusTextInput);
    }
};

ShardNamerUI.prototype.close = function () {
    this.textInput.value = "";
    this.template.style.display = 'none';
};

module.exports = ShardNamerUI;

},{"./ShardNamerUI":17}]},{},[12])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY2xpZW50L2pzL0NsaWVudC5qcyIsInNyYy9jbGllbnQvanMvZW50aXRpZXMvQXJyb3cuanMiLCJzcmMvY2xpZW50L2pzL2VudGl0aWVzL0JyYWNrZXQuanMiLCJzcmMvY2xpZW50L2pzL2VudGl0aWVzL0NvbnRyb2xsZXIuanMiLCJzcmMvY2xpZW50L2pzL2VudGl0aWVzL0ZhY3Rpb24uanMiLCJzcmMvY2xpZW50L2pzL2VudGl0aWVzL0hvbWUuanMiLCJzcmMvY2xpZW50L2pzL2VudGl0aWVzL0xhc2VyLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdGllcy9NaW5pTWFwLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdGllcy9TaGFyZC5qcyIsInNyYy9jbGllbnQvanMvZW50aXRpZXMvVGlsZS5qcyIsInNyYy9jbGllbnQvanMvZW50aXRpZXMvaW5kZXguanMiLCJzcmMvY2xpZW50L2pzL2luZGV4LmpzIiwic3JjL2NsaWVudC9qcy91aS9HYW1lVUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL0hvbWVVSS5qcyIsInNyYy9jbGllbnQvanMvdWkvTWFpblVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9QbGF5ZXJOYW1lclVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9TaGFyZE5hbWVyVUkuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzb0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBFbnRpdHkgPSByZXF1aXJlKCcuL2VudGl0aWVzJyk7XHJcblxyXG5mdW5jdGlvbiBDbGllbnQoKSB7XHJcbiAgICB0aGlzLlNFTEZJRCA9IG51bGw7XHJcbiAgICB0aGlzLkFSUk9XID0gbnVsbDtcclxuICAgIHRoaXMuQlJBQ0tFVCA9IG51bGw7XHJcbiAgICB0aGlzLnNlcnZlck1hcCA9IG51bGw7XHJcbiAgICB0aGlzLm1hcFRpbWVyID0gMDtcclxuICAgIHRoaXMucmlnaHRDbGljayA9IGZhbHNlO1xyXG4gICAgdGhpcy5pbml0KCk7XHJcbn1cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuaW5pdFNvY2tldCgpO1xyXG4gICAgdGhpcy5pbml0Q2FudmFzZXMoKTtcclxuICAgIHRoaXMuaW5pdExpc3RzKCk7XHJcbiAgICB0aGlzLmluaXRWaWV3ZXIoKTtcclxufTtcclxuXHJcblxyXG5DbGllbnQucHJvdG90eXBlLmluaXRDYW52YXNlcyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMubWFpbkNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibWFpbl9jYW52YXNcIik7XHJcbiAgICB0aGlzLmRyYWZ0Q2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTtcclxuICAgIHRoaXMubU1hcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7XHJcbiAgICB0aGlzLm1NYXBSb3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpO1xyXG5cclxuICAgIHRoaXMubWFpbkNhbnZhcy5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgIHRoaXMuZHJhZnRDYW52YXMuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG4gICAgdGhpcy5tTWFwLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuICAgIHRoaXMubU1hcFJvdC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcblxyXG4gICAgdGhpcy5kcmFmdENhbnZhcy5oZWlnaHQgPSB0aGlzLm1haW5DYW52YXMuaGVpZ2h0O1xyXG4gICAgdGhpcy5kcmFmdENhbnZhcy53aWR0aCA9IHRoaXMubWFpbkNhbnZhcy53aWR0aDtcclxuICAgIHRoaXMubU1hcC5oZWlnaHQgPSA1MDA7XHJcbiAgICB0aGlzLm1NYXAud2lkdGggPSA1MDA7XHJcbiAgICB0aGlzLm1NYXBSb3QuaGVpZ2h0ID0gNTAwO1xyXG4gICAgdGhpcy5tTWFwUm90LndpZHRoID0gNTAwO1xyXG5cclxuICAgIHRoaXMubWFpbkN0eCA9IHRoaXMubWFpbkNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XHJcbiAgICB0aGlzLmRyYWZ0Q3R4ID0gdGhpcy5kcmFmdENhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XHJcbiAgICB0aGlzLm1NYXBDdHggPSB0aGlzLm1NYXAuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG4gICAgdGhpcy5tTWFwQ3R4Um90ID0gdGhpcy5tTWFwUm90LmdldENvbnRleHQoXCIyZFwiKTtcclxuXHJcbiAgICB0aGlzLm1haW5DYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBpZiAoZXZlbnQuYnV0dG9uID09PSAyKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmlnaHRDbGljayA9IHRydWU7XHJcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLkNPTlRST0xMRVJfTElTVFt0aGlzLlNFTEZJRF0pIHtcclxuICAgICAgICAgICAgdGhpcy5BUlJPVyA9IG5ldyBBcnJvdyhldmVudC54IC8gbWFpbkNhbnZhcy5vZmZzZXRXaWR0aCAqIDEwMDAsXHJcbiAgICAgICAgICAgICAgICBldmVudC55IC8gbWFpbkNhbnZhcy5vZmZzZXRIZWlnaHQgKiA1MDApO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMubWFpbkNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBpZiAoIXJpZ2h0Q2xpY2spIHtcclxuICAgICAgICAgICAgdGhpcy5BUlJPVy5wb3N0WCA9IGV2ZW50LnggLyBtYWluQ2FudmFzLm9mZnNldFdpZHRoICogMTAwMDtcclxuICAgICAgICAgICAgdGhpcy5BUlJPVy5wb3N0WSA9IGV2ZW50LnkgLyBtYWluQ2FudmFzLm9mZnNldEhlaWdodCAqIDUwMDtcclxuXHJcbiAgICAgICAgICAgIHZhciBtaW5YID0gKHRoaXMuQVJST1cucHJlWCAtIGRyYWZ0Q2FudmFzLndpZHRoIC8gMikgLyBzY2FsZUZhY3RvcjtcclxuICAgICAgICAgICAgdmFyIG1pblkgPSAodGhpcy5BUlJPVy5wcmVZIC0gZHJhZnRDYW52YXMuaGVpZ2h0IC8gMikgLyBzY2FsZUZhY3RvcjtcclxuICAgICAgICAgICAgdmFyIG1heFggPSAodGhpcy5BUlJPVy5wb3N0WCAtIGRyYWZ0Q2FudmFzLndpZHRoIC8gMikgLyBzY2FsZUZhY3RvcjtcclxuICAgICAgICAgICAgdmFyIG1heFkgPSAodGhpcy5BUlJPVy5wb3N0WSAtIGRyYWZ0Q2FudmFzLmhlaWdodCAvIDIpIC8gc2NhbGVGYWN0b3I7XHJcbiAgICAgICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJzZWxlY3RCb3RzXCIsIHtcclxuICAgICAgICAgICAgICAgIG1pblg6IG1pblgsXHJcbiAgICAgICAgICAgICAgICBtaW5ZOiBtaW5ZLFxyXG4gICAgICAgICAgICAgICAgbWF4WDogbWF4WCxcclxuICAgICAgICAgICAgICAgIG1heFk6IG1heFlcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICB2YXIgeCA9IGV2ZW50LnggLyBtYWluQ2FudmFzLm9mZnNldFdpZHRoICogMTAwMDtcclxuICAgICAgICAgICAgdmFyIHkgPSBldmVudC55IC8gbWFpbkNhbnZhcy5vZmZzZXRIZWlnaHQgKiA1MDA7XHJcbiAgICAgICAgICAgIG1heFggPSAoeCAtIGRyYWZ0Q2FudmFzLndpZHRoIC8gMikgLyBzY2FsZUZhY3RvcjtcclxuICAgICAgICAgICAgbWF4WSA9ICh5IC0gZHJhZnRDYW52YXMuaGVpZ2h0IC8gMikgLyBzY2FsZUZhY3RvcjtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJib3RDb21tYW5kXCIsIHtcclxuICAgICAgICAgICAgICAgIHg6IG1heFgsXHJcbiAgICAgICAgICAgICAgICB5OiBtYXhZXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5yaWdodENsaWNrID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5BUlJPVyA9IG51bGw7XHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLm1haW5DYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBpZiAodGhpcy5BUlJPVykge1xyXG4gICAgICAgICAgICB0aGlzLkFSUk9XLnBvc3RYID0gZXZlbnQueCAvIG1haW5DYW52YXMub2Zmc2V0V2lkdGggKiAxMDAwO1xyXG4gICAgICAgICAgICB0aGlzLkFSUk9XLnBvc3RZID0gZXZlbnQueSAvIG1haW5DYW52YXMub2Zmc2V0SGVpZ2h0ICogNTAwO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG5cclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdExpc3RzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5GQUNUSU9OX0xJU1QgPSB7fTtcclxuICAgIHRoaXMuRkFDVElPTl9BUlJBWSA9IFtdO1xyXG5cclxuICAgIHRoaXMuQ09OVFJPTExFUl9MSVNUID0ge307XHJcbiAgICB0aGlzLlRJTEVfTElTVCA9IHt9O1xyXG4gICAgdGhpcy5TSEFSRF9MSVNUID0ge307XHJcbiAgICB0aGlzLkxBU0VSX0xJU1QgPSB7fTtcclxuICAgIHRoaXMuSE9NRV9MSVNUID0ge307XHJcbiAgICB0aGlzLkFOSU1BVElPTl9MSVNUID0ge307XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLmluaXRTb2NrZXQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnNvY2tldCA9IGlvKCk7XHJcbiAgICB0aGlzLnNvY2tldC52ZXJpZmllZCA9IGZhbHNlO1xyXG5cclxuICAgIHRoaXMuc29ja2V0Lm9uKCdhZGRGYWN0aW9uc1VJJywgdGhpcy5hZGRGYWN0aW9uc3RvVUkuYmluZCh0aGlzKSk7XHJcbiAgICB0aGlzLnNvY2tldC5vbigndXBkYXRlRW50aXRpZXMnLCB0aGlzLmhhbmRsZVBhY2tldC5iaW5kKHRoaXMpKTtcclxuICAgIHRoaXMuc29ja2V0Lm9uKCdkcmF3U2NlbmUnLCB0aGlzLmRyYXdTY2VuZS5iaW5kKHRoaXMpKTtcclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdFZpZXdlciA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMua2V5cyA9IFtdO1xyXG4gICAgdGhpcy5zY2FsZUZhY3RvciA9IDE7XHJcbiAgICB0aGlzLm1haW5TY2FsZUZhY3RvciA9IDE7XHJcbn07XHJcblxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5hZGRGYWN0aW9uc3RvVUkgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgaWYgKCF0aGlzLnNvY2tldC52ZXJpZmllZCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiVkVSSUZJRURcIik7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQuZW1pdChcInZlcmlmeVwiLCB7fSk7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQudmVyaWZpZWQgPSB0cnVlO1xyXG4gICAgfVxyXG4gICAgdmFyIGZhY3Rpb25zID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZhY3Rpb25zJyk7XHJcbiAgICB2YXIgcGFja2V0ID0gZGF0YS5mYWN0aW9ucztcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhY2tldC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciBuYW1lID0gcGFja2V0W2ldO1xyXG4gICAgICAgIHZhciBvcHRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdvcHRpb24nKTtcclxuICAgICAgICBvcHRpb24udmFsdWUgPSBuYW1lO1xyXG4gICAgICAgIGZhY3Rpb25zLmFwcGVuZENoaWxkKG9wdGlvbik7XHJcbiAgICB9XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLmhhbmRsZVBhY2tldCA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICBjb25zb2xlLmxvZyhcIkhBTkRMSU5HIFBBQ0tFVFwiKTtcclxuICAgIHZhciBwYWNrZXQsIGk7XHJcbiAgICBmb3IgKGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHBhY2tldCA9IGRhdGFbaV07XHJcbiAgICAgICAgc3dpdGNoIChwYWNrZXQubWFzdGVyKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJhZGRcIjpcclxuICAgICAgICAgICAgICAgIHRoaXMuYWRkRW50aXRpZXMocGFja2V0KTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwiZGVsZXRlXCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRlbGV0ZUVudGl0aWVzKHBhY2tldCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcInVwZGF0ZVwiOlxyXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVFbnRpdGllcyhwYWNrZXQpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS51cGRhdGVFbnRpdGllcyA9IGZ1bmN0aW9uIChwYWNrZXQpIHtcclxuICAgIGZ1bmN0aW9uIHVwZGF0ZUVudGl0eShwYWNrZXQsIGxpc3QpIHtcclxuICAgICAgICBpZiAoIXBhY2tldCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBlbnRpdHkgPSBsaXN0W3BhY2tldC5pZF07XHJcbiAgICAgICAgaWYgKCFlbnRpdHkpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbnRpdHkudXBkYXRlKHBhY2tldCk7XHJcbiAgICB9XHJcblxyXG4gICAgc3dpdGNoIChwYWNrZXQuY2xhc3MpIHtcclxuICAgICAgICBjYXNlIFwiY29udHJvbGxlckluZm9cIjpcclxuICAgICAgICAgICAgdXBkYXRlRW50aXR5KHBhY2tldCwgdGhpcy5DT05UUk9MTEVSX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwidGlsZUluZm9cIjpcclxuICAgICAgICAgICAgdXBkYXRlRW50aXR5KHBhY2tldCwgdGhpcy5USUxFX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwic2hhcmRJbmZvXCI6XHJcbiAgICAgICAgICAgIHVwZGF0ZUVudGl0eShwYWNrZXQsIHRoaXMuU0hBUkRfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJob21lSW5mb1wiOlxyXG4gICAgICAgICAgICB1cGRhdGVFbnRpdHkocGFja2V0LCB0aGlzLkhPTUVfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJmYWN0aW9uSW5mb1wiOlxyXG4gICAgICAgICAgICB1cGRhdGVFbnRpdHkocGFja2V0LCB0aGlzLkZBQ1RJT05fTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJVSUluZm9cIjpcclxuICAgICAgICAgICAgaWYgKHRoaXMuU0VMRklEID09PSBwYWNrZXQucGxheWVySWQpIHtcclxuICAgICAgICAgICAgICAgIHVwZGF0ZVVJKHBhY2tldCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLmRlbGV0ZUVudGl0aWVzID0gZnVuY3Rpb24gKHBhY2tldCkge1xyXG4gICAgdmFyIGRlbGV0ZUVudGl0eSA9IGZ1bmN0aW9uIChwYWNrZXQsIGxpc3QsIGFycmF5KSB7XHJcbiAgICAgICAgaWYgKCFwYWNrZXQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoYXJyYXkpIHtcclxuICAgICAgICAgICAgdmFyIGluZGV4ID0gZmluZFdpdGhBdHRyKGFycmF5LCBcImlkXCIsIHBhY2tldC5pZCk7XHJcbiAgICAgICAgICAgIGFycmF5LnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGRlbGV0ZSBsaXN0W3BhY2tldC5pZF07XHJcbiAgICB9O1xyXG5cclxuICAgIHN3aXRjaCAocGFja2V0LmNsYXNzKSB7XHJcbiAgICAgICAgY2FzZSBcInRpbGVJbmZvXCI6XHJcbiAgICAgICAgICAgIGRlbGV0ZUVudGl0eShwYWNrZXQsIHRoaXMuVElMRV9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImNvbnRyb2xsZXJJbmZvXCI6XHJcbiAgICAgICAgICAgIGRlbGV0ZUVudGl0eShwYWNrZXQsIHRoaXMuQ09OVFJPTExFUl9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcInNoYXJkSW5mb1wiOlxyXG4gICAgICAgICAgICBkZWxldGVFbnRpdHkocGFja2V0LCB0aGlzLlNIQVJEX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiaG9tZUluZm9cIjpcclxuICAgICAgICAgICAgZGVsZXRlRW50aXR5KHBhY2tldCwgdGhpcy5IT01FX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiZmFjdGlvbkluZm9cIjpcclxuICAgICAgICAgICAgZGVsZXRlRW50aXR5KHBhY2tldCwgdGhpcy5GQUNUSU9OX0xJU1QsIHRoaXMuRkFDVElPTl9BUlJBWSk7XHJcbiAgICAgICAgICAgIGRyYXdMZWFkZXJCb2FyZCgpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiYW5pbWF0aW9uSW5mb1wiOlxyXG4gICAgICAgICAgICBkZWxldGVFbnRpdHkocGFja2V0LCB0aGlzLkFOSU1BVElPTl9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImxhc2VySW5mb1wiOlxyXG4gICAgICAgICAgICBkZWxldGVFbnRpdHkocGFja2V0LCB0aGlzLkxBU0VSX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiYnJhY2tldEluZm9cIjpcclxuICAgICAgICAgICAgaWYgKHRoaXMuU0VMRklEID09PSBwYWNrZXQuaWQpIHtcclxuICAgICAgICAgICAgICAgIEJSQUNLRVQgPSBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJVSUluZm9cIjpcclxuICAgICAgICAgICAgaWYgKHRoaXMuU0VMRklEID09PSBwYWNrZXQuaWQpIHtcclxuICAgICAgICAgICAgICAgIGNsb3NlVUkocGFja2V0LmFjdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLmFkZEVudGl0aWVzID0gZnVuY3Rpb24gKHBhY2tldCkge1xyXG4gICAgdmFyIGFkZEVudGl0eSA9IGZ1bmN0aW9uIChwYWNrZXQsIGxpc3QsIGVudGl0eSwgYXJyYXkpIHtcclxuXHJcbiAgICAgICAgY29uc29sZS5sb2coZW50aXR5KTtcclxuXHJcbiAgICAgICAgaWYgKCFwYWNrZXQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsaXN0W3BhY2tldC5pZF0gPSBuZXcgZW50aXR5KHBhY2tldCk7XHJcbiAgICAgICAgaWYgKGFycmF5ICYmIGZpbmRXaXRoQXR0cihhcnJheSwgXCJpZFwiLCBwYWNrZXQuaWQpID09PSAtMSkge1xyXG4gICAgICAgICAgICBhcnJheS5wdXNoKGxpc3RbcGFja2V0LmlkXSk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIHN3aXRjaCAocGFja2V0LmNsYXNzKSB7XHJcbiAgICAgICAgY2FzZSBcInRpbGVJbmZvXCI6XHJcbiAgICAgICAgICAgIGFkZEVudGl0eShwYWNrZXQsIHRoaXMuVElMRV9MSVNULCBFbnRpdHkuVGlsZSk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJjb250cm9sbGVySW5mb1wiOlxyXG4gICAgICAgICAgICBhZGRFbnRpdHkocGFja2V0LCB0aGlzLkNPTlRST0xMRVJfTElTVCwgRW50aXR5LkNvbnRyb2xsZXIpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwic2hhcmRJbmZvXCI6XHJcbiAgICAgICAgICAgIGFkZEVudGl0eShwYWNrZXQsIHRoaXMuU0hBUkRfTElTVCwgRW50aXR5LlNoYXJkKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImxhc2VySW5mb1wiOlxyXG4gICAgICAgICAgICBhZGRFbnRpdHkocGFja2V0LCB0aGlzLkxBU0VSX0xJU1QsIEVudGl0eS5MYXNlcik7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJob21lSW5mb1wiOlxyXG4gICAgICAgICAgICBhZGRFbnRpdHkocGFja2V0LCB0aGlzLkhPTUVfTElTVCwgRW50aXR5LkhvbWUpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiZmFjdGlvbkluZm9cIjpcclxuICAgICAgICAgICAgYWRkRW50aXR5KHBhY2tldCwgdGhpcy5GQUNUSU9OX0xJU1QsIEVudGl0eS5GYWN0aW9uLCB0aGlzLkZBQ1RJT05fQVJSQVkpO1xyXG4gICAgICAgICAgICBkcmF3TGVhZGVyQm9hcmQoKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImFuaW1hdGlvbkluZm9cIjpcclxuICAgICAgICAgICAgYWRkRW50aXR5KHBhY2tldCwgdGhpcy5BTklNQVRJT05fTElTVCwgRW50aXR5LkFuaW1hdGlvbik7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJicmFja2V0SW5mb1wiOlxyXG4gICAgICAgICAgICBpZiAoU0VMRklEID09PSBwYWNrZXQucGxheWVySWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuQlJBQ0tFVCA9IG5ldyBFbnRpdHkuQnJhY2tldChwYWNrZXQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJVSUluZm9cIjpcclxuICAgICAgICAgICAgaWYgKHRoaXMuU0VMRklEID09PSBwYWNrZXQucGxheWVySWQpIHtcclxuICAgICAgICAgICAgICAgIG9wZW5VSShwYWNrZXQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJ0aGlzLlNFTEZJRFwiOlxyXG4gICAgICAgICAgICB0aGlzLlNFTEZJRCA9IHBhY2tldC50aGlzLlNFTEZJRDtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLnVwZGF0ZUZhY3Rpb25zTGlzdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBmYWN0aW9uU29ydCA9IGZ1bmN0aW9uIChhLCBiKSB7XHJcbiAgICAgICAgcmV0dXJuIGEuc2l6ZSAtIGIuc2l6ZTtcclxuICAgIH07XHJcblxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5kcmF3U2NlbmUgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgdmFyIHNlbGZQbGF5ZXIgPSB0aGlzLkNPTlRST0xMRVJfTElTVFt0aGlzLlNFTEZJRF07XHJcbiAgICBpZiAoIXNlbGZQbGF5ZXIpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGluQm91bmRzID0gZnVuY3Rpb24gKHBsYXllciwgeCwgeSkge1xyXG4gICAgICAgIHZhciByYW5nZSA9IG1haW5DYW52YXMud2lkdGggLyAoMS4yICogdGhpcy5zY2FsZUZhY3Rvcik7XHJcbiAgICAgICAgcmV0dXJuIHggPCAocGxheWVyLnggKyByYW5nZSkgJiYgeCA+IChwbGF5ZXIueCAtIDUgLyA0ICogcmFuZ2UpXHJcbiAgICAgICAgICAgICYmIHkgPCAocGxheWVyLnkgKyByYW5nZSkgJiYgeSA+IChwbGF5ZXIueSAtIDUgLyA0ICogcmFuZ2UpO1xyXG4gICAgfTtcclxuXHJcblxyXG4gICAgdmFyIGluQm91bmRzQ2xvc2UgPSBmdW5jdGlvbiAocGxheWVyLCB4LCB5KSB7XHJcbiAgICAgICAgdmFyIHJhbmdlID0gMTUwO1xyXG4gICAgICAgIHJldHVybiB4IDwgKHBsYXllci54ICsgcmFuZ2UpICYmIHggPiAocGxheWVyLnggLSA1IC8gNCAqIHJhbmdlKVxyXG4gICAgICAgICAgICAmJiB5IDwgKHBsYXllci55ICsgcmFuZ2UpICYmIHkgPiAocGxheWVyLnkgLSA1IC8gNCAqIHJhbmdlKTtcclxuICAgIH07XHJcblxyXG4gICAgdmFyIGRyYXdDb250cm9sbGVycyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBkcmFmdEN0eC5mb250ID0gXCIyMHB4IEFyaWFsXCI7XHJcblxyXG4gICAgICAgIGRyYWZ0Q3R4LnN0cm9rZVN0eWxlID0gXCIjZmY5ZDYwXCI7XHJcbiAgICAgICAgZm9yICh2YXIgaWQgaW4gdGhpcy5DT05UUk9MTEVSX0xJU1QpIHtcclxuICAgICAgICAgICAgdmFyIGNvbnRyb2xsZXIgPSB0aGlzLkNPTlRST0xMRVJfTElTVFtpZF0sIGk7XHJcbiAgICAgICAgICAgIGRyYWZ0Q3R4LmZpbGxTdHlsZSA9IFwicmdiYSgxMjMsMCwwLFwiICsgY29udHJvbGxlci5oZWFsdGggLyAoNCAqIGNvbnRyb2xsZXIubWF4SGVhbHRoKSArIFwiKVwiO1xyXG4gICAgICAgICAgICBkcmFmdEN0eC5saW5lV2lkdGggPSAxMDtcclxuICAgICAgICAgICAgZHJhZnRDdHguYmVnaW5QYXRoKCk7XHJcblxyXG4gICAgICAgICAgICAvL2RyYXcgcGxheWVyIG9iamVjdFxyXG4gICAgICAgICAgICBpZiAoY29udHJvbGxlci50eXBlID09PSBcIlBsYXllclwiKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcmFkaXVzID0gMzA7XHJcbiAgICAgICAgICAgICAgICBkcmFmdEN0eC5tb3ZlVG8oY29udHJvbGxlci54ICsgcmFkaXVzLCBjb250cm9sbGVyLnkpO1xyXG4gICAgICAgICAgICAgICAgZm9yIChpID0gTWF0aC5QSSAvIDQ7IGkgPD0gMiAqIE1hdGguUEkgLSBNYXRoLlBJIC8gNDsgaSArPSBNYXRoLlBJIC8gNCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoZXRhID0gaSArIGdldFJhbmRvbSgtKGNvbnRyb2xsZXIubWF4SGVhbHRoIC8gY29udHJvbGxlci5oZWFsdGgpIC8gNywgKGNvbnRyb2xsZXIubWF4SGVhbHRoIC8gY29udHJvbGxlci5oZWFsdGgpIC8gNyk7XHJcbiAgICAgICAgICAgICAgICAgICAgeCA9IHJhZGl1cyAqIE1hdGguY29zKHRoZXRhKTtcclxuICAgICAgICAgICAgICAgICAgICB5ID0gcmFkaXVzICogTWF0aC5zaW4odGhldGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGRyYWZ0Q3R4LmxpbmVUbyhjb250cm9sbGVyLnggKyB4LCBjb250cm9sbGVyLnkgKyB5KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGRyYWZ0Q3R4LmxpbmVUbyhjb250cm9sbGVyLnggKyByYWRpdXMsIGNvbnRyb2xsZXIueSArIDMpO1xyXG4gICAgICAgICAgICAgICAgZHJhZnRDdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgICAgICAgICBkcmFmdEN0eC5maWxsKCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7IC8vYm90XHJcbiAgICAgICAgICAgICAgICB2YXIgeCwgeSwgdGhldGEsIHN0YXJ0WCwgc3RhcnRZO1xyXG4gICAgICAgICAgICAgICAgdmFyIHNtYWxsUmFkaXVzID0gMTI7XHJcbiAgICAgICAgICAgICAgICB2YXIgYmlnUmFkaXVzID0gMjA7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhldGEgPSBjb250cm9sbGVyLnRoZXRhO1xyXG4gICAgICAgICAgICAgICAgc3RhcnRYID0gYmlnUmFkaXVzICogTWF0aC5jb3ModGhldGEpO1xyXG4gICAgICAgICAgICAgICAgc3RhcnRZID0gYmlnUmFkaXVzICogTWF0aC5zaW4odGhldGEpO1xyXG4gICAgICAgICAgICAgICAgZHJhZnRDdHgubW92ZVRvKGNvbnRyb2xsZXIueCArIHN0YXJ0WCwgY29udHJvbGxlci55ICsgc3RhcnRZKTtcclxuICAgICAgICAgICAgICAgIGZvciAoaSA9IDE7IGkgPD0gMjsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhldGEgPSBjb250cm9sbGVyLnRoZXRhICsgMiAqIE1hdGguUEkgLyAzICogaSArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdldFJhbmRvbSgtY29udHJvbGxlci5tYXhIZWFsdGggLyBjb250cm9sbGVyLmhlYWx0aCAvIDcsIGNvbnRyb2xsZXIubWF4SGVhbHRoIC8gY29udHJvbGxlci5oZWFsdGggLyA3KTtcclxuICAgICAgICAgICAgICAgICAgICB4ID0gc21hbGxSYWRpdXMgKiBNYXRoLmNvcyh0aGV0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgeSA9IHNtYWxsUmFkaXVzICogTWF0aC5zaW4odGhldGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGRyYWZ0Q3R4LmxpbmVUbyhjb250cm9sbGVyLnggKyB4LCBjb250cm9sbGVyLnkgKyB5KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRoZXRhID0gY29udHJvbGxlci50aGV0YTtcclxuICAgICAgICAgICAgICAgIGRyYWZ0Q3R4LmxpbmVUbyhjb250cm9sbGVyLnggKyBzdGFydFgsIGNvbnRyb2xsZXIueSArIHN0YXJ0WSk7XHJcbiAgICAgICAgICAgICAgICBkcmFmdEN0eC5maWxsKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGRyYWZ0Q3R4LmZpbGxTdHlsZSA9IFwiI2ZmOWQ2MFwiO1xyXG4gICAgICAgICAgICBkcmFmdEN0eC5maWxsVGV4dChjb250cm9sbGVyLm5hbWUsIGNvbnRyb2xsZXIueCwgY29udHJvbGxlci55ICsgNzApO1xyXG4gICAgICAgICAgICBpZiAoY29udHJvbGxlci5zZWxlY3RlZCAmJiBjb250cm9sbGVyLm93bmVyID09PSBzZWxmUGxheWVyLmlkKSB7XHJcbiAgICAgICAgICAgICAgICBkcmFmdEN0eC5saW5lV2lkdGggPSA1O1xyXG4gICAgICAgICAgICAgICAgZHJhZnRDdHguc3Ryb2tlU3R5bGUgPSBcIiMxZDU1YWZcIjtcclxuICAgICAgICAgICAgICAgIGRyYWZ0Q3R4LnN0cm9rZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICB2YXIgZHJhd1RpbGVzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGZvciAodmFyIGlkIGluIHRoaXMuVElMRV9MSVNUKSB7XHJcbiAgICAgICAgICAgIHZhciB0aWxlID0gdGhpcy5USUxFX0xJU1RbaWRdO1xyXG4gICAgICAgICAgICBpZiAoaW5Cb3VuZHMoc2VsZlBsYXllciwgdGlsZS54LCB0aWxlLnkpKSB7XHJcbiAgICAgICAgICAgICAgICBkcmFmdEN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICAgICAgICAgIGRyYWZ0Q3R4LmZpbGxTdHlsZSA9IFwicmdiKFwiICtcclxuICAgICAgICAgICAgICAgICAgICB0aWxlLmNvbG9yLnIgKyBcIixcIiArXHJcbiAgICAgICAgICAgICAgICAgICAgdGlsZS5jb2xvci5nICsgXCIsXCIgK1xyXG4gICAgICAgICAgICAgICAgICAgIHRpbGUuY29sb3IuYiArXHJcbiAgICAgICAgICAgICAgICAgICAgXCIpXCI7XHJcblxyXG4gICAgICAgICAgICAgICAgZHJhZnRDdHgubGluZVdpZHRoID0gMTU7XHJcblxyXG4gICAgICAgICAgICAgICAgZHJhZnRDdHguc3Ryb2tlU3R5bGUgPSBcIiMxZTJhMmJcIjtcclxuXHJcbiAgICAgICAgICAgICAgICBkcmFmdEN0eC5yZWN0KHRpbGUueCwgdGlsZS55LCB0aWxlLmxlbmd0aCwgdGlsZS5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgZHJhZnRDdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgICAgICAgICBkcmFmdEN0eC5maWxsKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuXHJcbiAgICB2YXIgZHJhd1NoYXJkcyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBmb3IgKHZhciBpZCBpbiB0aGlzLlNIQVJEX0xJU1QpIHtcclxuICAgICAgICAgICAgdmFyIHNoYXJkID0gdGhpcy5TSEFSRF9MSVNUW2lkXTtcclxuICAgICAgICAgICAgZHJhZnRDdHgubGluZVdpZHRoID0gMjtcclxuXHJcbiAgICAgICAgICAgIGlmIChpbkJvdW5kcyhzZWxmUGxheWVyLCBzaGFyZC54LCBzaGFyZC55KSAmJiBzaGFyZC52aXNpYmxlKSB7XHJcbiAgICAgICAgICAgICAgICBkcmFmdEN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICAgICAgICAgIGlmIChzaGFyZC5uYW1lICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZHJhZnRDdHguZm9udCA9IFwiMzBweCBBcmlhbFwiO1xyXG4gICAgICAgICAgICAgICAgICAgIGRyYWZ0Q3R4LmZpbGxUZXh0KHNoYXJkLm5hbWUsIHNoYXJkLngsIHNoYXJkLnkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZHJhZnRDdHguZmlsbFN0eWxlID0gXCJyZ2JhKDEwMCwgMjU1LCAyMjcsIDAuMSlcIjtcclxuICAgICAgICAgICAgICAgIGRyYWZ0Q3R4LmFyYyhzaGFyZC54LCBzaGFyZC55LCAyMCwgMCwgMiAqIE1hdGguUEksIGZhbHNlKTtcclxuICAgICAgICAgICAgICAgIGRyYWZ0Q3R4LmZpbGwoKTtcclxuICAgICAgICAgICAgICAgIGRyYWZ0Q3R4LmNsb3NlUGF0aCgpO1xyXG5cclxuXHJcbiAgICAgICAgICAgICAgICBkcmFmdEN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICAgICAgICAgIGRyYWZ0Q3R4LmZpbGxTdHlsZSA9IFwiI2RmZmY0MlwiO1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciByYWRpdXMgPSAxMCwgaTtcclxuICAgICAgICAgICAgICAgIHZhciBzdGFydFRoZXRhID0gZ2V0UmFuZG9tKDAsIDAuMik7XHJcbiAgICAgICAgICAgICAgICB2YXIgdGhldGEgPSAwO1xyXG4gICAgICAgICAgICAgICAgdmFyIHN0YXJ0WCA9IHJhZGl1cyAqIE1hdGguY29zKHN0YXJ0VGhldGEpO1xyXG4gICAgICAgICAgICAgICAgdmFyIHN0YXJ0WSA9IHJhZGl1cyAqIE1hdGguc2luKHN0YXJ0VGhldGEpO1xyXG4gICAgICAgICAgICAgICAgZHJhZnRDdHgubW92ZVRvKHNoYXJkLnggKyBzdGFydFgsIHNoYXJkLnkgKyBzdGFydFkpO1xyXG4gICAgICAgICAgICAgICAgZm9yIChpID0gTWF0aC5QSSAvIDI7IGkgPD0gMiAqIE1hdGguUEkgLSBNYXRoLlBJIC8gMjsgaSArPSBNYXRoLlBJIC8gMikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoZXRhID0gc3RhcnRUaGV0YSArIGkgKyBnZXRSYW5kb20oLTEgLyAyNCwgMSAvIDI0KTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgeCA9IHJhZGl1cyAqIE1hdGguY29zKHRoZXRhKTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgeSA9IHJhZGl1cyAqIE1hdGguc2luKHRoZXRhKTtcclxuICAgICAgICAgICAgICAgICAgICBkcmFmdEN0eC5saW5lVG8oc2hhcmQueCArIHgsIHNoYXJkLnkgKyB5KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGRyYWZ0Q3R4LmxpbmVUbyhzaGFyZC54ICsgc3RhcnRYLCBzaGFyZC55ICsgc3RhcnRZKTtcclxuICAgICAgICAgICAgICAgIGRyYWZ0Q3R4LnN0cm9rZSgpO1xyXG4gICAgICAgICAgICAgICAgZHJhZnRDdHguZmlsbCgpO1xyXG4gICAgICAgICAgICAgICAgZHJhZnRDdHguY2xvc2VQYXRoKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBkcmF3TGFzZXJzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBpZCwgbGFzZXIsIHRhcmdldCwgb3duZXI7XHJcbiAgICAgICAgZm9yIChpZCBpbiB0aGlzLkxBU0VSX0xJU1QpIHtcclxuICAgICAgICAgICAgbGFzZXIgPSB0aGlzLkxBU0VSX0xJU1RbaWRdO1xyXG4gICAgICAgICAgICB0YXJnZXQgPSB0aGlzLkNPTlRST0xMRVJfTElTVFtsYXNlci50YXJnZXRdO1xyXG4gICAgICAgICAgICBvd25lciA9IHRoaXMuQ09OVFJPTExFUl9MSVNUW2xhc2VyLm93bmVyXTtcclxuICAgICAgICAgICAgaWYgKHRhcmdldCAmJiBvd25lciAmJiBpbkJvdW5kcyhzZWxmUGxheWVyLCBvd25lci54LCBvd25lci55KSkge1xyXG4gICAgICAgICAgICAgICAgZHJhZnRDdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgICAgICAgICBkcmFmdEN0eC5tb3ZlVG8ob3duZXIueCwgb3duZXIueSk7XHJcbiAgICAgICAgICAgICAgICBkcmFmdEN0eC5zdHJva2VTdHlsZSA9IFwiIzkxMjIyMlwiO1xyXG4gICAgICAgICAgICAgICAgZHJhZnRDdHgubGluZVdpZHRoID0gMTA7XHJcbiAgICAgICAgICAgICAgICBkcmFmdEN0eC5saW5lVG8odGFyZ2V0LngsIHRhcmdldC55KTtcclxuICAgICAgICAgICAgICAgIGRyYWZ0Q3R4LnN0cm9rZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcblxyXG4gICAgdmFyIGRyYXdDb25uZWN0b3JzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGZvciAodmFyIGlkIGluIHRoaXMuSE9NRV9MSVNUKSB7XHJcbiAgICAgICAgICAgIHZhciBob21lID0gdGhpcy5IT01FX0xJU1RbaWRdO1xyXG4gICAgICAgICAgICBpZiAoaG9tZS5uZWlnaGJvcnMpIHtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaG9tZS5uZWlnaGJvcnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgbmVpZ2hib3IgPSB0aGlzLkhPTUVfTElTVFtob21lLm5laWdoYm9yc1tpXV07XHJcbiAgICAgICAgICAgICAgICAgICAgZHJhZnRDdHgubW92ZVRvKGhvbWUueCwgaG9tZS55KTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5Cb3VuZHNDbG9zZShzZWxmUGxheWVyLCBob21lLngsIGhvbWUueSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZHJhZnRDdHguc3Ryb2tlU3R5bGUgPSBcIiNmNDQyYjBcIjtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkcmFmdEN0eC5zdHJva2VTdHlsZSA9IFwiIzkxMjM4MVwiO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBkcmFmdEN0eC5saW5lV2lkdGggPSAxMDtcclxuICAgICAgICAgICAgICAgICAgICBkcmFmdEN0eC5saW5lVG8obmVpZ2hib3IueCwgbmVpZ2hib3IueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZHJhZnRDdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBkcmF3SG9tZXMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgZm9yICh2YXIgaWQgaW4gdGhpcy5IT01FX0xJU1QpIHtcclxuICAgICAgICAgICAgdmFyIGhvbWUgPSB0aGlzLkhPTUVfTElTVFtpZF07XHJcblxyXG4gICAgICAgICAgICBkcmFmdEN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICAgICAgaWYgKGhvbWUubmVpZ2hib3JzLmxlbmd0aCA+PSA0KSB7XHJcbiAgICAgICAgICAgICAgICBkcmFmdEN0eC5maWxsU3R5bGUgPSBcIiM0MTY5ZTFcIjtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGRyYWZ0Q3R4LmZpbGxTdHlsZSA9IFwiIzM5NmE2ZFwiO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBkcmFmdEN0eC5hcmMoaG9tZS54LCBob21lLnksIGhvbWUucmFkaXVzLCAwLCAyICogTWF0aC5QSSwgZmFsc2UpO1xyXG4gICAgICAgICAgICBkcmFmdEN0eC5maWxsKCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoaW5Cb3VuZHNDbG9zZShzZWxmUGxheWVyLCBob21lLngsIGhvbWUueSkpIHtcclxuICAgICAgICAgICAgICAgIGlmIChob21lLmZhY3Rpb24pXHJcbiAgICAgICAgICAgICAgICAgICAgZHJhZnRDdHguc3Ryb2tlU3R5bGUgPSBcInJnYmEoMTIsIDI1NSwgMjE4LCAwLjcpXCI7XHJcbiAgICAgICAgICAgICAgICBkcmFmdEN0eC5saW5lV2lkdGggPSAxMDtcclxuICAgICAgICAgICAgICAgIGRyYWZ0Q3R4LnN0cm9rZSgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoaG9tZS5vd25lciAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgZHJhZnRDdHguZmlsbFRleHQoaG9tZS5zaGFyZHMubGVuZ3RoLCBob21lLngsIGhvbWUueSArIDQwKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBkcmFmdEN0eC5jbG9zZVBhdGgoKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBkcmF3RmFjdGlvbnMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgZm9yICh2YXIgaWQgaW4gdGhpcy5GQUNUSU9OX0xJU1QpIHtcclxuICAgICAgICAgICAgdmFyIGZhY3Rpb24gPSB0aGlzLkZBQ1RJT05fTElTVFtpZF07XHJcbiAgICAgICAgICAgIGRyYWZ0Q3R4LmZvbnQgPSBmYWN0aW9uLnNpemUgKiAzMCArIFwicHggQXJpYWxcIjtcclxuICAgICAgICAgICAgZHJhZnRDdHgudGV4dEFsaWduID0gXCJjZW50ZXJcIjtcclxuICAgICAgICAgICAgZHJhZnRDdHguZmlsbFRleHQoZmFjdGlvbi5uYW1lLCBmYWN0aW9uLngsIGZhY3Rpb24ueSk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICB2YXIgZHJhd0JyYWNrZXQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYgKEJSQUNLRVQpIHtcclxuICAgICAgICAgICAgZHJhZnRDdHguZmlsbFN0eWxlID0gXCJyZ2JhKDEwMCwyMTEsMjExLDAuNilcIjtcclxuICAgICAgICAgICAgZHJhZnRDdHguZmlsbFJlY3QoQlJBQ0tFVC54LCBCUkFDS0VULnksIEJSQUNLRVQubGVuZ3RoLCBCUkFDS0VULmxlbmd0aCk7XHJcbiAgICAgICAgICAgIGRyYWZ0Q3R4LmZvbnQgPSBcIjIwcHggQXJpYWxcIjtcclxuICAgICAgICAgICAgZHJhZnRDdHguZmlsbFRleHQoXCJQcmVzcyBaIHRvIFBsYWNlIFNlbnRpbmVsXCIsIHNlbGZQbGF5ZXIueCwgc2VsZlBsYXllci55ICsgMTAwKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBkcmF3QXJyb3cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuQVJST1cgJiYgdGhpcy5BUlJPVy5wb3N0WCkge1xyXG4gICAgICAgICAgICBkcmFmdEN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICAgICAgZHJhZnRDdHguc3Ryb2tlU3R5bGUgPSBcIiM1MjE1MjJcIjtcclxuXHJcbiAgICAgICAgICAgIHZhciBwcmVYID0gc2VsZlBsYXllci54ICsgKHRoaXMuQVJST1cucHJlWCAtIGRyYWZ0Q2FudmFzLndpZHRoIC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yO1xyXG4gICAgICAgICAgICB2YXIgcHJlWSA9IHNlbGZQbGF5ZXIueSArICh0aGlzLkFSUk9XLnByZVkgLSBkcmFmdENhbnZhcy5oZWlnaHQgLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3I7XHJcblxyXG4gICAgICAgICAgICB2YXIgcG9zdFggPSBzZWxmUGxheWVyLnggKyAodGhpcy5BUlJPVy5wb3N0WCAtIGRyYWZ0Q2FudmFzLndpZHRoIC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yO1xyXG4gICAgICAgICAgICB2YXIgcG9zdFkgPSBzZWxmUGxheWVyLnkgKyAodGhpcy5BUlJPVy5wb3N0WSAtIGRyYWZ0Q2FudmFzLmhlaWdodCAvIDIpIC8gdGhpcy5zY2FsZUZhY3RvcjtcclxuXHJcbiAgICAgICAgICAgIGRyYWZ0Q3R4LmZpbGxSZWN0KHByZVgsIHByZVksIHBvc3RYIC0gcHJlWCwgcG9zdFkgLSBwcmVZKTtcclxuXHJcbiAgICAgICAgICAgIGRyYWZ0Q3R4LmFyYyhwb3N0WCwgcG9zdFksIDMsIDAsIDIgKiBNYXRoLlBJLCB0cnVlKTtcclxuICAgICAgICAgICAgZHJhZnRDdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICB2YXIgZHJhd0FuaW1hdGlvbnMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgZm9yICh2YXIgaWQgaW4gdGhpcy5BTklNQVRJT05fTElTVCkge1xyXG4gICAgICAgICAgICB2YXIgaG9tZTtcclxuICAgICAgICAgICAgdmFyIGFuaW1hdGlvbiA9IHRoaXMuQU5JTUFUSU9OX0xJU1RbaWRdO1xyXG4gICAgICAgICAgICBpZiAoYW5pbWF0aW9uLnR5cGUgPT09IFwiYWRkU2hhcmRcIikge1xyXG4gICAgICAgICAgICAgICAgaG9tZSA9IHRoaXMuSE9NRV9MSVNUW2FuaW1hdGlvbi5pZF07XHJcbiAgICAgICAgICAgICAgICBpZiAoIWhvbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBkcmFmdEN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICAgICAgICAgIGRyYWZ0Q3R4LmxpbmVXaWR0aCA9IDMgKiBhbmltYXRpb24udGltZXI7XHJcbiAgICAgICAgICAgICAgICBkcmFmdEN0eC5zdHJva2VTdHlsZSA9IFwiIzAxMkNDQ1wiO1xyXG4gICAgICAgICAgICAgICAgZHJhZnRDdHguYXJjKGhvbWUueCwgaG9tZS55LCBob21lLnJhZGl1cywgMCwgYW5pbWF0aW9uLnRpbWVyIC8gMS4yLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgIGRyYWZ0Q3R4LnN0cm9rZSgpO1xyXG4gICAgICAgICAgICAgICAgZHJhZnRDdHguY2xvc2VQYXRoKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChhbmltYXRpb24udHlwZSA9PT0gXCJyZW1vdmVTaGFyZFwiKSB7XHJcbiAgICAgICAgICAgICAgICBob21lID0gdGhpcy5IT01FX0xJU1RbYW5pbWF0aW9uLmlkXTtcclxuICAgICAgICAgICAgICAgIGlmICghaG9tZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLkFOSU1BVElPTl9MSVNUW2lkXTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBkcmFmdEN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICAgICAgICAgIGRyYWZ0Q3R4LmxpbmVXaWR0aCA9IDE1IC0gYW5pbWF0aW9uLnRpbWVyO1xyXG4gICAgICAgICAgICAgICAgZHJhZnRDdHguc3Ryb2tlU3R5bGUgPSBcInJnYmEoMjU1LCAwLCAwLCBcIiArIGFuaW1hdGlvbi50aW1lciAqIDEwIC8gMTAwICsgXCIpXCI7XHJcbiAgICAgICAgICAgICAgICBkcmFmdEN0eC5hcmMoaG9tZS54LCBob21lLnksIGhvbWUucmFkaXVzLCAwLCAyICogTWF0aC5QSSwgZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgZHJhZnRDdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgICAgICAgICBkcmFmdEN0eC5jbG9zZVBhdGgoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGFuaW1hdGlvbi50eXBlID09PSBcInNoYXJkRGVhdGhcIikge1xyXG4gICAgICAgICAgICAgICAgZHJhZnRDdHguZm9udCA9IDYwIC0gYW5pbWF0aW9uLnRpbWVyICsgXCJweCBBcmlhbFwiO1xyXG4gICAgICAgICAgICAgICAgZHJhZnRDdHguc2F2ZSgpO1xyXG4gICAgICAgICAgICAgICAgZHJhZnRDdHgudHJhbnNsYXRlKGFuaW1hdGlvbi54LCBhbmltYXRpb24ueSk7XHJcbiAgICAgICAgICAgICAgICBkcmFmdEN0eC5yb3RhdGUoLU1hdGguUEkgLyA1MCAqIGFuaW1hdGlvbi50aGV0YSk7XHJcbiAgICAgICAgICAgICAgICBkcmFmdEN0eC50ZXh0QWxpZ24gPSBcImNlbnRlclwiO1xyXG4gICAgICAgICAgICAgICAgZHJhZnRDdHguZmlsbFN0eWxlID0gXCJyZ2JhKDI1NSwgMTY4LCA4NiwgXCIgKyBhbmltYXRpb24udGltZXIgKiAxMCAvIDEwMCArIFwiKVwiO1xyXG4gICAgICAgICAgICAgICAgZHJhZnRDdHguZmlsbFRleHQoYW5pbWF0aW9uLm5hbWUsIDAsIDE1KTtcclxuICAgICAgICAgICAgICAgIGRyYWZ0Q3R4LnJlc3RvcmUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICBkcmFmdEN0eC5maWxsU3R5bGUgPSBcIiMwMDAwMDBcIjtcclxuICAgICAgICAgICAgICAgIGFuaW1hdGlvbi50aGV0YSA9IGxlcnAoYW5pbWF0aW9uLnRoZXRhLCAwLCAwLjA4KTtcclxuICAgICAgICAgICAgICAgIGFuaW1hdGlvbi54ID0gbGVycChhbmltYXRpb24ueCwgYW5pbWF0aW9uLmVuZFgsIDAuMSk7XHJcbiAgICAgICAgICAgICAgICBhbmltYXRpb24ueSA9IGxlcnAoYW5pbWF0aW9uLnksIGFuaW1hdGlvbi5lbmRZLCAwLjEpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBhbmltYXRpb24udGltZXItLTtcclxuICAgICAgICAgICAgaWYgKGFuaW1hdGlvbi50aW1lciA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5BTklNQVRJT05fTElTVFtpZF07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuXHJcbiAgICB2YXIgdHJhbnNsYXRlU2NlbmUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgZHJhZnRDdHguc2V0VHJhbnNmb3JtKDEsIDAsIDAsIDEsIDAsIDApO1xyXG4gICAgICAgIHRoaXMuc2NhbGVGYWN0b3IgPSBsZXJwKHRoaXMuc2NhbGVGYWN0b3IsIHRoaXMubWFpblNjYWxlRmFjdG9yLCAwLjMpO1xyXG5cclxuICAgICAgICBkcmFmdEN0eC50cmFuc2xhdGUobWFpbkNhbnZhcy53aWR0aCAvIDIsIG1haW5DYW52YXMuaGVpZ2h0IC8gMik7XHJcbiAgICAgICAgZHJhZnRDdHguc2NhbGUodGhpcy5zY2FsZUZhY3RvciwgdGhpcy5zY2FsZUZhY3Rvcik7XHJcbiAgICAgICAgZHJhZnRDdHgudHJhbnNsYXRlKC1zZWxmUGxheWVyLngsIC1zZWxmUGxheWVyLnkpO1xyXG4gICAgfTtcclxuXHJcbiAgICBtYWluQ3R4LmNsZWFyUmVjdCgwLCAwLCAxMTAwMCwgMTEwMDApO1xyXG4gICAgZHJhZnRDdHguY2xlYXJSZWN0KDAsIDAsIDExMDAwLCAxMTAwMCk7XHJcbiAgICBtTWFwQ3R4LmNsZWFyUmVjdCgwLCAwLCA1MDAsIDUwMCk7XHJcbiAgICBkcmF3VGlsZXMoKTtcclxuICAgIGRyYXdDb250cm9sbGVycygpO1xyXG4gICAgZHJhd1NoYXJkcygpO1xyXG4gICAgZHJhd0xhc2VycygpO1xyXG4gICAgZHJhd0Nvbm5lY3RvcnMoKTtcclxuICAgIGRyYXdIb21lcygpO1xyXG4gICAgZHJhd0ZhY3Rpb25zKCk7XHJcbiAgICBkcmF3QW5pbWF0aW9ucygpO1xyXG5cclxuICAgIGRyYXdCcmFja2V0KCk7XHJcbiAgICBkcmF3QXJyb3coKTtcclxuXHJcbiAgICB0cmFuc2xhdGVTY2VuZSgpO1xyXG4gICAgbWFpbkN0eC5kcmF3SW1hZ2UoZHJhZnRDYW52YXMsIDAsIDApO1xyXG59O1xyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG5mdW5jdGlvbiBsZXJwKGEsIGIsIHJhdGlvKSB7XHJcbiAgICByZXR1cm4gYSArIHJhdGlvICogKGIgLSBhKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZmluZFdpdGhBdHRyKGFycmF5LCBhdHRyLCB2YWx1ZSkge1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkgKz0gMSkge1xyXG4gICAgICAgIGlmIChhcnJheVtpXVthdHRyXSA9PT0gdmFsdWUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIC0xO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRSYW5kb20obWluLCBtYXgpIHtcclxuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikgKyBtaW47XHJcbn1cclxuXHJcbk9iamVjdC5zaXplID0gZnVuY3Rpb24gKG9iaikge1xyXG4gICAgdmFyIHNpemUgPSAwLCBrZXk7XHJcbiAgICBmb3IgKGtleSBpbiBvYmopIHtcclxuICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGtleSkpIHNpemUrKztcclxuICAgIH1cclxuICAgIHJldHVybiBzaXplO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDbGllbnQ7IiwiZnVuY3Rpb24gQXJyb3coeCwgeSkge1xyXG4gICAgdGhpcy5wcmVYID0geDtcclxuICAgIHRoaXMucHJlWSA9IHk7XHJcbiAgICB0aGlzLnBvc3RYID0geDtcclxuICAgIHRoaXMucG9zdFkgPSB5O1xyXG4gICAgdGhpcy5kZWx0YVggPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMucG9zdFggLSBtYWluQ2FudmFzLndpZHRoIC8gMjtcclxuICAgIH07XHJcbiAgICB0aGlzLmRlbHRhWSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5wb3N0WSAtIG1haW5DYW52YXMuaGVpZ2h0IC8gMjtcclxuICAgIH1cclxufTsiLCJmdW5jdGlvbiBCcmFja2V0KGJyYWNrZXRJbmZvKSB7XHJcbiAgICB2YXIgdGlsZSA9IFRJTEVfTElTVFticmFja2V0SW5mby50aWxlSWRdO1xyXG4gICAgdGhpcy54ID0gdGlsZS54O1xyXG4gICAgdGhpcy55ID0gdGlsZS55O1xyXG4gICAgdGhpcy5sZW5ndGggPSB0aWxlLmxlbmd0aDtcclxufSIsImZ1bmN0aW9uIENvbnRyb2xsZXIoY29udHJvbGxlckluZm8pIHtcclxuICAgIHRoaXMuaWQgPSBjb250cm9sbGVySW5mby5pZDtcclxuICAgIHRoaXMubmFtZSA9IGNvbnRyb2xsZXJJbmZvLm5hbWU7XHJcbiAgICB0aGlzLnggPSBjb250cm9sbGVySW5mby54O1xyXG4gICAgdGhpcy55ID0gY29udHJvbGxlckluZm8ueTtcclxuICAgIHRoaXMuaGVhbHRoID0gY29udHJvbGxlckluZm8uaGVhbHRoO1xyXG4gICAgdGhpcy5tYXhIZWFsdGggPSBjb250cm9sbGVySW5mby5tYXhIZWFsdGg7XHJcbiAgICB0aGlzLnNlbGVjdGVkID0gY29udHJvbGxlckluZm8uc2VsZWN0ZWQ7XHJcbiAgICB0aGlzLm93bmVyID0gY29udHJvbGxlckluZm8ub3duZXI7XHJcbiAgICB0aGlzLnRoZXRhID0gY29udHJvbGxlckluZm8udGhldGE7XHJcbiAgICB0aGlzLnR5cGUgPSBjb250cm9sbGVySW5mby50eXBlO1xyXG4gICAgdGhpcy5sZXZlbCA9IGNvbnRyb2xsZXJJbmZvLmxldmVsO1xyXG59XHJcblxyXG5Db250cm9sbGVyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoY29udHJvbGxlciwgY29udHJvbGxlckluZm8pIHtcclxuICAgIHRoaXMueCA9IGNvbnRyb2xsZXJJbmZvLng7XHJcbiAgICB0aGlzLnkgPSBjb250cm9sbGVySW5mby55O1xyXG4gICAgdGhpcy5oZWFsdGggPSBjb250cm9sbGVySW5mby5oZWFsdGg7XHJcbiAgICB0aGlzLm1heEhlYWx0aCA9IGNvbnRyb2xsZXJJbmZvLm1heEhlYWx0aDtcclxuICAgIHRoaXMuc2VsZWN0ZWQgPSBjb250cm9sbGVySW5mby5zZWxlY3RlZDtcclxuICAgIHRoaXMudGhldGEgPSBjb250cm9sbGVySW5mby50aGV0YTtcclxuICAgIHRoaXMubGV2ZWwgPSBjb250cm9sbGVySW5mby5sZXZlbDtcclxufTtcclxuXHJcbkNvbnRyb2xsZXIucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG59OyIsImZ1bmN0aW9uIEZhY3Rpb24oZmFjdGlvbkluZm8pIHtcclxuICAgIHRoaXMuaWQgPSBmYWN0aW9uSW5mby5pZDtcclxuICAgIHRoaXMubmFtZSA9IGZhY3Rpb25JbmZvLm5hbWU7XHJcbiAgICB0aGlzLnggPSBmYWN0aW9uSW5mby54O1xyXG4gICAgdGhpcy55ID0gZmFjdGlvbkluZm8ueTtcclxuICAgIHRoaXMuc2l6ZSA9IGZhY3Rpb25JbmZvLnNpemU7XHJcbn1cclxuXHJcbkZhY3Rpb24ucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIChmYWN0aW9uLCBmYWN0aW9uSW5mbykge1xyXG4gICAgdGhpcy54ID0gZmFjdGlvbkluZm8ueDtcclxuICAgIHRoaXMueSA9IGZhY3Rpb25JbmZvLnk7XHJcbiAgICB0aGlzLnNpemUgPSBmYWN0aW9uSW5mby5zaXplO1xyXG5cclxuXHJcbiAgICBGQUNUSU9OX0FSUkFZLnNvcnQoZmFjdGlvblNvcnQpO1xyXG4gICAgZHJhd0xlYWRlckJvYXJkKCk7IC8vY2hhbmdlIHRoaXNcclxufTsiLCJmdW5jdGlvbiBIb21lKGhvbWVJbmZvKSB7XHJcbiAgICB0aGlzLmlkID0gaG9tZUluZm8uaWQ7XHJcbiAgICB0aGlzLnggPSBob21lSW5mby54O1xyXG4gICAgdGhpcy55ID0gaG9tZUluZm8ueTtcclxuICAgIHRoaXMubmFtZSA9IGhvbWVJbmZvLm93bmVyO1xyXG4gICAgdGhpcy50eXBlID0gaG9tZUluZm8udHlwZTtcclxuICAgIHRoaXMucmFkaXVzID0gaG9tZUluZm8ucmFkaXVzO1xyXG4gICAgdGhpcy5zaGFyZHMgPSBob21lSW5mby5zaGFyZHM7XHJcbiAgICB0aGlzLnBvd2VyID0gaG9tZUluZm8ucG93ZXI7XHJcbiAgICB0aGlzLmxldmVsID0gaG9tZUluZm8ubGV2ZWw7XHJcbiAgICB0aGlzLmhhc0NvbG9yID0gaG9tZUluZm8uaGFzQ29sb3I7XHJcbiAgICB0aGlzLmhlYWx0aCA9IGhvbWVJbmZvLmhlYWx0aDtcclxuICAgIHRoaXMubmVpZ2hib3JzID0gaG9tZUluZm8ubmVpZ2hib3JzO1xyXG5cclxuICAgIHRoaXMudW5pdERtZyA9IGhvbWVJbmZvLnVuaXREbWc7XHJcbiAgICB0aGlzLnVuaXRTcGVlZCA9IGhvbWVJbmZvLnVuaXRTcGVlZDtcclxuICAgIHRoaXMudW5pdEFybW9yID0gaG9tZUluZm8udW5pdEFybW9yO1xyXG4gICAgdGhpcy5xdWV1ZSA9IGhvbWVJbmZvLnF1ZXVlO1xyXG4gICAgdGhpcy5ib3RzID0gaG9tZUluZm8uYm90cztcclxufVxyXG5cclxuXHJcbkhvbWUucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIChob21lSW5mbykge1xyXG4gICAgdGhpcy5zaGFyZHMgPSBob21lSW5mby5zaGFyZHM7XHJcbiAgICB0aGlzLmxldmVsID0gaG9tZUluZm8ubGV2ZWw7XHJcbiAgICB0aGlzLnJhZGl1cyA9IGhvbWVJbmZvLnJhZGl1cztcclxuICAgIHRoaXMucG93ZXIgPSBob21lSW5mby5wb3dlcjtcclxuICAgIHRoaXMuaGVhbHRoID0gaG9tZUluZm8uaGVhbHRoO1xyXG4gICAgdGhpcy5oYXNDb2xvciA9IGhvbWVJbmZvLmhhc0NvbG9yO1xyXG4gICAgdGhpcy5uZWlnaGJvcnMgPSBob21lSW5mby5uZWlnaGJvcnM7XHJcbiAgICB0aGlzLnVuaXREbWcgPSBob21lSW5mby51bml0RG1nO1xyXG4gICAgdGhpcy51bml0U3BlZWQgPSBob21lSW5mby51bml0U3BlZWQ7XHJcbiAgICB0aGlzLnVuaXRBcm1vciA9IGhvbWVJbmZvLnVuaXRBcm1vcjtcclxuICAgIHRoaXMucXVldWUgPSBob21lSW5mby5xdWV1ZTtcclxuICAgIHRoaXMuYm90cyA9IGhvbWVJbmZvLmJvdHM7XHJcbn07IiwiZnVuY3Rpb24gTGFzZXIobGFzZXJJbmZvKSB7XHJcbiAgICB0aGlzLmlkID0gbGFzZXJJbmZvLmlkO1xyXG4gICAgdGhpcy5vd25lciA9IGxhc2VySW5mby5vd25lcjtcclxuICAgIHRoaXMudGFyZ2V0ID0gbGFzZXJJbmZvLnRhcmdldDtcclxufSIsImZ1bmN0aW9uIE1pbmlNYXAoKSB7XHJcbn1cclxuXHJcbk1pbmlNYXAucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBpZiAobWFwVGltZXIgPD0gMCB8fCBzZXJ2ZXJNYXAgPT09IG51bGwpIHtcclxuICAgICAgICB2YXIgdGlsZUxlbmd0aCA9IE1hdGguc3FydChPYmplY3Quc2l6ZShUSUxFX0xJU1QpKTtcclxuICAgICAgICBpZiAodGlsZUxlbmd0aCA9PT0gMCB8fCAhc2VsZlBsYXllcikge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBpbWdEYXRhID0gbWFpbkN0eC5jcmVhdGVJbWFnZURhdGEodGlsZUxlbmd0aCwgdGlsZUxlbmd0aCk7XHJcbiAgICAgICAgdmFyIHRpbGU7XHJcbiAgICAgICAgdmFyIHRpbGVSR0I7XHJcbiAgICAgICAgdmFyIGkgPSAwO1xyXG5cclxuXHJcbiAgICAgICAgZm9yICh2YXIgaWQgaW4gVElMRV9MSVNUKSB7XHJcbiAgICAgICAgICAgIHRpbGVSR0IgPSB7fTtcclxuICAgICAgICAgICAgdGlsZSA9IFRJTEVfTElTVFtpZF07XHJcbiAgICAgICAgICAgIGlmICh0aWxlLmNvbG9yICYmIHRpbGUuYWxlcnQgfHwgaW5Cb3VuZHMoc2VsZlBsYXllciwgdGlsZS54LCB0aWxlLnkpKSB7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLnIgPSB0aWxlLmNvbG9yLnI7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLmcgPSB0aWxlLmNvbG9yLmc7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLmIgPSB0aWxlLmNvbG9yLmI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLnIgPSAwO1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5nID0gMDtcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuYiA9IDA7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGltZ0RhdGEuZGF0YVtpXSA9IHRpbGVSR0IucjtcclxuICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2kgKyAxXSA9IHRpbGVSR0IuZztcclxuICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2kgKyAyXSA9IHRpbGVSR0IuYjtcclxuICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2kgKyAzXSA9IDI1NTtcclxuICAgICAgICAgICAgaSArPSA0O1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zb2xlLmxvZyg0MDAgLyBPYmplY3Quc2l6ZShUSUxFX0xJU1QpKTtcclxuICAgICAgICBpbWdEYXRhID0gc2NhbGVJbWFnZURhdGEoaW1nRGF0YSwgTWF0aC5mbG9vcig0MDAgLyBPYmplY3Quc2l6ZShUSUxFX0xJU1QpKSwgbWFpbkN0eCk7XHJcblxyXG4gICAgICAgIG1NYXBDdHgucHV0SW1hZ2VEYXRhKGltZ0RhdGEsIDAsIDApO1xyXG5cclxuICAgICAgICBtTWFwQ3R4Um90LnJvdGF0ZSg5MCAqIE1hdGguUEkgLyAxODApO1xyXG4gICAgICAgIG1NYXBDdHhSb3Quc2NhbGUoMSwgLTEpO1xyXG4gICAgICAgIG1NYXBDdHhSb3QuZHJhd0ltYWdlKG1NYXAsIDAsIDApO1xyXG4gICAgICAgIG1NYXBDdHhSb3Quc2NhbGUoMSwgLTEpO1xyXG4gICAgICAgIG1NYXBDdHhSb3Qucm90YXRlKDI3MCAqIE1hdGguUEkgLyAxODApO1xyXG5cclxuICAgICAgICBzZXJ2ZXJNYXAgPSBtTWFwUm90O1xyXG4gICAgICAgIG1hcFRpbWVyID0gMjU7XHJcbiAgICB9XHJcblxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgbWFwVGltZXIgLT0gMTtcclxuICAgIH1cclxuXHJcbiAgICBtYWluQ3R4LmRyYXdJbWFnZShzZXJ2ZXJNYXAsIDgwMCwgNDAwKTtcclxufTsgLy9kZXByZWNhdGVkXHJcblxyXG5NaW5pTWFwLnByb3RvdHlwZS5zY2FsZUltYWdlRGF0YSA9IGZ1bmN0aW9uIChpbWFnZURhdGEsIHNjYWxlLCBtYWluQ3R4KSB7XHJcbiAgICB2YXIgc2NhbGVkID0gbWFpbkN0eC5jcmVhdGVJbWFnZURhdGEoaW1hZ2VEYXRhLndpZHRoICogc2NhbGUsIGltYWdlRGF0YS5oZWlnaHQgKiBzY2FsZSk7XHJcbiAgICB2YXIgc3ViTGluZSA9IG1haW5DdHguY3JlYXRlSW1hZ2VEYXRhKHNjYWxlLCAxKS5kYXRhO1xyXG4gICAgZm9yICh2YXIgcm93ID0gMDsgcm93IDwgaW1hZ2VEYXRhLmhlaWdodDsgcm93KyspIHtcclxuICAgICAgICBmb3IgKHZhciBjb2wgPSAwOyBjb2wgPCBpbWFnZURhdGEud2lkdGg7IGNvbCsrKSB7XHJcbiAgICAgICAgICAgIHZhciBzb3VyY2VQaXhlbCA9IGltYWdlRGF0YS5kYXRhLnN1YmFycmF5KFxyXG4gICAgICAgICAgICAgICAgKHJvdyAqIGltYWdlRGF0YS53aWR0aCArIGNvbCkgKiA0LFxyXG4gICAgICAgICAgICAgICAgKHJvdyAqIGltYWdlRGF0YS53aWR0aCArIGNvbCkgKiA0ICsgNFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgICBmb3IgKHZhciB4ID0gMDsgeCA8IHNjYWxlOyB4KyspIHN1YkxpbmUuc2V0KHNvdXJjZVBpeGVsLCB4ICogNClcclxuICAgICAgICAgICAgZm9yICh2YXIgeSA9IDA7IHkgPCBzY2FsZTsgeSsrKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZGVzdFJvdyA9IHJvdyAqIHNjYWxlICsgeTtcclxuICAgICAgICAgICAgICAgIHZhciBkZXN0Q29sID0gY29sICogc2NhbGU7XHJcbiAgICAgICAgICAgICAgICBzY2FsZWQuZGF0YS5zZXQoc3ViTGluZSwgKGRlc3RSb3cgKiBzY2FsZWQud2lkdGggKyBkZXN0Q29sKSAqIDQpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHNjYWxlZDtcclxufTsiLCJmdW5jdGlvbiBTaGFyZChzaGFyZEluZm8pIHtcclxuICAgIHRoaXMuaWQgPSBzaGFyZEluZm8uaWQ7XHJcbiAgICB0aGlzLnggPSBzaGFyZEluZm8ueDtcclxuICAgIHRoaXMueSA9IHNoYXJkSW5mby55O1xyXG4gICAgdGhpcy5uYW1lID0gc2hhcmRJbmZvLm5hbWU7XHJcbiAgICB0aGlzLnZpc2libGUgPSBzaGFyZEluZm8udmlzaWJsZTtcclxufVxyXG5cclxuU2hhcmQucHJvdG90eXBlLnVwZGF0ZVNoYXJkcyA9IGZ1bmN0aW9uIChzaGFyZEluZm8pIHtcclxuICAgIHRoaXMueCA9IHNoYXJkSW5mby54O1xyXG4gICAgdGhpcy55ID0gc2hhcmRJbmZvLnk7XHJcbiAgICB0aGlzLnZpc2libGUgPSBzaGFyZEluZm8udmlzaWJsZTtcclxuICAgIHRoaXMubmFtZSA9IHNoYXJkSW5mby5uYW1lO1xyXG59O1xyXG5cclxuXHJcblNoYXJkLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG5cclxufTsiLCJmdW5jdGlvbiBUaWxlKHRpbGVJbmZvKSB7XHJcbiAgICB0aGlzLmlkID0gdGlsZUluZm8uaWQ7XHJcbiAgICB0aGlzLnggPSB0aWxlSW5mby54O1xyXG4gICAgdGhpcy55ID0gdGlsZUluZm8ueTtcclxuICAgIHRoaXMubGVuZ3RoID0gdGlsZUluZm8ubGVuZ3RoO1xyXG4gICAgdGhpcy5jb2xvciA9IHRpbGVJbmZvLmNvbG9yO1xyXG4gICAgdGhpcy5hbGVydCA9IHRpbGVJbmZvLmFsZXJ0O1xyXG4gICAgdGhpcy5yYW5kb20gPSBNYXRoLmZsb29yKGdldFJhbmRvbSgwLCAzKSk7XHJcbn1cclxuXHJcblRpbGUucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICh0aWxlSW5mbykge1xyXG4gICAgdGhpcy5jb2xvciA9IHRpbGVJbmZvLmNvbG9yO1xyXG4gICAgdGhpcy5hbGVydCA9IHRpbGVJbmZvLmFsZXJ0O1xyXG59O1xyXG5cclxuVGlsZS5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuXHJcbn07XHJcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgQXJyb3c6IHJlcXVpcmUoJy4vQXJyb3cnKSxcclxuICAgIEJyYWNrZXQ6IHJlcXVpcmUoJy4vQnJhY2tldCcpLFxyXG4gICAgQ29udHJvbGxlcjogcmVxdWlyZSgnLi9Db250cm9sbGVyJyksXHJcbiAgICBGYWN0aW9uOiByZXF1aXJlKCcuL0ZhY3Rpb24nKSxcclxuICAgIEhvbWU6IHJlcXVpcmUoJy4vSG9tZScpLFxyXG4gICAgTGFzZXI6IHJlcXVpcmUoJy4vTGFzZXInKSxcclxuICAgIE1pbmlNYXA6IHJlcXVpcmUoJy4vTWluaU1hcCcpLFxyXG4gICAgU2hhcmQ6IHJlcXVpcmUoJy4vU2hhcmQnKSxcclxuICAgIFRpbGU6IHJlcXVpcmUoJy4vVGlsZScpXHJcbn07IiwidmFyIENsaWVudCA9IHJlcXVpcmUoJy4vQ2xpZW50LmpzJyk7XHJcbnZhciBNYWluVUkgPSByZXF1aXJlKCcuL3VpL01haW5VSScpO1xyXG5cclxudmFyIGNsaWVudCA9IG5ldyBDbGllbnQoKTtcclxudmFyIG1haW5VSSA9IG5ldyBNYWluVUkoY2xpZW50LCBjbGllbnQuc29ja2V0KTtcclxuXHJcblxyXG5tYWluVUkucGxheWVyTmFtZXJVSS5vcGVuKCk7XHJcbm1haW5VSS5nYW1lVUkub3BlbigpO1xyXG5cclxuXHJcbmRvY3VtZW50Lm9ua2V5ZG93biA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgY2xpZW50LmtleXNbZXZlbnQua2V5Q29kZV0gPSB0cnVlO1xyXG4gICAgY2xpZW50LnNvY2tldC5lbWl0KCdrZXlFdmVudCcsIHtpZDogZXZlbnQua2V5Q29kZSwgc3RhdGU6IHRydWV9KTtcclxufTtcclxuXHJcbmRvY3VtZW50Lm9ua2V5dXAgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGNsaWVudC5rZXlzW2V2ZW50LmtleUNvZGVdID0gZmFsc2U7XHJcbiAgICBjbGllbnQuc29ja2V0LmVtaXQoJ2tleUV2ZW50Jywge2lkOiBldmVudC5rZXlDb2RlLCBzdGF0ZTogZmFsc2V9KTtcclxufTtcclxuXHJcbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NvbnRleHRtZW51JywgZnVuY3Rpb24gKGUpIHsgLy9wcmV2ZW50IHJpZ2h0LWNsaWNrIGNvbnRleHQgbWVudVxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG59LCBmYWxzZSk7IiwiZnVuY3Rpb24gR2FtZVVJKCkge1xyXG5cclxufVxyXG5cclxuR2FtZVVJLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHNoYXJkTmFtZXJQcm9tcHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2hhcmRfbmFtZXJfcHJvbXB0Jyk7XHJcbiAgICBzaGFyZE5hbWVyUHJvbXB0LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgb3BlblNoYXJkTmFtZXJVSSgpO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9ICBHYW1lVUk7IiwiZnVuY3Rpb24gSG9tZVVJKGNsaWVudCxzb2NrZXQpIHtcclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XHJcbiAgICB0aGlzLnRlbXBsYXRlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2hvbWVfdWknKTtcclxuICAgIHRoaXMuaG9tZSA9IG51bGw7XHJcbn1cclxuXHJcbkhvbWVVSS5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uIChob21lKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xyXG4gICAgdGhpcy5ob21lID0gaG9tZTtcclxuXHJcbiAgICB0aGlzLmFkZFRhYkxpc3RlbmVycygpO1xyXG4gICAgdGhpcy5vcGVuSG9tZUluZm8oKTtcclxuICAgIHRoaXMub3BlblVwZ3JhZGVzUGFnZSgpO1xyXG4gICAgdGhpcy5vcGVuQ29sb3JQaWNrZXIoY29sb3JQaWNrZXIpO1xyXG59O1xyXG5cclxuSG9tZVVJLnByb3RvdHlwZS5vcGVuSG9tZUluZm8gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaG9tZV90eXBlJykuaW5uZXJIVE1MID0gdGhpcy5ob21lLnR5cGU7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaG9tZV9sZXZlbCcpLmlubmVySFRNTCA9IHRoaXMuaG9tZS5sZXZlbDtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdob21lX2hlYWx0aCcpLmlubmVySFRNTCA9IHRoaXMuaG9tZS5oZWFsdGg7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaG9tZV9wb3dlcicpLmlubmVySFRNTCA9IHRoaXMuaG9tZS5wb3dlcjtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdob21lX2ZhY3Rpb25fbmFtZScpLmlubmVySFRNTCA9IHRoaXMuaG9tZS5mYWN0aW9uO1xyXG59O1xyXG5cclxuSG9tZVVJLnByb3RvdHlwZS5vcGVuVXBncmFkZXNQYWdlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHVuaXRVcGdyYWRlcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidW5pdF91cGdyYWRlc1wiKTtcclxuICAgIHZhciBibGRCYXNlSGVhbHRoQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JsZF9ob21lX2J0bicpO1xyXG4gICAgdmFyIGJsZEFybW9yQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JsZF9hcm1vcicpO1xyXG4gICAgdmFyIGJsZFNwZWVkQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JsZF9zcGVlZCcpO1xyXG4gICAgdmFyIGJsZERtZ0J0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdibGRfZGFtYWdlJyk7XHJcblxyXG4gICAgYmxkQmFzZUhlYWx0aEJ0bi51cGdUeXBlID0gXCJob21lSGVhbHRoXCI7XHJcbiAgICBibGRBcm1vckJ0bi51cGdUeXBlID0gXCJhcm1vclwiO1xyXG4gICAgYmxkU3BlZWRCdG4udXBnVHlwZSA9IFwic3BlZWRcIjtcclxuICAgIGJsZERtZ0J0bi51cGdUeXBlID0gXCJkbWdcIjtcclxuXHJcbiAgICB2YXIgYmxkSG9tZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLnNvY2tldC5lbWl0KCdidWlsZEhvbWUnLCB7XHJcbiAgICAgICAgICAgIGhvbWU6IHRoaXMuaG9tZS5pZCxcclxuICAgICAgICAgICAgc2hhcmRzOiBTRUxFQ1RFRF9TSEFSRFNcclxuICAgICAgICB9KVxyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG5cclxuICAgIHZhciB1cGdVbml0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoJ3VwZ3JhZGVVbml0Jywge1xyXG4gICAgICAgICAgICBob21lOiB0aGlzLmhvbWUuaWQsXHJcbiAgICAgICAgICAgIHR5cGU6IHRoaXMudXBnVHlwZSxcclxuICAgICAgICAgICAgc2hhcmRzOiBTRUxFQ1RFRF9TSEFSRFNcclxuICAgICAgICB9KTtcclxuICAgIH0uYmluZCh0aGlzKTtcclxuXHJcbiAgICB0aGlzLnJlc2V0QnV0dG9uKGJsZEJhc2VIZWFsdGhCdG4sIGJsZEhvbWUpO1xyXG5cclxuICAgIGlmICh0aGlzLmhvbWUudHlwZSA9PT0gXCJCYXJyYWNrc1wiKSB7XHJcbiAgICAgICAgdW5pdFVwZ3JhZGVzLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcbiAgICAgICAgdGhpcy5yZXNldEJ1dHRvbihibGRBcm1vckJ0biwgdXBnVW5pdCk7XHJcbiAgICAgICAgdGhpcy5yZXNldEJ1dHRvbihibGRTcGVlZEJ0biwgdXBnVW5pdCk7XHJcbiAgICAgICAgdGhpcy5yZXNldEJ1dHRvbihibGREbWdCdG4sIHVwZ1VuaXQpO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgdW5pdFVwZ3JhZGVzLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuICAgIH1cclxuXHJcblxyXG59O1xyXG5cclxuSG9tZVVJLnByb3RvdHlwZS5vcGVuQ3JlYXRlUGFnZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjcmVhdGVCb3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNyZWF0ZV9ib3RfY29udGFpbmVyXCIpO1xyXG4gICAgdmFyIGJ1aWxkUXVldWUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnVpbGRfcXVldWUnKTtcclxuICAgIHZhciBtYWtlQm90c0J0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYWtlX2JvdHNfYnRuJyk7XHJcblxyXG4gICAgdmFyIG1ha2VCb3RzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFNFTEVDVEVEX1NIQVJEUyk7XHJcbiAgICAgICAgc29ja2V0LmVtaXQoJ21ha2VCb3RzJywge1xyXG4gICAgICAgICAgICBob21lOiB0aGlzLmhvbWUuaWQsXHJcbiAgICAgICAgICAgIHNoYXJkczogU0VMRUNURURfU0hBUkRTXHJcbiAgICAgICAgfSk7XHJcbiAgICB9O1xyXG5cclxuICAgIGJ1aWxkUXVldWUuYWRkRXZlbnRMaXN0ZW5lcignc2Nyb2xsJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgdGhpcy5jbGllbnQuTElTVF9TQ1JPTEwgPSB0cnVlO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaWYgKHRoaXMuaG9tZS50eXBlID09PSBcIkJhcnJhY2tzXCIpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlJFU0VUVElORyBNQUtFX0JPVFNcIik7XHJcbiAgICAgICAgdGhpcy5yZXNldEJ1dHRvbihtYWtlQm90c0J0biwgbWFrZUJvdHMpO1xyXG4gICAgICAgIGNyZWF0ZUJvdC5zdHlsZS5kaXNwbGF5ID0gXCJmbGV4XCI7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNyZWF0ZUJvdC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcbiAgICB9XHJcblxyXG4gICAgYWRkUXVldWVJbmZvKGJ1aWxkUXVldWUsIGhvbWUpO1xyXG59O1xyXG5cclxuSG9tZVVJLnByb3RvdHlwZS5vcGVuQm90c1BhZ2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgYm90c0xpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYm90c19saXN0Jyk7XHJcbiAgICBpZiAodGhpcy5ob21lLnR5cGUgPT09IFwiQmFycmFja3NcIikge1xyXG4gICAgICAgIGFkZEJvdHMoYm90c0xpc3QsIGhvbWUpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuSG9tZVVJLnByb3RvdHlwZS5vcGVuQ29sb3JQaWNrZXIgPSBmdW5jdGlvbiAoY29sb3JQaWNrZXIsIGhvbWUpIHtcclxuICAgIHZhciBjb2xvckNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY29sb3JfY2FudmFzXCIpO1xyXG4gICAgdmFyIGNvbG9yQ3R4ID0gY29sb3JDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG5cclxuICAgIGNvbG9yQ2FudmFzLndpZHRoID0gMTAwO1xyXG4gICAgY29sb3JDYW52YXMuaGVpZ2h0ID0gMTAwO1xyXG5cclxuICAgIGlmICghaG9tZS5oYXNDb2xvciAmJiBob21lLmxldmVsID4gMSkge1xyXG4gICAgICAgIGNvbG9yUGlja2VyLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBjb2xvclBpY2tlci5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdmFyIGNvbG9ycyA9IG5ldyBJbWFnZSgpO1xyXG4gICAgY29sb3JzLnNyYyA9ICdjb2xvcnMuanBnJztcclxuICAgIGNvbG9ycy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgY29sb3JDdHguZmlsbFN0eWxlID0gXCIjMzMzZWVlXCI7XHJcbiAgICAgICAgY29sb3JDdHguZmlsbFJlY3QoMCwgMCwgY29sb3JDYW52YXMud2lkdGggLyAyLCBjb2xvckNhbnZhcy5oZWlnaHQgLyAyKTtcclxuICAgICAgICBjb2xvckN0eC5maWxsU3R5bGUgPSBcIiM2MjNlZWVcIjtcclxuICAgICAgICBjb2xvckN0eC5maWxsUmVjdChjb2xvckNhbnZhcy53aWR0aCAvIDIsIGNvbG9yQ2FudmFzLmhlaWdodCAvIDIsIGNvbG9yQ2FudmFzLndpZHRoLCBjb2xvckNhbnZhcy5oZWlnaHQpO1xyXG4gICAgfTtcclxuXHJcbiAgICBjb2xvckNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgdmFyIHJlY3QgPSBjb2xvckNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICB2YXIgeCA9IGV2ZW50LmNsaWVudFggLSByZWN0LmxlZnQ7XHJcbiAgICAgICAgdmFyIHkgPSBldmVudC5jbGllbnRZIC0gcmVjdC50b3A7XHJcbiAgICAgICAgdmFyIGltZ19kYXRhID0gY29sb3JDdHguZ2V0SW1hZ2VEYXRhKHgsIHksIDEwMCwgMTAwKS5kYXRhO1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJuZXdDb2xvclwiLCB7XHJcbiAgICAgICAgICAgIGhvbWU6IGhvbWUuaWQsXHJcbiAgICAgICAgICAgIGNvbG9yOiB7XHJcbiAgICAgICAgICAgICAgICByOiBpbWdfZGF0YVswXSxcclxuICAgICAgICAgICAgICAgIGc6IGltZ19kYXRhWzFdLFxyXG4gICAgICAgICAgICAgICAgYjogaW1nX2RhdGFbMl1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG5cclxuXHJcbkhvbWVVSS5wcm90b3R5cGUuYWRkVGFiTGlzdGVuZXJzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHVwZ3JhZGVzUGFnZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidXBncmFkZXNfcGFnZVwiKTtcclxuICAgIHZhciBjcmVhdGVQYWdlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjcmVhdGVfcGFnZVwiKTtcclxuICAgIHZhciBib3RzUGFnZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYm90c19wYWdlXCIpO1xyXG5cclxuICAgIHZhciB1cGdyYWRlc1RhYiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd1cGdyYWRlc190YWInKTtcclxuICAgIHZhciBjcmVhdGVUYWIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY3JlYXRlX3RhYicpO1xyXG4gICAgdmFyIGJvdHNUYWIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYm90c190YWInKTtcclxuXHJcbiAgICB1cGdyYWRlc1RhYi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChldnQpIHtcclxuICAgICAgICB1cGdyYWRlc1BhZ2Uuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcclxuICAgICAgICBjcmVhdGVQYWdlLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuICAgICAgICBib3RzUGFnZS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcbiAgICAgICAgdGhpcy5vcGVuVXBncmFkZXNQYWdlKCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBjcmVhdGVUYWIuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZXZ0KSB7XHJcbiAgICAgICAgdXBncmFkZXNQYWdlLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuICAgICAgICBjcmVhdGVQYWdlLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcbiAgICAgICAgYm90c1BhZ2Uuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG4gICAgICAgIHRoaXMub3BlbkNyZWF0ZVBhZ2UoKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGJvdHNUYWIuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZXZ0KSB7XHJcbiAgICAgICAgdXBncmFkZXNQYWdlLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuICAgICAgICBjcmVhdGVQYWdlLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuICAgICAgICBib3RzUGFnZS5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xyXG4gICAgICAgIHRoaXMub3BlbkJvdHNQYWdlKCk7XHJcbiAgICB9KTtcclxufTtcclxuXHJcblxyXG5Ib21lVUkucHJvdG90eXBlLmFkZFNoYXJkcyA9IGZ1bmN0aW9uIChsaXN0cykge1xyXG4gICAgdmFyIGNoZWNrU2VsZWN0aW9uID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBibGRCYXNlSGVhbHRoQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JsZF9ob21lX2J0bicpO1xyXG4gICAgICAgIHZhciBtYWtlQm90c0J0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYWtlX2JvdHNfYnRuJyk7XHJcbiAgICAgICAgdmFyIGJsZEFybW9yQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JsZF9hcm1vcicpO1xyXG4gICAgICAgIHZhciBibGRTcGVlZEJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdibGRfc3BlZWQnKTtcclxuICAgICAgICB2YXIgYmxkRG1nQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JsZF9kYW1hZ2UnKTtcclxuXHJcbiAgICAgICAgaWYgKE9iamVjdC5zaXplKFNFTEVDVEVEX1NIQVJEUykgPiAwKSB7XHJcbiAgICAgICAgICAgIGJsZEJhc2VIZWFsdGhCdG4uZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgYmxkQXJtb3JCdG4uZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgYmxkU3BlZWRCdG4uZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgYmxkRG1nQnRuLmRpc2FibGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIG1ha2VCb3RzQnRuLmRpc2FibGVkID0gZmFsc2U7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgYmxkQmFzZUhlYWx0aEJ0bi5kaXNhYmxlZCA9IFwiZGlzYWJsZWRcIjtcclxuICAgICAgICAgICAgYmxkQXJtb3JCdG4uZGlzYWJsZWQgPSBcImRpc2FibGVkXCI7XHJcbiAgICAgICAgICAgIGJsZFNwZWVkQnRuLmRpc2FibGVkID0gXCJkaXNhYmxlZFwiO1xyXG4gICAgICAgICAgICBibGREbWdCdG4uZGlzYWJsZWQgPSBcImRpc2FibGVkXCI7XHJcbiAgICAgICAgICAgIG1ha2VCb3RzQnRuLmRpc2FibGVkID0gXCJkaXNhYmxlZFwiO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3RzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFyIGxpc3QgPSBsaXN0c1tpXTtcclxuICAgICAgICBjaGVja1NlbGVjdGlvbigpO1xyXG4gICAgICAgIGxpc3QuaW5uZXJIVE1MID0gXCJcIjtcclxuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGhvbWUuc2hhcmRzLmxlbmd0aDsgaisrKSB7XHJcbiAgICAgICAgICAgIHZhciBlbnRyeSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XHJcbiAgICAgICAgICAgIHZhciBzaGFyZCA9IFNIQVJEX0xJU1RbaG9tZS5zaGFyZHNbal1dO1xyXG4gICAgICAgICAgICBlbnRyeS5pZCA9IHNoYXJkLmlkO1xyXG5cclxuICAgICAgICAgICAgKGZ1bmN0aW9uIChfaWQpIHtcclxuICAgICAgICAgICAgICAgIGVudHJ5LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLmNsaWNrZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGlja2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zdHlsZS5iYWNrZ3JvdW5kID0gXCIjZmZmYjIyXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFNFTEVDVEVEX1NIQVJEU1tfaWRdID0gX2lkO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGVja1NlbGVjdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGlja2VkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3R5bGUuYmFja2dyb3VuZCA9IFwiIzU0MmZjZVwiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgU0VMRUNURURfU0hBUkRTW19pZF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrU2VsZWN0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pKGVudHJ5LmlkKTtcclxuXHJcblxyXG4gICAgICAgICAgICBlbnRyeS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzaGFyZC5uYW1lKSk7XHJcbiAgICAgICAgICAgIGxpc3QuYXBwZW5kQ2hpbGQoZW50cnkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsaXN0LmFkZEV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICBMSVNUX1NDUk9MTCA9IHRydWU7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5Ib21lVUkucHJvdG90eXBlLmFkZEJvdHMgPSBmdW5jdGlvbiAobGlzdCwgaG9tZSkge1xyXG4gICAgbGlzdC5pbm5lckhUTUwgPSBcIlwiO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBob21lLmJvdHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgYm90SW5mbyA9IGhvbWUuYm90c1tpXTtcclxuICAgICAgICB2YXIgZW50cnkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xyXG4gICAgICAgIGVudHJ5LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKFxyXG4gICAgICAgICAgICBib3RJbmZvLm5hbWUgKyBcIiAtLSBMRVZFTDpcIiArIGJvdEluZm8ubGV2ZWwpKTtcclxuICAgICAgICBsaXN0LmFwcGVuZENoaWxkKGVudHJ5KTtcclxuICAgIH1cclxufTtcclxuXHJcbkhvbWVVSS5wcm90b3R5cGUucmVzZXRCdXR0b24gPSBmdW5jdGlvbiAoYnV0dG9uLCBjYWxsYmFjaykge1xyXG4gICAgdmFyIHNldFNraWxsTWV0ZXIgPSBmdW5jdGlvbiAoYnV0dG9uKSB7XHJcbiAgICAgICAgdmFyIGZpbmRDaGlsZENhbnZhcyA9IGZ1bmN0aW9uIChza2lsbERpdikge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNraWxsRGl2LmNoaWxkTm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGlmIChza2lsbERpdi5jaGlsZE5vZGVzW2ldLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09IFwiY2FudmFzXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2tpbGxEaXYuY2hpbGROb2Rlc1tpXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgY2FudmFzID0gZmluZENoaWxkQ2FudmFzKGJ1dHRvbi5wYXJlbnROb2RlKTtcclxuICAgICAgICBjYW52YXMud2lkdGggPSAyNjA7XHJcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IDEwMDtcclxuICAgICAgICB2YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuICAgICAgICBjdHguY2xlYXJSZWN0KDAsIDAsIDEwMDAsIDIwMCk7XHJcbiAgICAgICAgdmFyIG1hZ25pdHVkZSA9IDA7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiI0ZGRkZGRlwiO1xyXG4gICAgICAgIHN3aXRjaCAoYnV0dG9uLnVwZ1R5cGUpIHtcclxuICAgICAgICAgICAgY2FzZSBcImhvbWVIZWFsdGhcIjpcclxuICAgICAgICAgICAgICAgIG1hZ25pdHVkZSA9IHRoaXMuaG9tZS5wb3dlcjtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwiZG1nXCI6XHJcbiAgICAgICAgICAgICAgICBtYWduaXR1ZGUgPSB0aGlzLmhvbWUudW5pdERtZztcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwiYXJtb3JcIjpcclxuICAgICAgICAgICAgICAgIG1hZ25pdHVkZSA9IHRoaXMuaG9tZS51bml0QXJtb3I7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcInNwZWVkXCI6XHJcbiAgICAgICAgICAgICAgICBtYWduaXR1ZGUgPSB0aGlzLmhvbWUudW5pdFNwZWVkO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgIH1cclxuICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgbWFnbml0dWRlICogMTAsIDIwMCk7XHJcbiAgICB9O1xyXG4gICAgdmFyIG5ld0J1dHRvbiA9IGJ1dHRvbi5jbG9uZU5vZGUodHJ1ZSk7XHJcbiAgICBidXR0b24ucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQobmV3QnV0dG9uLCBidXR0b24pO1xyXG4gICAgYnV0dG9uID0gbmV3QnV0dG9uO1xyXG4gICAgYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgY2FsbGJhY2spO1xyXG4gICAgaWYgKGJ1dHRvbi51cGdUeXBlKSB7XHJcbiAgICAgICAgc2V0U2tpbGxNZXRlcihidXR0b24pO1xyXG4gICAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBIb21lVUk7XHJcbiIsImRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nOyAgLy8gZmlyZWZveCwgY2hyb21lXHJcbmRvY3VtZW50LmJvZHkuc2Nyb2xsID0gXCJub1wiO1xyXG52YXIgUGxheWVyTmFtZXJVSSA9IHJlcXVpcmUoJy4vUGxheWVyTmFtZXJVSScpO1xyXG52YXIgU2hhcmROYW1lclVJID0gcmVxdWlyZSgnLi9TaGFyZE5hbWVyVUknKTtcclxudmFyIEdhbWVVSSA9IHJlcXVpcmUoJy4vR2FtZVVJJyk7XHJcbnZhciBIb21lVUkgPSByZXF1aXJlKFwiLi9Ib21lVUlcIik7XHJcblxyXG5cclxuZnVuY3Rpb24gTWFpblVJKGNsaWVudCwgc29ja2V0KSB7XHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxuICAgIHRoaXMuc29ja2V0ID0gc29ja2V0O1xyXG4gICAgdGhpcy5TRUxFQ1RFRF9TSEFSRFMgPSB7fTtcclxuICAgIHRoaXMuTElTVF9TQ1JPTEwgPSBmYWxzZTtcclxuXHJcbiAgICB0aGlzLnBsYXllck5hbWVyVUkgPSBuZXcgUGxheWVyTmFtZXJVSSh0aGlzLmNsaWVudCwgdGhpcy5zb2NrZXQpO1xyXG4gICAgdGhpcy5nYW1lVUkgPSBuZXcgR2FtZVVJKHRoaXMuY2xpZW50LCB0aGlzLnNvY2tldCk7XHJcbiAgICB0aGlzLnNoYXJkTmFtZXJVSSA9IG5ldyBTaGFyZE5hbWVyVUkodGhpcy5jbGllbnQsIHRoaXMuc29ja2V0KTtcclxuICAgIHRoaXMuaG9tZVVJID0gbmV3IEhvbWVVSSh0aGlzLmNsaWVudCwgdGhpcy5zb2NrZXQpO1xyXG59XHJcblxyXG5NYWluVUkucHJvdG90eXBlLm9wZW5VSSA9IGZ1bmN0aW9uIChpbmZvKSB7XHJcbiAgICB2YXIgYWN0aW9uID0gaW5mby5hY3Rpb247XHJcbiAgICB2YXIgaG9tZTtcclxuXHJcbiAgICBpZiAoYWN0aW9uID09PSBcIm5hbWUgc2hhcmRcIikge1xyXG4gICAgICAgIHRoaXMuc2hhcmROYW1lclVJLm9wZW4oKTtcclxuICAgIH1cclxuICAgIGlmIChhY3Rpb24gPT09IFwiaG9tZSBpbmZvXCIpIHtcclxuICAgICAgICBob21lID0gSE9NRV9MSVNUW2luZm8uaG9tZUlkXTtcclxuICAgICAgICB0aGlzLmhvbWVVSS5vcGVuKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuTWFpblVJLnByb3RvdHlwZS5jbG9zZVVJID0gZnVuY3Rpb24gKGFjdGlvbikge1xyXG4gICAgdmFyIHNoYXJkTmFtZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2hhcmRfbmFtZXJfdWknKTtcclxuICAgIHZhciBob21lSW5mbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdob21lX3VpJyk7XHJcblxyXG4gICAgaWYgKGFjdGlvbiA9PT0gXCJuYW1lIHNoYXJkXCIpIHtcclxuICAgICAgICBzaGFyZE5hbWVyLmNsb3NlKCk7XHJcbiAgICB9XHJcbiAgICBpZiAoYWN0aW9uID09PSBcImhvbWUgaW5mb1wiKSB7XHJcbiAgICAgICAgTElTVF9TQ1JPTEwgPSBmYWxzZTtcclxuICAgICAgICBob21lSW5mby5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG4gICAgICAgIHNvY2tldC5lbWl0KFwicmVtb3ZlVmlld2VyXCIsIHt9KTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5NYWluVUkucHJvdG90eXBlLnVwZGF0ZUxlYWRlckJvYXJkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGxlYWRlcmJvYXJkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsZWFkZXJib2FyZFwiKTtcclxuICAgIGxlYWRlcmJvYXJkLmlubmVySFRNTCA9IFwiXCI7XHJcbiAgICBmb3IgKHZhciBpID0gRkFDVElPTl9BUlJBWS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG4gICAgICAgIHZhciBmYWN0aW9uID0gRkFDVElPTl9BUlJBWVtpXTtcclxuXHJcbiAgICAgICAgdmFyIGVudHJ5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcclxuICAgICAgICBlbnRyeS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShmYWN0aW9uLm5hbWUpKTtcclxuICAgICAgICBsZWFkZXJib2FyZC5hcHBlbmRDaGlsZChlbnRyeSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuXHJcblxyXG4vKiogREVQUkVDQVRFRCBNRVRIT0RTICoqL1xyXG5NYWluVUkucHJvdG90eXBlLnVwZGF0ZVVJID0gZnVuY3Rpb24gKGluZm8pIHtcclxuICAgIHZhciBhY3Rpb24gPSBpbmZvLmFjdGlvbjtcclxuICAgIHZhciBob21lO1xyXG4gICAgaWYgKGFjdGlvbiA9PT0gXCJ1cGRhdGUgcXVldWVcIikge1xyXG4gICAgICAgIHZhciBidWlsZFF1ZXVlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2J1aWxkX3F1ZXVlJyk7XHJcbiAgICAgICAgaG9tZSA9IEhPTUVfTElTVFtpbmZvLmhvbWVJZF07XHJcbiAgICAgICAgYWRkUXVldWVJbmZvKGJ1aWxkUXVldWUsIGhvbWUpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuZnVuY3Rpb24gYWRkUXVldWVJbmZvKGxpc3QsIGhvbWUpIHtcclxuICAgIGxpc3QuaW5uZXJIVE1MID0gXCJcIjtcclxuICAgIGlmICghaG9tZS5xdWV1ZSkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaG9tZS5xdWV1ZS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciBidWlsZEluZm8gPSBob21lLnF1ZXVlW2ldO1xyXG4gICAgICAgIHZhciBlbnRyeSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XHJcbiAgICAgICAgZW50cnkuaWQgPSBNYXRoLnJhbmRvbSgpO1xyXG5cclxuICAgICAgICAoZnVuY3Rpb24gKF9pZCkge1xyXG4gICAgICAgICAgICBlbnRyeS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmNsaWNrZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNsaWNrZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3R5bGUuYmFja2dyb3VuZCA9IFwiI2ZmZmIyMlwiO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGlja2VkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdHlsZS5iYWNrZ3JvdW5kID0gXCIjNTQyZmNlXCI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pKGVudHJ5LmlkKTtcclxuXHJcbiAgICAgICAgZW50cnkuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoXHJcbiAgICAgICAgICAgIGJ1aWxkSW5mby5zaGFyZE5hbWUgKyBcIiAtLSBcIiArIE1hdGguZmxvb3IoYnVpbGRJbmZvLnRpbWVyIC8gMTAwMCkgK1xyXG4gICAgICAgICAgICBcIjpcIiArIE1hdGguZmxvb3IoYnVpbGRJbmZvLnRpbWVyICUgMTAwMCkpKTtcclxuICAgICAgICBsaXN0LmFwcGVuZENoaWxkKGVudHJ5KTtcclxuICAgIH1cclxufVxyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTWFpblVJOyIsImZ1bmN0aW9uIFBsYXllck5hbWVyVUkgKGNsaWVudCwgc29ja2V0KSB7XHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxuICAgIHRoaXMuc29ja2V0ID0gc29ja2V0O1xyXG5cclxuICAgIHRoaXMubGVhZGVyYm9hcmQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImxlYWRlcmJvYXJkX2NvbnRhaW5lclwiKTtcclxuICAgIHRoaXMubmFtZUJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibmFtZVN1Ym1pdFwiKTtcclxuICAgIHRoaXMucGxheWVyTmFtZUlucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwbGF5ZXJOYW1lSW5wdXRcIik7XHJcbiAgICB0aGlzLmZhY3Rpb25OYW1lSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImZhY3Rpb25OYW1lSW5wdXRcIik7XHJcbiAgICB0aGlzLnBsYXllck5hbWVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwbGF5ZXJfbmFtZXJcIik7XHJcbn1cclxuXHJcblBsYXllck5hbWVyVUkucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgdGhpcy5wbGF5ZXJOYW1lSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDEzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZmFjdGlvbk5hbWVJbnB1dC5mb2N1cygpO1xyXG4gICAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG4gICAgdGhpcy5mYWN0aW9uTmFtZUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSAxMykge1xyXG4gICAgICAgICAgICB0aGlzLm5hbWVCdG4uY2xpY2soKTtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMubmFtZUJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuY2xpZW50Lm1haW5DYW52YXMuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgICAgIHRoaXMubGVhZGVyYm9hcmQuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJuZXdQbGF5ZXJcIixcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogdGhpcy5wbGF5ZXJOYW1lSW5wdXQudmFsdWUsXHJcbiAgICAgICAgICAgICAgICBmYWN0aW9uOiB0aGlzLmZhY3Rpb25OYW1lSW5wdXQudmFsdWVcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5wbGF5ZXJOYW1lci5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICB0aGlzLnBsYXllck5hbWVyLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgIHRoaXMucGxheWVyTmFtZUlucHV0LmZvY3VzKCk7XHJcbiAgICB0aGlzLmxlYWRlcmJvYXJkLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBQbGF5ZXJOYW1lclVJOyIsInZhciB1aSA9IHJlcXVpcmUoJy4vU2hhcmROYW1lclVJJyk7XHJcblxyXG5mdW5jdGlvbiBTaGFyZE5hbWVyVUkoY2xpZW50LCBzb2NrZXQpIHtcclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XHJcblxyXG4gICAgdGhpcy5zaGFyZE5hbWVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NoYXJkX25hbWVyX3VpJyk7XHJcbiAgICB0aGlzLnRleHRJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidGV4dElucHV0XCIpO1xyXG4gICAgdGhpcy5uYW1lU2hhcmRCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm5hbWVTaGFyZEJ0blwiKTtcclxufVxyXG5cclxuU2hhcmROYW1lclVJLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHNoYXJkTmFtZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2hhcmRfbmFtZXJfdWknKTtcclxuICAgIHZhciB0ZXh0SW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInRleHRJbnB1dFwiKTtcclxuICAgIHZhciBuYW1lU2hhcmRCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm5hbWVTaGFyZEJ0blwiKTtcclxuXHJcbiAgICBzaGFyZE5hbWVyLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xyXG5cclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCB0aGlzLmZvY3VzVGV4dElucHV0KTtcclxuXHJcbiAgICB0ZXh0SW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDEzKSB7XHJcbiAgICAgICAgICAgIHZhciB0ZXh0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0ZXh0SW5wdXRcIikudmFsdWU7XHJcbiAgICAgICAgICAgIGlmICh0ZXh0ICE9PSBudWxsICYmIHRleHQgIT09IFwiXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc29ja2V0LmVtaXQoJ3RleHRJbnB1dCcsXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogc2VsZklkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3b3JkOiB0ZXh0XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHVpLmNsb3NlVUkoXCJuYW1lIHNoYXJkXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59O1xyXG5cclxuU2hhcmROYW1lclVJLnByb3RvdHlwZS5mb2N1c1RleHRJbnB1dCA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgIGlmIChldmVudC5rZXlDb2RlID09PSAxMykge1xyXG4gICAgICAgIHRleHRJbnB1dC5mb2N1cygpO1xyXG4gICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCBmb2N1c1RleHRJbnB1dCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5TaGFyZE5hbWVyVUkucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy50ZXh0SW5wdXQudmFsdWUgPSBcIlwiO1xyXG4gICAgdGhpcy50ZW1wbGF0ZS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTaGFyZE5hbWVyVUk7XHJcbiJdfQ==
