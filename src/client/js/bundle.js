(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Entity = require('./entity');
var MainUI = require('./ui/MainUI');

function Client() {
    this.SELFID = null;
    this.ARROW = null;
    this.BRACKET = null;
    this.rightClick = false;
    this.init();
}

Client.prototype.init = function () {
    this.initSocket();
    this.initCanvases();
    this.initLists();
    this.initViewers();
};
Client.prototype.initSocket = function () {
    this.socket = io();
    this.socket.verified = false;

    this.socket.on('addFactionsUI', this.addFactionstoUI.bind(this));
    this.socket.on('updateEntities', this.handlePacket.bind(this));
    this.socket.on('drawScene', this.drawScene.bind(this));
    this.socket.on('chatMessage', this.mainUI)
};
Client.prototype.initCanvases = function () {
    this.mainCanvas = document.getElementById("main_canvas");
    this.draftCanvas = document.createElement("canvas");
    this.draftCanvas.style.border = '1px solid #000000';

    this.mainCanvas.style.visibility = "hidden";
    this.draftCanvas.style.display = "none";

    this.draftCanvas.height = this.mainCanvas.height;
    this.draftCanvas.width = this.mainCanvas.width;

    this.mainCtx = this.mainCanvas.getContext("2d");
    this.draftCtx = this.draftCanvas.getContext("2d");


    document.addEventListener("mousedown", function (event) {
        if (event.button === 2) {
            this.rightClick = true;
        } else if (this.CONTROLLER_LIST[this.SELFID]) {
            this.ARROW = new Entity.Arrow(event.x / this.mainCanvas.offsetWidth * 1000,
                event.y / this.mainCanvas.offsetHeight * 500, this);
        }
    }.bind(this));

    document.addEventListener("mouseup", function (event) {
        if (!this.CHAT_CLICK) {
            this.mainUI.gameUI.chatUI.close();
        }
        if (!this.rightClick) {
            this.ARROW.postX = event.x / this.mainCanvas.offsetWidth * 1000;
            this.ARROW.postY = event.y / this.mainCanvas.offsetHeight * 500;

            var minx = (this.ARROW.preX - this.draftCanvas.width / 2) / this.scaleFactor;
            var miny = (this.ARROW.preY - this.draftCanvas.height / 2) / this.scaleFactor;
            var maxx = (this.ARROW.postX - this.draftCanvas.width / 2) / this.scaleFactor;
            var maxy = (this.ARROW.postY - this.draftCanvas.height / 2) / this.scaleFactor;

            this.socket.emit("selectBots", {
                minX: Math.min(minx, maxx),
                minY: Math.min(miny, maxy),
                maxX: Math.max(minx, maxx),
                maxY: Math.max(miny, maxy)
            });
        }
        else {
            var x = event.x / this.mainCanvas.offsetWidth * 1000;
            var y = event.y / this.mainCanvas.offsetHeight * 500;

            this.socket.emit("botCommand", {
                x: (x - this.draftCanvas.width / 2) / this.scaleFactor,
                y: (y - this.draftCanvas.height / 2) / this.scaleFactor
            });
        }

        this.rightClick = false;
        this.ARROW = null;
        this.CHAT_CLICK = false;
    }.bind(this));

    document.addEventListener("mousemove", function (event) {
        if (this.ARROW) {
            this.ARROW.postX = event.x / this.mainCanvas.offsetWidth * 1000;
            this.ARROW.postY = event.y / this.mainCanvas.offsetHeight * 500;
        }
    }.bind(this));
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
Client.prototype.initViewers = function () {
    this.keys = [];
    this.scaleFactor = 1;
    this.mainScaleFactor = 1;
    this.mainUI = new MainUI(this, this.socket);

    this.mainUI.playerNamerUI.open();
};

Client.prototype.addFactionstoUI = function (data) {
    if (!this.socket.verified) {
        console.log("VERIFIED CLIENT");
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
}; //change method name and location

Client.prototype.handlePacket = function (data) {
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

Client.prototype.addEntities = function (packet) {
    var addEntity = function (packet, list, entity, array) {
        if (!packet) {
            return;
        }
        list[packet.id] = new entity(packet, this);
        if (array && array.indexOf(packet.id) === -1) {
            array.push(packet.id);
        }
    }.bind(this);

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
            this.mainUI.updateLeaderBoard();
            break;
        case "animationInfo":
            addEntity(packet, this.ANIMATION_LIST, Entity.Animation);
            break;
        case "bracketInfo":
            if (this.SELFID === packet.playerId) {
                this.BRACKET = new Entity.Bracket(packet, this);
            }
            break;
        case "UIInfo":
            if (this.SELFID === packet.playerId) {
                this.mainUI.open(packet);
            }
            break;
        case "selfId":
            this.SELFID = packet.selfId;
            this.mainUI.gameUI.open();
            break;
        case "chatInfo":
            this.mainUI.gameUI.chatUI.addMessage(packet);
            break;
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
            this.mainUI.updateLeaderBoard();
            break;
        case "UIInfo":
            if (this.SELFID === packet.playerId) {
                this.mainUI.update(packet);
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
            var index = array.indexOf(packet.id);
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
            this.mainUI.updateLeaderBoard();
            break;
        case "animationInfo":
            deleteEntity(packet, this.ANIMATION_LIST);
            break;
        case "laserInfo":
            deleteEntity(packet, this.LASER_LIST);
            break;
        case "bracketInfo":
            if (this.SELFID === packet.id) {
                this.BRACKET = null;
            }
            break;
        case "UIInfo":
            if (this.SELFID === packet.id) {
                this.mainUI.close(packet.action);
            }
            break;
    }
};

Client.prototype.drawScene = function (data) {
    var id;
    var selfPlayer = this.CONTROLLER_LIST[this.SELFID];
    var entityList = [
        this.TILE_LIST,
        this.CONTROLLER_LIST,
        this.SHARD_LIST,
        this.LASER_LIST,
        this.HOME_LIST,
        this.FACTION_LIST,
        this.ANIMATION_LIST
    ];
    var inBounds = function (player, x, y) {
        var range = this.mainCanvas.width / (0.7 * this.scaleFactor);
        return x < (player.x + range) && x > (player.x - range)
            && y < (player.y + range) && y > (player.y - range);
    }.bind(this);
    var drawConnectors = function () {
        for (var id in this.HOME_LIST) {
            this.draftCtx.beginPath();
            var home = this.HOME_LIST[id];
            if (home.neighbors) {
                for (var i = 0; i < home.neighbors.length; i++) {
                    var neighbor = this.HOME_LIST[home.neighbors[i]];
                    this.draftCtx.moveTo(home.x, home.y);

                    this.draftCtx.strokeStyle = "#912381";
                    this.draftCtx.lineWidth = 10;

                    this.draftCtx.lineTo(neighbor.x, neighbor.y);
                    this.draftCtx.stroke();
                }
            }
        }
    }.bind(this);
    var translateScene = function () {
        this.draftCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.scaleFactor = lerp(this.scaleFactor, this.mainScaleFactor, 0.3);

        this.draftCtx.translate(this.mainCanvas.width / 2, this.mainCanvas.height / 2);
        this.draftCtx.scale(this.scaleFactor, this.scaleFactor);
        this.draftCtx.translate(-selfPlayer.x, -selfPlayer.y);
    }.bind(this);


    if (!selfPlayer) {
        return;
    }

    this.mainCtx.clearRect(0, 0, 11000, 11000);
    this.draftCtx.clearRect(0, 0, 11000, 11000);

    this.draftCtx.fillStyle = "#000000";
    this.draftCtx.fillRect(0, 0, 10000, 10000);


    for (var i = 0; i < entityList.length; i++) {
        var list = entityList[i];
        for (id in list) {
            var entity = list[id];
            if (inBounds(selfPlayer, entity.x, entity.y)) {
                entity.show();
            }
        }
    }
    if (this.BRACKET) {
        this.BRACKET.show();
    }
    if (this.ARROW) {
        this.ARROW.show();
    }
    drawConnectors(); //fix this, as right now buildings are drawn first
    translateScene();

    this.mainCtx.drawImage(this.draftCanvas, 0, 0);
};


function lerp(a, b, ratio) {
    return a + ratio * (b - a);
}


module.exports = Client;
},{"./entity":12,"./ui/MainUI":14}],2:[function(require,module,exports){
function Animation(animationInfo, client) {
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

    this.client = client;
}


Animation.prototype.show = function () {
    var home;
    var ctx = this.client.draftCtx;
    if (this.type === "addShard") {
        console.log("DRAWING ADD SHARD ANIMATION");
        home = this.client.HOME_LIST[this.id];
        if (!home) {
            return;
        }
        ctx.beginPath();
        ctx.lineWidth = 3 * this.timer;
        ctx.strokeStyle = "#012CCC";
        ctx.arc(home.x, home.y, home.radius, 0, this.timer / 1.2, true);
        ctx.stroke();
        ctx.closePath();
    }

    if (this.type === "removeShard") {
        home = this.client.HOME_LIST[this.id];
        if (!home) {
            delete this.client.ANIMATION_LIST[id];
            return;
        }
        ctx.beginPath();
        ctx.lineWidth = 15 - this.timer;
        ctx.strokeStyle = "rgba(255, 0, 0, " + this.timer * 10 / 100 + ")";
        ctx.arc(home.x, home.y, home.radius, 0, 2 * Math.PI, false);
        ctx.stroke();
        ctx.closePath();
    }

    if (this.type === "shardDeath") {
        ctx.font = 60 - this.timer + "px Arial";
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(-Math.PI / 50 * this.theta);
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255, 168, 86, " + this.timer * 10 / 100 + ")";
        ctx.fillText(this.name, 0, 15);
        ctx.restore();

        ctx.fillStyle = "#000000";
        this.theta = lerp(this.theta, 0, 0.08);
        this.x = lerp(this.x, this.endX, 0.1);
        this.y = lerp(this.y, this.endY, 0.1);
    }

    this.timer--;
    if (this.timer <= 0) {
        delete this.client.ANIMATION_LIST[this.id];
    }
};


function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

function lerp(a, b, ratio) {
    return a + ratio * (b - a);
}

module.exports = Animation;
},{}],3:[function(require,module,exports){
function Arrow(x, y, client) {
    this.preX = x;
    this.preY = y;
    this.postX = x;
    this.postY = y;
    this.deltaX = function () {
        return this.postX - mainCanvas.width / 2;
    };
    this.deltaY = function () {
        return this.postY - mainCanvas.height / 2;
    };

    this.client = client;
}

Arrow.prototype.show = function () {
    var canvas = this.client.draftCanvas;
    var ctx = this.client.draftCtx;
    var selfPlayer = this.client.CONTROLLER_LIST[this.client.SELFID];
    var scaleFactor = this.client.scaleFactor;

    if (this.postX) {
        ctx.beginPath();
        ctx.strokeStyle = "#521522";
        ctx.fillStyle = "rgba(52, 175, 216, 0.3)";

        var preX = selfPlayer.x + (this.preX - canvas.width / 2) / scaleFactor;
        var preY = selfPlayer.y + (this.preY - canvas.height / 2) / scaleFactor;

        var postX = selfPlayer.x + (this.postX - canvas.width / 2) / scaleFactor;
        var postY = selfPlayer.y + (this.postY - canvas.height / 2) / scaleFactor;

        ctx.fillRect(preX, preY, postX - preX, postY - preY);

        ctx.arc(postX, postY, 3, 0, 2 * Math.PI, true);
        ctx.stroke();
        ctx.closePath();
    }

};


module.exports = Arrow;
},{}],4:[function(require,module,exports){
function Bracket(bracketInfo, client) {
    var tile = client.TILE_LIST[bracketInfo.tileId];

    this.x = tile.x;
    this.y = tile.y;
    this.length = tile.length;

    this.client = client;
}

Bracket.prototype.show = function () {
    var ctx = this.client.draftCtx;

    ctx.beginPath();
    ctx.fillStyle = "rgba(100,211,211,0.6)";
    ctx.fillRect(this.x, this.y, this.length, this.length);
    ctx.closePath();
};

module.exports = Bracket;
},{}],5:[function(require,module,exports){
function Controller(controllerInfo, client) {
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
    this.radius = controllerInfo.radius;
    this.stealth = controllerInfo.stealth;

    this.client = client;
}

Controller.prototype.update = function (controllerInfo) {
    this.x = controllerInfo.x;
    this.y = controllerInfo.y;
    this.health = controllerInfo.health;
    this.maxHealth = controllerInfo.maxHealth;
    this.selected = controllerInfo.selected;
    this.theta = controllerInfo.theta;
    this.level = controllerInfo.level;
    this.stealth = controllerInfo.stealth;
};

Controller.prototype.show = function () {
    var ctx = this.client.draftCtx;
    var selfId = this.client.SELFID;
    var fillAlpha;
    var strokeAlpha;
    var i;

    if (this.stealth) {
        if (this.id !== selfId && this.owner !== selfId) {
            return;
        } else {
            fillAlpha = 0.1;
            strokeAlpha = 0.3;
        }
    } else {
        fillAlpha = this.health / (4 * this.maxHealth);
        strokeAlpha = 1;
    }
    ctx.font = "20px Arial";
    ctx.strokeStyle = "rgba(252, 102, 37," + strokeAlpha + ")";

    ctx.fillStyle = "rgba(123,0,0," + fillAlpha + ")";
    ctx.lineWidth = 10;

    ctx.beginPath();
    //draw player object
    if (this.type === "Player") {
        var radius = 30;
        ctx.moveTo(this.x + radius, this.y);
        for (i = Math.PI / 4; i <= 2 * Math.PI - Math.PI / 4; i += Math.PI / 4) {
            theta = i + getRandom(-(this.maxHealth / this.health) / 7, (this.maxHealth / this.health) / 7);
            x = radius * Math.cos(theta);
            y = radius * Math.sin(theta);
            ctx.lineTo(this.x + x, this.y + y);
        }
        ctx.lineTo(this.x + radius, this.y + 3);
        ctx.stroke();
        ctx.fill();
    }
    else { //bot
        var x, y, theta, startX, startY;
        var smallRadius = 12;
        var bigRadius = this.radius;

        theta = this.theta;
        startX = bigRadius * Math.cos(theta);
        startY = bigRadius * Math.sin(theta);
        ctx.moveTo(this.x + startX, this.y + startY);
        for (i = 1; i <= 2; i++) {
            theta = this.theta + 2 * Math.PI / 3 * i +
                getRandom(-this.maxHealth / this.health / 7, this.maxHealth / this.health / 7);
            x = smallRadius * Math.cos(theta);
            y = smallRadius * Math.sin(theta);
            ctx.lineTo(this.x + x, this.y + y);
        }
        ctx.lineTo(this.x + startX, this.y + startY);
        ctx.fill();
    }

    ctx.fillStyle = "#ff9d60";
    ctx.fillText(this.name, this.x, this.y + 70);
    if (this.selected && this.owner === this.client.SELFID) {
        ctx.lineWidth = 5;
        ctx.strokeStyle = "#1d55af";
        ctx.stroke();
    }
    ctx.closePath();
};


function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

module.exports = Controller;
},{}],6:[function(require,module,exports){
function Faction(factionInfo, client) {
    this.id = factionInfo.id;
    this.name = factionInfo.name;
    this.x = factionInfo.x;
    this.y = factionInfo.y;
    this.size = factionInfo.size;

    this.client = client;
}

Faction.prototype.update = function (factionInfo) {
    this.x = factionInfo.x;
    this.y = factionInfo.y;
    this.size = factionInfo.size;

};

Faction.prototype.show = function () {
    var ctx = this.client.draftCtx;
    ctx.beginPath();
    ctx.strokeStyle = "#2d3542";
    ctx.lineWidth = 2;
    ctx.fillStyle = "#FFFFFF";
    ctx.font = this.size * 60 + "px Arial";
    ctx.textAlign = "center";
    ctx.fillText(this.name, this.x, this.y);
    ctx.strokeText(this.name, this.x, this.y);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
};

module.exports = Faction;
},{}],7:[function(require,module,exports){
function Home(homeInfo, client) {
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

    this.client = client;
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

module.exports = Home;


Home.prototype.show = function () {
    var ctx = this.client.draftCtx;
    ctx.beginPath();
    if (this.neighbors.length >= 4) {
        ctx.fillStyle = "#4169e1";
    } else {
        ctx.fillStyle = "#396a6d";
    }

    ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
    ctx.fill();

    var selfPlayer = this.client.CONTROLLER_LIST[this.client.SELFID];

    if (inBoundsClose(selfPlayer, this.x, this.y)) {
        if (this.faction)
            ctx.strokeStyle = "rgba(12, 255, 218, 0.7)";
        ctx.lineWidth = 10;
        ctx.stroke();
    }

    if (this.owner !== null) {
        ctx.fillText(this.shards.length, this.x, this.y + 40);
    }
    ctx.closePath();
};


function inBoundsClose(player, x, y) {
    var range = 150;
    return x < (player.x + range) && x > (player.x - 5 / 4 * range)
        && y < (player.y + range) && y > (player.y - 5 / 4 * range);
}

},{}],8:[function(require,module,exports){
function Laser(laserInfo, client) {
    this.id = laserInfo.id;
    this.owner = laserInfo.owner;
    this.target = laserInfo.target;

    this.client = client;
}

Laser.prototype.show = function () {
    var ctx = this.client.draftCtx;
    var target = this.client.CONTROLLER_LIST[this.target];
    var owner = this.client.CONTROLLER_LIST[this.owner];

    if (target && owner) {
        ctx.beginPath();
        ctx.moveTo(owner.x, owner.y);
        ctx.strokeStyle = "#912222";
        ctx.lineWidth = 10;
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
    }
};

module.exports = Laser;
},{}],9:[function(require,module,exports){
function MiniMap() { //deprecated, please update
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

module.exports = MiniMap;
},{}],10:[function(require,module,exports){
function Shard(thisInfo, client) {
    this.id = thisInfo.id;
    this.x = thisInfo.x;
    this.y = thisInfo.y;
    this.name = thisInfo.name;
    this.visible = thisInfo.visible;

    this.client = client;
}

Shard.prototype.update = function (thisInfo) {
    this.x = thisInfo.x;
    this.y = thisInfo.y;
    this.visible = thisInfo.visible;
    this.name = thisInfo.name;
};


Shard.prototype.show = function () {
    var ctx = this.client.draftCtx;
    ctx.lineWidth = 2;

    if (this.visible) {
        ctx.beginPath();
        if (this.name !== null) {
            ctx.font = "30px Arial";
            ctx.fillText(this.name, this.x, this.y);
        }
        ctx.fillStyle = "rgba(100, 255, 227, 0.1)";
        ctx.arc(this.x, this.y, getRandom(20, 40), 0, 2 * Math.PI, false);
        ctx.fill();
        ctx.closePath();

        ctx.beginPath();
        ctx.fillStyle = "#dfff42";

        var radius = 10, i;
        var startTheta = getRandom(0, 0.2);
        var theta = 0;
        var startX = radius * Math.cos(startTheta);
        var startY = radius * Math.sin(startTheta);
        ctx.moveTo(this.x + startX, this.y + startY);
        for (i = Math.PI / 2; i <= 2 * Math.PI - Math.PI / 2; i += Math.PI / 2) {
            theta = startTheta + i + getRandom(-1 / 24, 1 / 24);
            var x = radius * Math.cos(theta);
            var y = radius * Math.sin(theta);
            ctx.lineTo(this.x + x, this.y + y);
        }
        ctx.lineTo(this.x + startX, this.y + startY);
        ctx.stroke();
        ctx.fill();
        ctx.closePath();
    }
};


function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

module.exports = Shard;
},{}],11:[function(require,module,exports){
function Tile(thisInfo, client) {
    this.id = thisInfo.id;
    this.x = thisInfo.x;
    this.y = thisInfo.y;
    this.length = thisInfo.length;
    this.color = thisInfo.color;
    this.alert = thisInfo.alert;
    this.random = Math.floor(getRandom(0, 3));

    this.client = client;
}

Tile.prototype.update = function (thisInfo) {
    this.color = thisInfo.color;
    this.alert = thisInfo.alert;
};

Tile.prototype.show = function () {
    var ctx = this.client.draftCtx;
    ctx.beginPath();
    ctx.fillStyle = "rgb(" +
        this.color.r + "," +
        this.color.g + "," +
        this.color.b +
        ")";
    ctx.strokeStyle = "#000000";

    ctx.lineWidth = 100;

    ctx.rect(this.x, this.y, this.length, this.length);
    ctx.stroke();
    ctx.fill();
};


module.exports = Tile;


function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}
},{}],12:[function(require,module,exports){
module.exports = {
    Animation: require('./Animation'),
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
},{"./Animation":2,"./Arrow":3,"./Bracket":4,"./Controller":5,"./Faction":6,"./Home":7,"./Laser":8,"./MiniMap":9,"./Shard":10,"./Tile":11}],13:[function(require,module,exports){
var Client = require('./Client.js');
var MainUI = require('./ui/MainUI');

var client = new Client();


document.onkeydown = function (event) {
    if (client.CHAT_OPEN) {
        return;
    }

    if (event.keyCode === 84) {
        client.mainUI.gameUI.chatUI.textInput.click();
    }
    client.keys[event.keyCode] = true;
    client.socket.emit('keyEvent', {id: event.keyCode, state: true});
};

document.onkeyup = function (event) {
    client.keys[event.keyCode] = false;
    client.socket.emit('keyEvent', {id: event.keyCode, state: false});
};


$(window).bind('mousewheel DOMMouseScroll', function (event) {
    if (event.ctrlKey === true) {
        event.preventDefault();
    }
    if (client.CHAT_SCROLL) {
        client.CHAT_SCROLL = false;
        return;
    }

    if(event.originalEvent.wheelDelta /120 > 0 && client.mainScaleFactor < 2) {
        client.mainScaleFactor += 0.2;
    }
    else if (client.mainScaleFactor > 0.7) {
        client.mainScaleFactor -= 0.2;
    }
});

document.addEventListener('contextmenu', function (e) { //prevent right-click context menu
    e.preventDefault();
}, false);
},{"./Client.js":1,"./ui/MainUI":14}],14:[function(require,module,exports){
document.documentElement.style.overflow = 'hidden';  // firefox, chrome
document.body.scroll = "no";
var PlayerNamerUI = require('./PlayerNamerUI');
var ShardNamerUI = require('./ShardNamerUI');
var GameUI = require('./game/GameUI');
var HomeUI = require("./home/HomeUI");

function MainUI(client, socket) {
    this.client = client;
    this.socket = socket;

    this.gameUI = new GameUI(this.client, this.socket, this);

    this.playerNamerUI = new PlayerNamerUI(this.client, this.socket);
    this.shardNamerUI = new ShardNamerUI(this.client, this.socket);
    this.homeUI = new HomeUI(this.client, this.socket);
}

MainUI.prototype.open = function (info) {
    var action = info.action;
    var home;

    if (action === "name shard") {
        this.shardNamerUI.open();
    }
    if (action === "home info") {
        home = this.client.HOME_LIST[info.homeId];
        this.homeUI.open(home);
    }
    if (action === "gameMsgPrompt") {
        this.gameUI.gameMsgPrompt.open(info.message);
    }
};


MainUI.prototype.close = function (action) {
    if (action === "name shard") {
        this.shardNamerUI.close();
    }
    if (action === "home info") {
        this.LIST_SCROLL = false;
        this.homeUI.close();
        this.socket.emit("removeViewer", {});
    }
    if (action === "gameMsgPrompt") {
        this.gameUI.gameMsgPrompt.close();
    }
};


MainUI.prototype.updateLeaderBoard = function () {
    var leaderboard = document.getElementById("leaderboard");
    var FACTION_ARRAY = this.client.FACTION_ARRAY;


    var factionSort = function (a, b) {
        var factionA = this.client.FACTION_LIST[a];
        var factionB = this.client.FACTION_LIST[b];
        return factionA.size - factionB.size;
    }.bind(this);

    FACTION_ARRAY.sort(factionSort);
    leaderboard.innerHTML = "";

    for (var i = FACTION_ARRAY.length - 1; i >= 0; i--) {
        var faction = this.client.FACTION_LIST[FACTION_ARRAY[i]];

        var entry = document.createElement('li');
        entry.appendChild(document.createTextNode(faction.name + " - " + faction.size));
        leaderboard.appendChild(entry);
    }
};




/** DEPRECATED METHODS **/
MainUI.prototype.update = function (info) {
    var action = info.action;
    if (action === "update queue") {
        this.homeUI.buildPage.update();
        this.homeUI.botsPage.update();
        //this.homeUI.upgradesPage.update();
    }
};



module.exports = MainUI;
},{"./PlayerNamerUI":15,"./ShardNamerUI":16,"./game/GameUI":19,"./home/HomeUI":23}],15:[function(require,module,exports){
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
},{}],16:[function(require,module,exports){
function ShardNamerUI(client, socket) {
    this.template = document.getElementById('shard_namer_ui');
    this.textInput = document.getElementById("text_input");
    this.nameShardBtn = document.getElementById("name_shard_btn");

    this.client = client;
    this.socket = socket;

    this.textInput.addEventListener("keyup", function (event) {
        if (event.keyCode === 13) {
            this.submit();
        }
    }.bind(this));
    this.nameShardBtn.addEventListener("click", function (event) {
        this.submit();
    }.bind(this));
}

ShardNamerUI.prototype.open = function () {
    this.template.style.display = 'block';
    this.textInput.focus();
};


ShardNamerUI.prototype.submit = function () {
    var text = document.getElementById("text_input").value;
    if (text !== null && text !== "") {
        this.socket.emit('textInput',
            {
                id: this.client.SELFID,
                word: text
            }
        )
    }
    this.close();
};


ShardNamerUI.prototype.close = function () {
    this.textInput.value = "";
    this.template.style.display = 'none';
};

module.exports = ShardNamerUI;

},{}],17:[function(require,module,exports){
function ChatUI(parent) {
    this.parent = parent;
    this.template = document.getElementById("chat_container");
    this.textInput = document.getElementById('chat_input');
    this.chatList = document.getElementById('chat_list');


    this.textInput.addEventListener('click', function () {
        this.textInput.focus();

        this.justOpened = true;


        this.parent.client.CHAT_OPEN = true;
        this.chatList.style.height = "80%";
        this.chatList.style.overflowY = "auto";

        this.textInput.style.background = "rgba(34, 48, 71, 1)";
    }.bind(this));

    this.textInput.addEventListener('keydown', function (e) {
        if (e.keyCode === 13) {
            this.sendMessage();
        }
    }.bind(this));

    this.textInput.addEventListener('keyup', function (e) {
        if (e.keyCode === 84 && this.justOpened) {
            this.justOpened = false;
            var value = this.textInput.value;
            this.textInput.value = value.substr(0, value.length - 1);
        }
    }.bind(this));

    this.template.addEventListener('mousewheel', function () {
        this.parent.client.CHAT_SCROLL = true;
    }.bind(this));

    this.template.addEventListener('mousedown', function () {
        this.parent.client.CHAT_CLICK = true;
    }.bind(this));
}

ChatUI.prototype.open = function (message) {
    this.template.style.display = "block";
    this.close();
};


ChatUI.prototype.close = function () {
    this.textInput.blur();
    this.parent.client.CHAT_OPEN = false;
    this.chatList.style.height = "30%";
    this.chatList.style.background = "rgba(182, 193, 211, 0.02)";
    this.textInput.style.background = "rgba(182, 193, 211, 0.1)";
    this.parent.client.CHAT_SCROLL = false;
    $('#chat_list').animate({scrollTop: $('#chat_list').prop("scrollHeight")}, 100);
    this.chatList.style.overflowY = "none";
};


ChatUI.prototype.addMessage = function (packet) {
    var entry = document.createElement('li');
    entry.appendChild(document.createTextNode(packet.name + " : " + packet.chatMessage));
    this.chatList.appendChild(entry);

    $('#chat_list').animate({scrollTop: $('#chat_list').prop("scrollHeight")}, 100);
};


ChatUI.prototype.sendMessage = function () {
    var socket = this.parent.socket;


    if (this.textInput.value && this.textInput.value !== "") {
        socket.emit('chatMessage', {
            id: this.parent.client.SELFID,
            message: this.textInput.value
        });
        this.textInput.value = "";
    }
    else {
        this.close();
    }
};

module.exports = ChatUI;



},{}],18:[function(require,module,exports){
function GameMsgPrompt(parent) {
    this.parent = parent;
    this.template = document.getElementById("prompt_container");
    this.message = document.getElementById('game_msg_prompt');
}

GameMsgPrompt.prototype.open = function (message) {
    this.template.style.display = "block";
    this.message.innerHTML = message;
};

GameMsgPrompt.prototype.close = function () {
    this.template.style.display = "none";
};

module.exports = GameMsgPrompt;



},{}],19:[function(require,module,exports){
var GameMsgPrompt = require('./GameMsgPrompt');
var ShardNamerPrompt = require('./ShardNamerPrompt');
var ChatUI = require('./ChatUI');

function GameUI(client, socket, parent) {
    this.client = client;
    this.socket = socket;
    this.parent = parent;
    this.gameMsgPrompt = new GameMsgPrompt(this);
    this.shardNamerPrompt = new ShardNamerPrompt(this);
    this.chatUI = new ChatUI(this);
}

GameUI.prototype.open = function () {
    console.log("OPENING GAME UI");
    this.shardNamerPrompt.open();
    this.chatUI.open();
};

module.exports =  GameUI;
},{"./ChatUI":17,"./GameMsgPrompt":18,"./ShardNamerPrompt":20}],20:[function(require,module,exports){
function GameMsgPrompt(parent) {
    this.template = document.getElementById('shard_namer_container');
    this.shardNamerPrompt = document.getElementById('shard_namer_prompt');
    this.parent = parent;

    this.shardNamerPrompt.addEventListener("click", function () {
        this.parent.parent.shardNamerUI.open();
    }.bind(this));
}

GameMsgPrompt.prototype.open = function (message) {
    this.template.style.display = "block";
};

GameMsgPrompt.prototype.close = function () {
    this.template.style.display = "none";
};

module.exports = GameMsgPrompt;

},{}],21:[function(require,module,exports){
var ListUI = require('./ListUI');

function BotsPage(homeUI) {
    this.template = document.getElementById("bots_page");
    this.botsListUI = new ListUI(document.getElementById('bots_list'), homeUI);
    this.homeUI = homeUI;
}

BotsPage.prototype.open = function () {
    this.template.style.display = "block";
    if (this.homeUI.home.type === "Barracks") {
        this.botsListUI.addBots();
    }
};

BotsPage.prototype.close = function () {
    this.template.style.display = "none";
};

BotsPage.prototype.update = function () {
    if (this.homeUI.home.type === "Barracks") {
        this.botsListUI.addBots();
    }
};

module.exports = BotsPage;


},{"./ListUI":24}],22:[function(require,module,exports){
var ListUI = require('./ListUI');


function BuildPage(homeUI) {
    this.template = document.getElementById("create_page");
    this.createBot = document.getElementById("create_bot_container");
    this.makeSoldierBotsBtn = document.getElementById('make_soldier_bots_btn');
    this.makeBoosterBotsBtn = document.getElementById('make_booster_bots_btn');
    this.makeStealthBotsBtn = document.getElementById('make_stealth_bots_btn');
    this.socket = homeUI.socket;

    this.SELECTED_SHARDS = {};
    this.buildQueueUI = new ListUI(document.getElementById('build_queue'), homeUI);
    this.shardsUI = new ListUI(document.getElementById('build_shards_list'), homeUI, this);
    this.homeUI = homeUI;
}


BuildPage.prototype.checkSelection = function (input) {
    var makeSoldierBotsBtn = document.getElementById('make_soldier_bots_btn');
    var makeBoosterBotsBtn = document.getElementById('make_booster_bots_btn');
    var makeStealthBotsBtn = document.getElementById('make_stealth_bots_btn');

    if (input > 0) {
        makeSoldierBotsBtn.disabled = false;
        makeBoosterBotsBtn.disabled = false;
        makeStealthBotsBtn.disabled = false;
    } else {
        makeSoldierBotsBtn.disabled = "disabled";
        makeBoosterBotsBtn.disabled = "disabled";
        makeStealthBotsBtn.disabled = "disabled";
    }
};

BuildPage.prototype.open = function () {
    this.template.style.display = "block";
    this.SELECTED_SHARDS = {};

    var makeSoldierBots = function () {
        this.socket.emit('makeBots', {
            botType: "soldier",
            home: this.homeUI.home.id,
            shards: this.SELECTED_SHARDS
        });
    }.bind(this);
    var makeBoosterBots = function () {
        this.socket.emit('makeBots', {
            botType: "booster",
            home: this.homeUI.home.id,
            shards: this.SELECTED_SHARDS
        })
    }.bind(this);
    var makeStealthBots = function () {
        this.socket.emit('makeBots', {
            botType: "stealth",
            home: this.homeUI.home.id,
            shards: this.SELECTED_SHARDS
        })
    }.bind(this);

    if (this.homeUI.home.type === "Barracks") {
        this.makeSoldierBotsBtn = this.homeUI.resetButton(this.makeSoldierBotsBtn, makeSoldierBots);
        this.makeBoosterBotsBtn = this.homeUI.resetButton(this.makeBoosterBotsBtn, makeBoosterBots);
        this.makeStealthBotsBtn = this.homeUI.resetButton(this.makeStealthBotsBtn, makeStealthBots);

        this.createBot.style.display = "flex";
        this.buildQueueUI.addQueue(this.homeUI.home);
    } else {
        this.createBot.style.display = "none";
    }
    this.shardsUI.addShards();
};

BuildPage.prototype.close = function () {
    this.template.style.display = "none";
};


BuildPage.prototype.update = function () {
    this.buildQueueUI.addQueue();
};

module.exports = BuildPage;


},{"./ListUI":24}],23:[function(require,module,exports){
var UpgradesPage = require('./UpgradesPage');
var BotsPage = require('./BotsPage');
var BuildPage = require('./BuildPage');

function HomeUI(client, socket) {
    this.client = client;
    this.socket = socket;
    this.template = document.getElementById('home_ui');
    this.home = null;
}

HomeUI.prototype.open = function (home) {
    this.template.style.display = 'block';
    this.home = home;

    if (!this.upgradesPage) {
        this.upgradesPage = new UpgradesPage(this);
        this.botsPage = new BotsPage(this);
        this.buildPage = new BuildPage(this);

        this.addTabListeners();
        this.addCloseListener();
    }

    this.openHomeInfo();
    this.upgradesPage.open();
    this.buildPage.close();
    this.botsPage.close();

    //this.openColorPicker(home);
};

HomeUI.prototype.openHomeInfo = function () {
    document.getElementById('home_type').innerHTML = this.home.type;
    document.getElementById('home_level').innerHTML = this.home.level;
    document.getElementById('home_health').innerHTML = this.home.health;
    document.getElementById('home_power').innerHTML = this.home.power;
    document.getElementById('home_faction_name').innerHTML = this.home.faction;
};

HomeUI.prototype.openColorPicker = function (home) {
    var colorPicker = document.getElementById("color_picker");
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
    }.bind(this));
};

HomeUI.prototype.addTabListeners = function () {
    var upgradesTab = document.getElementById('upgrades_tab');
    var createTab = document.getElementById('create_tab');
    var botsTab = document.getElementById('bots_tab');

    upgradesTab.addEventListener('click', function (evt) {
        this.upgradesPage.open();
        this.buildPage.close();
        this.botsPage.close();
    }.bind(this));

    createTab.addEventListener('click', function (evt) {
        this.upgradesPage.close();
        this.buildPage.open();
        this.botsPage.close();
    }.bind(this));

    botsTab.addEventListener('click', function (evt) {
        this.upgradesPage.close();
        this.buildPage.close();
        this.botsPage.open();
    }.bind(this));
};

HomeUI.prototype.addCloseListener = function () {
    var closeButton = document.getElementById("close_home_ui");
    closeButton.addEventListener("click", function () {
        this.client.mainUI.close("home info");
    }.bind(this));
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
    }.bind(this);
    var newButton = button.cloneNode(true);
    newButton.upgType = button.upgType;

    button.parentNode.replaceChild(newButton, button);
    button = newButton;
    button.addEventListener('click', callback);
    if (button.upgType) {
        setSkillMeter(button);
    }
    return button;
};

HomeUI.prototype.close = function () {
    this.template.style.display = 'none';
};

module.exports = HomeUI;

},{"./BotsPage":21,"./BuildPage":22,"./UpgradesPage":25}],24:[function(require,module,exports){
function ListUI(list, homeUI, parent) {
    this.list = list;
    this.homeUI = homeUI;
    this.client = homeUI.client;
    this.parent = parent;

    this.list.addEventListener('scroll', function (event) {
        this.homeUI.LIST_SCROLL = true;
    }.bind(this));
}

ListUI.prototype.addQueue = function () {
    var home = this.homeUI.home;
    this.list.innerHTML = "";
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
        this.list.appendChild(entry);
    }
};

ListUI.prototype.addBots = function () {
    var home = this.homeUI.home;
    this.list.innerHTML = "";
    if (!home.queue) {
        return;
    }
    for (var i = 0; i < home.bots.length; i++) {
        var botInfo = home.bots[i];
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
            botInfo.name + " -- " + "Level:" + botInfo.level));
        this.list.appendChild(entry);
    }
};

ListUI.prototype.addShards = function () {
    var home = this.homeUI.home;
    var SELECTED_SHARDS = this.parent.SELECTED_SHARDS;
    this.list.innerHTML = "";

    var checkSelection = function () {
        this.parent.checkSelection(Object.size(SELECTED_SHARDS));
    }.bind(this);

    checkSelection();
    for (var j = 0; j < home.shards.length; j++) {
        var entry = document.createElement('li');
        var shard = this.client.SHARD_LIST[home.shards[j]];


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
        this.list.appendChild(entry);
    }
};


module.exports = ListUI;

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};
},{}],25:[function(require,module,exports){
var ListUI = require('./ListUI');

function UpgradesPage(homeUI) {
    this.template = document.getElementById("upgrades_page");
    this.unitUpgrades = document.getElementById("unit_upgrades");
    this.bldBaseHealthBtn = document.getElementById('bld_home_btn');
    this.bldArmorBtn = document.getElementById('bld_armor');
    this.bldSpeedBtn = document.getElementById('bld_speed');
    this.bldDmgBtn = document.getElementById('bld_damage');

    this.SELECTED_SHARDS = {};

    this.shardsUI = new ListUI(document.getElementById("upgrades_shards_list"), homeUI, this);
    this.homeUI = homeUI;
    this.socket = this.homeUI.socket;
}

UpgradesPage.prototype.open = function () {
    this.template.style.display = "block";
    this.bldBaseHealthBtn.upgType = "homeHealth";
    this.bldArmorBtn.upgType = "armor";
    this.bldSpeedBtn.upgType = "speed";
    this.bldDmgBtn.upgType = "dmg";

    this.shardsUI.addShards();

    var bldHome = function () {
        this.socket.emit('buildHome', {
            home: this.homeUI.home.id,
            shards: this.SELECTED_SHARDS
        })
    }.bind(this);
    var upgUnit = function () { //TODO: fix upgrading units
        this.socket.emit('upgradeUnit', {
            home: this.homeUI.home.id,
            type: this.upgType,
            shards: this.SELECTED_SHARDS
        });
    }.bind(this);

    this.bldBaseHealthBtn = this.homeUI.resetButton(this.bldBaseHealthBtn, bldHome);

    if (this.homeUI.home.type === "Barracks") {
        this.unitUpgrades.style.display = "block";
        this.bldArmorBtn = this.homeUI.resetButton(this.bldArmorBtn, upgUnit);
        this.bldSpeedBtn = this.homeUI.resetButton(this.bldSpeedBtn, upgUnit);
        this.bldDmgBtn = this.homeUI.resetButton(this.bldDmgBtn, upgUnit);
    }
    else {
        this.unitUpgrades.style.display = "none";
    }
};


UpgradesPage.prototype.checkSelection = function (input) {
    var bldBaseHealthBtn = document.getElementById('bld_home_btn');
    var bldArmorBtn = document.getElementById('bld_armor');
    var bldSpeedBtn = document.getElementById('bld_speed');
    var bldDmgBtn = document.getElementById('bld_damage');

    if (input > 0) {
        bldBaseHealthBtn.disabled = false;
        bldArmorBtn.disabled = false;
        bldSpeedBtn.disabled = false;
        bldDmgBtn.disabled = false;
    } else {
        bldBaseHealthBtn.disabled = "disabled";
        bldArmorBtn.disabled = "disabled";
        bldSpeedBtn.disabled = "disabled";
        bldDmgBtn.disabled = "disabled";
    }
};


UpgradesPage.prototype.close = function () {
    this.template.style.display = "none";
};

UpgradesPage.prototype.update = function () {
    this.shardsUI.addShards()
};


module.exports = UpgradesPage;
},{"./ListUI":24}]},{},[13])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY2xpZW50L2pzL0NsaWVudC5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L0FuaW1hdGlvbi5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L0Fycm93LmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvQnJhY2tldC5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L0NvbnRyb2xsZXIuanMiLCJzcmMvY2xpZW50L2pzL2VudGl0eS9GYWN0aW9uLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvSG9tZS5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L0xhc2VyLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvTWluaU1hcC5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L1NoYXJkLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvVGlsZS5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L2luZGV4LmpzIiwic3JjL2NsaWVudC9qcy9pbmRleC5qcyIsInNyYy9jbGllbnQvanMvdWkvTWFpblVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9QbGF5ZXJOYW1lclVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9TaGFyZE5hbWVyVUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL2dhbWUvQ2hhdFVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9nYW1lL0dhbWVNc2dQcm9tcHQuanMiLCJzcmMvY2xpZW50L2pzL3VpL2dhbWUvR2FtZVVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9nYW1lL1NoYXJkTmFtZXJQcm9tcHQuanMiLCJzcmMvY2xpZW50L2pzL3VpL2hvbWUvQm90c1BhZ2UuanMiLCJzcmMvY2xpZW50L2pzL3VpL2hvbWUvQnVpbGRQYWdlLmpzIiwic3JjL2NsaWVudC9qcy91aS9ob21lL0hvbWVVSS5qcyIsInNyYy9jbGllbnQvanMvdWkvaG9tZS9MaXN0VUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL2hvbWUvVXBncmFkZXNQYWdlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBFbnRpdHkgPSByZXF1aXJlKCcuL2VudGl0eScpO1xyXG52YXIgTWFpblVJID0gcmVxdWlyZSgnLi91aS9NYWluVUknKTtcclxuXHJcbmZ1bmN0aW9uIENsaWVudCgpIHtcclxuICAgIHRoaXMuU0VMRklEID0gbnVsbDtcclxuICAgIHRoaXMuQVJST1cgPSBudWxsO1xyXG4gICAgdGhpcy5CUkFDS0VUID0gbnVsbDtcclxuICAgIHRoaXMucmlnaHRDbGljayA9IGZhbHNlO1xyXG4gICAgdGhpcy5pbml0KCk7XHJcbn1cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuaW5pdFNvY2tldCgpO1xyXG4gICAgdGhpcy5pbml0Q2FudmFzZXMoKTtcclxuICAgIHRoaXMuaW5pdExpc3RzKCk7XHJcbiAgICB0aGlzLmluaXRWaWV3ZXJzKCk7XHJcbn07XHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdFNvY2tldCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuc29ja2V0ID0gaW8oKTtcclxuICAgIHRoaXMuc29ja2V0LnZlcmlmaWVkID0gZmFsc2U7XHJcblxyXG4gICAgdGhpcy5zb2NrZXQub24oJ2FkZEZhY3Rpb25zVUknLCB0aGlzLmFkZEZhY3Rpb25zdG9VSS5iaW5kKHRoaXMpKTtcclxuICAgIHRoaXMuc29ja2V0Lm9uKCd1cGRhdGVFbnRpdGllcycsIHRoaXMuaGFuZGxlUGFja2V0LmJpbmQodGhpcykpO1xyXG4gICAgdGhpcy5zb2NrZXQub24oJ2RyYXdTY2VuZScsIHRoaXMuZHJhd1NjZW5lLmJpbmQodGhpcykpO1xyXG4gICAgdGhpcy5zb2NrZXQub24oJ2NoYXRNZXNzYWdlJywgdGhpcy5tYWluVUkpXHJcbn07XHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdENhbnZhc2VzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5tYWluQ2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtYWluX2NhbnZhc1wiKTtcclxuICAgIHRoaXMuZHJhZnRDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpO1xyXG4gICAgdGhpcy5kcmFmdENhbnZhcy5zdHlsZS5ib3JkZXIgPSAnMXB4IHNvbGlkICMwMDAwMDAnO1xyXG5cclxuICAgIHRoaXMubWFpbkNhbnZhcy5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgIHRoaXMuZHJhZnRDYW52YXMuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG5cclxuICAgIHRoaXMuZHJhZnRDYW52YXMuaGVpZ2h0ID0gdGhpcy5tYWluQ2FudmFzLmhlaWdodDtcclxuICAgIHRoaXMuZHJhZnRDYW52YXMud2lkdGggPSB0aGlzLm1haW5DYW52YXMud2lkdGg7XHJcblxyXG4gICAgdGhpcy5tYWluQ3R4ID0gdGhpcy5tYWluQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuICAgIHRoaXMuZHJhZnRDdHggPSB0aGlzLmRyYWZ0Q2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuXHJcblxyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBpZiAoZXZlbnQuYnV0dG9uID09PSAyKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmlnaHRDbGljayA9IHRydWU7XHJcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLkNPTlRST0xMRVJfTElTVFt0aGlzLlNFTEZJRF0pIHtcclxuICAgICAgICAgICAgdGhpcy5BUlJPVyA9IG5ldyBFbnRpdHkuQXJyb3coZXZlbnQueCAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRXaWR0aCAqIDEwMDAsXHJcbiAgICAgICAgICAgICAgICBldmVudC55IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldEhlaWdodCAqIDUwMCwgdGhpcyk7XHJcbiAgICAgICAgfVxyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBpZiAoIXRoaXMuQ0hBVF9DTElDSykge1xyXG4gICAgICAgICAgICB0aGlzLm1haW5VSS5nYW1lVUkuY2hhdFVJLmNsb3NlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghdGhpcy5yaWdodENsaWNrKSB7XHJcbiAgICAgICAgICAgIHRoaXMuQVJST1cucG9zdFggPSBldmVudC54IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldFdpZHRoICogMTAwMDtcclxuICAgICAgICAgICAgdGhpcy5BUlJPVy5wb3N0WSA9IGV2ZW50LnkgLyB0aGlzLm1haW5DYW52YXMub2Zmc2V0SGVpZ2h0ICogNTAwO1xyXG5cclxuICAgICAgICAgICAgdmFyIG1pbnggPSAodGhpcy5BUlJPVy5wcmVYIC0gdGhpcy5kcmFmdENhbnZhcy53aWR0aCAvIDIpIC8gdGhpcy5zY2FsZUZhY3RvcjtcclxuICAgICAgICAgICAgdmFyIG1pbnkgPSAodGhpcy5BUlJPVy5wcmVZIC0gdGhpcy5kcmFmdENhbnZhcy5oZWlnaHQgLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3I7XHJcbiAgICAgICAgICAgIHZhciBtYXh4ID0gKHRoaXMuQVJST1cucG9zdFggLSB0aGlzLmRyYWZ0Q2FudmFzLndpZHRoIC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yO1xyXG4gICAgICAgICAgICB2YXIgbWF4eSA9ICh0aGlzLkFSUk9XLnBvc3RZIC0gdGhpcy5kcmFmdENhbnZhcy5oZWlnaHQgLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3I7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNvY2tldC5lbWl0KFwic2VsZWN0Qm90c1wiLCB7XHJcbiAgICAgICAgICAgICAgICBtaW5YOiBNYXRoLm1pbihtaW54LCBtYXh4KSxcclxuICAgICAgICAgICAgICAgIG1pblk6IE1hdGgubWluKG1pbnksIG1heHkpLFxyXG4gICAgICAgICAgICAgICAgbWF4WDogTWF0aC5tYXgobWlueCwgbWF4eCksXHJcbiAgICAgICAgICAgICAgICBtYXhZOiBNYXRoLm1heChtaW55LCBtYXh5KVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHZhciB4ID0gZXZlbnQueCAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRXaWR0aCAqIDEwMDA7XHJcbiAgICAgICAgICAgIHZhciB5ID0gZXZlbnQueSAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRIZWlnaHQgKiA1MDA7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNvY2tldC5lbWl0KFwiYm90Q29tbWFuZFwiLCB7XHJcbiAgICAgICAgICAgICAgICB4OiAoeCAtIHRoaXMuZHJhZnRDYW52YXMud2lkdGggLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3IsXHJcbiAgICAgICAgICAgICAgICB5OiAoeSAtIHRoaXMuZHJhZnRDYW52YXMuaGVpZ2h0IC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5yaWdodENsaWNrID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5BUlJPVyA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5DSEFUX0NMSUNLID0gZmFsc2U7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgaWYgKHRoaXMuQVJST1cpIHtcclxuICAgICAgICAgICAgdGhpcy5BUlJPVy5wb3N0WCA9IGV2ZW50LnggLyB0aGlzLm1haW5DYW52YXMub2Zmc2V0V2lkdGggKiAxMDAwO1xyXG4gICAgICAgICAgICB0aGlzLkFSUk9XLnBvc3RZID0gZXZlbnQueSAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRIZWlnaHQgKiA1MDA7XHJcbiAgICAgICAgfVxyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxufTtcclxuQ2xpZW50LnByb3RvdHlwZS5pbml0TGlzdHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLkZBQ1RJT05fTElTVCA9IHt9O1xyXG4gICAgdGhpcy5GQUNUSU9OX0FSUkFZID0gW107XHJcblxyXG4gICAgdGhpcy5DT05UUk9MTEVSX0xJU1QgPSB7fTtcclxuICAgIHRoaXMuVElMRV9MSVNUID0ge307XHJcbiAgICB0aGlzLlNIQVJEX0xJU1QgPSB7fTtcclxuICAgIHRoaXMuTEFTRVJfTElTVCA9IHt9O1xyXG4gICAgdGhpcy5IT01FX0xJU1QgPSB7fTtcclxuICAgIHRoaXMuQU5JTUFUSU9OX0xJU1QgPSB7fTtcclxufTtcclxuQ2xpZW50LnByb3RvdHlwZS5pbml0Vmlld2VycyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMua2V5cyA9IFtdO1xyXG4gICAgdGhpcy5zY2FsZUZhY3RvciA9IDE7XHJcbiAgICB0aGlzLm1haW5TY2FsZUZhY3RvciA9IDE7XHJcbiAgICB0aGlzLm1haW5VSSA9IG5ldyBNYWluVUkodGhpcywgdGhpcy5zb2NrZXQpO1xyXG5cclxuICAgIHRoaXMubWFpblVJLnBsYXllck5hbWVyVUkub3BlbigpO1xyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5hZGRGYWN0aW9uc3RvVUkgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgaWYgKCF0aGlzLnNvY2tldC52ZXJpZmllZCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiVkVSSUZJRUQgQ0xJRU5UXCIpO1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJ2ZXJpZnlcIiwge30pO1xyXG4gICAgICAgIHRoaXMuc29ja2V0LnZlcmlmaWVkID0gdHJ1ZTtcclxuICAgIH1cclxuICAgIHZhciBmYWN0aW9ucyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmYWN0aW9ucycpO1xyXG4gICAgdmFyIHBhY2tldCA9IGRhdGEuZmFjdGlvbnM7XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYWNrZXQubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgbmFtZSA9IHBhY2tldFtpXTtcclxuICAgICAgICB2YXIgb3B0aW9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnb3B0aW9uJyk7XHJcbiAgICAgICAgb3B0aW9uLnZhbHVlID0gbmFtZTtcclxuICAgICAgICBmYWN0aW9ucy5hcHBlbmRDaGlsZChvcHRpb24pO1xyXG4gICAgfVxyXG59OyAvL2NoYW5nZSBtZXRob2QgbmFtZSBhbmQgbG9jYXRpb25cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaGFuZGxlUGFja2V0ID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgIHZhciBwYWNrZXQsIGk7XHJcbiAgICBmb3IgKGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHBhY2tldCA9IGRhdGFbaV07XHJcbiAgICAgICAgc3dpdGNoIChwYWNrZXQubWFzdGVyKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJhZGRcIjpcclxuICAgICAgICAgICAgICAgIHRoaXMuYWRkRW50aXRpZXMocGFja2V0KTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwiZGVsZXRlXCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRlbGV0ZUVudGl0aWVzKHBhY2tldCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcInVwZGF0ZVwiOlxyXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVFbnRpdGllcyhwYWNrZXQpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5hZGRFbnRpdGllcyA9IGZ1bmN0aW9uIChwYWNrZXQpIHtcclxuICAgIHZhciBhZGRFbnRpdHkgPSBmdW5jdGlvbiAocGFja2V0LCBsaXN0LCBlbnRpdHksIGFycmF5KSB7XHJcbiAgICAgICAgaWYgKCFwYWNrZXQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsaXN0W3BhY2tldC5pZF0gPSBuZXcgZW50aXR5KHBhY2tldCwgdGhpcyk7XHJcbiAgICAgICAgaWYgKGFycmF5ICYmIGFycmF5LmluZGV4T2YocGFja2V0LmlkKSA9PT0gLTEpIHtcclxuICAgICAgICAgICAgYXJyYXkucHVzaChwYWNrZXQuaWQpO1xyXG4gICAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKTtcclxuXHJcbiAgICBzd2l0Y2ggKHBhY2tldC5jbGFzcykge1xyXG4gICAgICAgIGNhc2UgXCJ0aWxlSW5mb1wiOlxyXG4gICAgICAgICAgICBhZGRFbnRpdHkocGFja2V0LCB0aGlzLlRJTEVfTElTVCwgRW50aXR5LlRpbGUpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiY29udHJvbGxlckluZm9cIjpcclxuICAgICAgICAgICAgYWRkRW50aXR5KHBhY2tldCwgdGhpcy5DT05UUk9MTEVSX0xJU1QsIEVudGl0eS5Db250cm9sbGVyKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcInNoYXJkSW5mb1wiOlxyXG4gICAgICAgICAgICBhZGRFbnRpdHkocGFja2V0LCB0aGlzLlNIQVJEX0xJU1QsIEVudGl0eS5TaGFyZCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJsYXNlckluZm9cIjpcclxuICAgICAgICAgICAgYWRkRW50aXR5KHBhY2tldCwgdGhpcy5MQVNFUl9MSVNULCBFbnRpdHkuTGFzZXIpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiaG9tZUluZm9cIjpcclxuICAgICAgICAgICAgYWRkRW50aXR5KHBhY2tldCwgdGhpcy5IT01FX0xJU1QsIEVudGl0eS5Ib21lKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImZhY3Rpb25JbmZvXCI6XHJcbiAgICAgICAgICAgIGFkZEVudGl0eShwYWNrZXQsIHRoaXMuRkFDVElPTl9MSVNULCBFbnRpdHkuRmFjdGlvbiwgdGhpcy5GQUNUSU9OX0FSUkFZKTtcclxuICAgICAgICAgICAgdGhpcy5tYWluVUkudXBkYXRlTGVhZGVyQm9hcmQoKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImFuaW1hdGlvbkluZm9cIjpcclxuICAgICAgICAgICAgYWRkRW50aXR5KHBhY2tldCwgdGhpcy5BTklNQVRJT05fTElTVCwgRW50aXR5LkFuaW1hdGlvbik7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJicmFja2V0SW5mb1wiOlxyXG4gICAgICAgICAgICBpZiAodGhpcy5TRUxGSUQgPT09IHBhY2tldC5wbGF5ZXJJZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5CUkFDS0VUID0gbmV3IEVudGl0eS5CcmFja2V0KHBhY2tldCwgdGhpcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcIlVJSW5mb1wiOlxyXG4gICAgICAgICAgICBpZiAodGhpcy5TRUxGSUQgPT09IHBhY2tldC5wbGF5ZXJJZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tYWluVUkub3BlbihwYWNrZXQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJzZWxmSWRcIjpcclxuICAgICAgICAgICAgdGhpcy5TRUxGSUQgPSBwYWNrZXQuc2VsZklkO1xyXG4gICAgICAgICAgICB0aGlzLm1haW5VSS5nYW1lVUkub3BlbigpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiY2hhdEluZm9cIjpcclxuICAgICAgICAgICAgdGhpcy5tYWluVUkuZ2FtZVVJLmNoYXRVSS5hZGRNZXNzYWdlKHBhY2tldCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS51cGRhdGVFbnRpdGllcyA9IGZ1bmN0aW9uIChwYWNrZXQpIHtcclxuICAgIGZ1bmN0aW9uIHVwZGF0ZUVudGl0eShwYWNrZXQsIGxpc3QpIHtcclxuICAgICAgICBpZiAoIXBhY2tldCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBlbnRpdHkgPSBsaXN0W3BhY2tldC5pZF07XHJcbiAgICAgICAgaWYgKCFlbnRpdHkpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbnRpdHkudXBkYXRlKHBhY2tldCk7XHJcbiAgICB9XHJcblxyXG4gICAgc3dpdGNoIChwYWNrZXQuY2xhc3MpIHtcclxuICAgICAgICBjYXNlIFwiY29udHJvbGxlckluZm9cIjpcclxuICAgICAgICAgICAgdXBkYXRlRW50aXR5KHBhY2tldCwgdGhpcy5DT05UUk9MTEVSX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwidGlsZUluZm9cIjpcclxuICAgICAgICAgICAgdXBkYXRlRW50aXR5KHBhY2tldCwgdGhpcy5USUxFX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwic2hhcmRJbmZvXCI6XHJcbiAgICAgICAgICAgIHVwZGF0ZUVudGl0eShwYWNrZXQsIHRoaXMuU0hBUkRfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJob21lSW5mb1wiOlxyXG4gICAgICAgICAgICB1cGRhdGVFbnRpdHkocGFja2V0LCB0aGlzLkhPTUVfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJmYWN0aW9uSW5mb1wiOlxyXG4gICAgICAgICAgICB1cGRhdGVFbnRpdHkocGFja2V0LCB0aGlzLkZBQ1RJT05fTElTVCk7XHJcbiAgICAgICAgICAgIHRoaXMubWFpblVJLnVwZGF0ZUxlYWRlckJvYXJkKCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJVSUluZm9cIjpcclxuICAgICAgICAgICAgaWYgKHRoaXMuU0VMRklEID09PSBwYWNrZXQucGxheWVySWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWFpblVJLnVwZGF0ZShwYWNrZXQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5kZWxldGVFbnRpdGllcyA9IGZ1bmN0aW9uIChwYWNrZXQpIHtcclxuICAgIHZhciBkZWxldGVFbnRpdHkgPSBmdW5jdGlvbiAocGFja2V0LCBsaXN0LCBhcnJheSkge1xyXG4gICAgICAgIGlmICghcGFja2V0KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGFycmF5KSB7XHJcbiAgICAgICAgICAgIHZhciBpbmRleCA9IGFycmF5LmluZGV4T2YocGFja2V0LmlkKTtcclxuICAgICAgICAgICAgYXJyYXkuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZGVsZXRlIGxpc3RbcGFja2V0LmlkXTtcclxuICAgIH07XHJcblxyXG4gICAgc3dpdGNoIChwYWNrZXQuY2xhc3MpIHtcclxuICAgICAgICBjYXNlIFwidGlsZUluZm9cIjpcclxuICAgICAgICAgICAgZGVsZXRlRW50aXR5KHBhY2tldCwgdGhpcy5USUxFX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiY29udHJvbGxlckluZm9cIjpcclxuICAgICAgICAgICAgZGVsZXRlRW50aXR5KHBhY2tldCwgdGhpcy5DT05UUk9MTEVSX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwic2hhcmRJbmZvXCI6XHJcbiAgICAgICAgICAgIGRlbGV0ZUVudGl0eShwYWNrZXQsIHRoaXMuU0hBUkRfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJob21lSW5mb1wiOlxyXG4gICAgICAgICAgICBkZWxldGVFbnRpdHkocGFja2V0LCB0aGlzLkhPTUVfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJmYWN0aW9uSW5mb1wiOlxyXG4gICAgICAgICAgICBkZWxldGVFbnRpdHkocGFja2V0LCB0aGlzLkZBQ1RJT05fTElTVCwgdGhpcy5GQUNUSU9OX0FSUkFZKTtcclxuICAgICAgICAgICAgdGhpcy5tYWluVUkudXBkYXRlTGVhZGVyQm9hcmQoKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImFuaW1hdGlvbkluZm9cIjpcclxuICAgICAgICAgICAgZGVsZXRlRW50aXR5KHBhY2tldCwgdGhpcy5BTklNQVRJT05fTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJsYXNlckluZm9cIjpcclxuICAgICAgICAgICAgZGVsZXRlRW50aXR5KHBhY2tldCwgdGhpcy5MQVNFUl9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImJyYWNrZXRJbmZvXCI6XHJcbiAgICAgICAgICAgIGlmICh0aGlzLlNFTEZJRCA9PT0gcGFja2V0LmlkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLkJSQUNLRVQgPSBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJVSUluZm9cIjpcclxuICAgICAgICAgICAgaWYgKHRoaXMuU0VMRklEID09PSBwYWNrZXQuaWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWFpblVJLmNsb3NlKHBhY2tldC5hY3Rpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5kcmF3U2NlbmUgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgdmFyIGlkO1xyXG4gICAgdmFyIHNlbGZQbGF5ZXIgPSB0aGlzLkNPTlRST0xMRVJfTElTVFt0aGlzLlNFTEZJRF07XHJcbiAgICB2YXIgZW50aXR5TGlzdCA9IFtcclxuICAgICAgICB0aGlzLlRJTEVfTElTVCxcclxuICAgICAgICB0aGlzLkNPTlRST0xMRVJfTElTVCxcclxuICAgICAgICB0aGlzLlNIQVJEX0xJU1QsXHJcbiAgICAgICAgdGhpcy5MQVNFUl9MSVNULFxyXG4gICAgICAgIHRoaXMuSE9NRV9MSVNULFxyXG4gICAgICAgIHRoaXMuRkFDVElPTl9MSVNULFxyXG4gICAgICAgIHRoaXMuQU5JTUFUSU9OX0xJU1RcclxuICAgIF07XHJcbiAgICB2YXIgaW5Cb3VuZHMgPSBmdW5jdGlvbiAocGxheWVyLCB4LCB5KSB7XHJcbiAgICAgICAgdmFyIHJhbmdlID0gdGhpcy5tYWluQ2FudmFzLndpZHRoIC8gKDAuNyAqIHRoaXMuc2NhbGVGYWN0b3IpO1xyXG4gICAgICAgIHJldHVybiB4IDwgKHBsYXllci54ICsgcmFuZ2UpICYmIHggPiAocGxheWVyLnggLSByYW5nZSlcclxuICAgICAgICAgICAgJiYgeSA8IChwbGF5ZXIueSArIHJhbmdlKSAmJiB5ID4gKHBsYXllci55IC0gcmFuZ2UpO1xyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG4gICAgdmFyIGRyYXdDb25uZWN0b3JzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGZvciAodmFyIGlkIGluIHRoaXMuSE9NRV9MSVNUKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZHJhZnRDdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgICAgIHZhciBob21lID0gdGhpcy5IT01FX0xJU1RbaWRdO1xyXG4gICAgICAgICAgICBpZiAoaG9tZS5uZWlnaGJvcnMpIHtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaG9tZS5uZWlnaGJvcnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgbmVpZ2hib3IgPSB0aGlzLkhPTUVfTElTVFtob21lLm5laWdoYm9yc1tpXV07XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kcmFmdEN0eC5tb3ZlVG8oaG9tZS54LCBob21lLnkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRyYWZ0Q3R4LnN0cm9rZVN0eWxlID0gXCIjOTEyMzgxXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kcmFmdEN0eC5saW5lV2lkdGggPSAxMDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kcmFmdEN0eC5saW5lVG8obmVpZ2hib3IueCwgbmVpZ2hib3IueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kcmFmdEN0eC5zdHJva2UoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKTtcclxuICAgIHZhciB0cmFuc2xhdGVTY2VuZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLmRyYWZ0Q3R4LnNldFRyYW5zZm9ybSgxLCAwLCAwLCAxLCAwLCAwKTtcclxuICAgICAgICB0aGlzLnNjYWxlRmFjdG9yID0gbGVycCh0aGlzLnNjYWxlRmFjdG9yLCB0aGlzLm1haW5TY2FsZUZhY3RvciwgMC4zKTtcclxuXHJcbiAgICAgICAgdGhpcy5kcmFmdEN0eC50cmFuc2xhdGUodGhpcy5tYWluQ2FudmFzLndpZHRoIC8gMiwgdGhpcy5tYWluQ2FudmFzLmhlaWdodCAvIDIpO1xyXG4gICAgICAgIHRoaXMuZHJhZnRDdHguc2NhbGUodGhpcy5zY2FsZUZhY3RvciwgdGhpcy5zY2FsZUZhY3Rvcik7XHJcbiAgICAgICAgdGhpcy5kcmFmdEN0eC50cmFuc2xhdGUoLXNlbGZQbGF5ZXIueCwgLXNlbGZQbGF5ZXIueSk7XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcblxyXG5cclxuICAgIGlmICghc2VsZlBsYXllcikge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLm1haW5DdHguY2xlYXJSZWN0KDAsIDAsIDExMDAwLCAxMTAwMCk7XHJcbiAgICB0aGlzLmRyYWZ0Q3R4LmNsZWFyUmVjdCgwLCAwLCAxMTAwMCwgMTEwMDApO1xyXG5cclxuICAgIHRoaXMuZHJhZnRDdHguZmlsbFN0eWxlID0gXCIjMDAwMDAwXCI7XHJcbiAgICB0aGlzLmRyYWZ0Q3R4LmZpbGxSZWN0KDAsIDAsIDEwMDAwLCAxMDAwMCk7XHJcblxyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZW50aXR5TGlzdC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciBsaXN0ID0gZW50aXR5TGlzdFtpXTtcclxuICAgICAgICBmb3IgKGlkIGluIGxpc3QpIHtcclxuICAgICAgICAgICAgdmFyIGVudGl0eSA9IGxpc3RbaWRdO1xyXG4gICAgICAgICAgICBpZiAoaW5Cb3VuZHMoc2VsZlBsYXllciwgZW50aXR5LngsIGVudGl0eS55KSkge1xyXG4gICAgICAgICAgICAgICAgZW50aXR5LnNob3coKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGlmICh0aGlzLkJSQUNLRVQpIHtcclxuICAgICAgICB0aGlzLkJSQUNLRVQuc2hvdygpO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMuQVJST1cpIHtcclxuICAgICAgICB0aGlzLkFSUk9XLnNob3coKTtcclxuICAgIH1cclxuICAgIGRyYXdDb25uZWN0b3JzKCk7IC8vZml4IHRoaXMsIGFzIHJpZ2h0IG5vdyBidWlsZGluZ3MgYXJlIGRyYXduIGZpcnN0XHJcbiAgICB0cmFuc2xhdGVTY2VuZSgpO1xyXG5cclxuICAgIHRoaXMubWFpbkN0eC5kcmF3SW1hZ2UodGhpcy5kcmFmdENhbnZhcywgMCwgMCk7XHJcbn07XHJcblxyXG5cclxuZnVuY3Rpb24gbGVycChhLCBiLCByYXRpbykge1xyXG4gICAgcmV0dXJuIGEgKyByYXRpbyAqIChiIC0gYSk7XHJcbn1cclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENsaWVudDsiLCJmdW5jdGlvbiBBbmltYXRpb24oYW5pbWF0aW9uSW5mbywgY2xpZW50KSB7XHJcbiAgICB0aGlzLnR5cGUgPSBhbmltYXRpb25JbmZvLnR5cGU7XHJcbiAgICB0aGlzLmlkID0gYW5pbWF0aW9uSW5mby5pZDtcclxuICAgIHRoaXMubmFtZSA9IGFuaW1hdGlvbkluZm8ubmFtZTtcclxuICAgIHRoaXMueCA9IGFuaW1hdGlvbkluZm8ueDtcclxuICAgIHRoaXMueSA9IGFuaW1hdGlvbkluZm8ueTtcclxuICAgIHRoaXMudGhldGEgPSAxNTtcclxuICAgIHRoaXMudGltZXIgPSBnZXRSYW5kb20oMTAsIDE0KTtcclxuXHJcbiAgICBpZiAodGhpcy54KSB7XHJcbiAgICAgICAgdGhpcy5lbmRYID0gdGhpcy54ICsgZ2V0UmFuZG9tKC0xMDAsIDEwMCk7XHJcbiAgICAgICAgdGhpcy5lbmRZID0gdGhpcy55ICsgZ2V0UmFuZG9tKC0xMDAsIDEwMCk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbn1cclxuXHJcblxyXG5BbmltYXRpb24ucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgaG9tZTtcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5kcmFmdEN0eDtcclxuICAgIGlmICh0aGlzLnR5cGUgPT09IFwiYWRkU2hhcmRcIikge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiRFJBV0lORyBBREQgU0hBUkQgQU5JTUFUSU9OXCIpO1xyXG4gICAgICAgIGhvbWUgPSB0aGlzLmNsaWVudC5IT01FX0xJU1RbdGhpcy5pZF07XHJcbiAgICAgICAgaWYgKCFob21lKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSAzICogdGhpcy50aW1lcjtcclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcIiMwMTJDQ0NcIjtcclxuICAgICAgICBjdHguYXJjKGhvbWUueCwgaG9tZS55LCBob21lLnJhZGl1cywgMCwgdGhpcy50aW1lciAvIDEuMiwgdHJ1ZSk7XHJcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodGhpcy50eXBlID09PSBcInJlbW92ZVNoYXJkXCIpIHtcclxuICAgICAgICBob21lID0gdGhpcy5jbGllbnQuSE9NRV9MSVNUW3RoaXMuaWRdO1xyXG4gICAgICAgIGlmICghaG9tZSkge1xyXG4gICAgICAgICAgICBkZWxldGUgdGhpcy5jbGllbnQuQU5JTUFUSU9OX0xJU1RbaWRdO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gMTUgLSB0aGlzLnRpbWVyO1xyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwicmdiYSgyNTUsIDAsIDAsIFwiICsgdGhpcy50aW1lciAqIDEwIC8gMTAwICsgXCIpXCI7XHJcbiAgICAgICAgY3R4LmFyYyhob21lLngsIGhvbWUueSwgaG9tZS5yYWRpdXMsIDAsIDIgKiBNYXRoLlBJLCBmYWxzZSk7XHJcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodGhpcy50eXBlID09PSBcInNoYXJkRGVhdGhcIikge1xyXG4gICAgICAgIGN0eC5mb250ID0gNjAgLSB0aGlzLnRpbWVyICsgXCJweCBBcmlhbFwiO1xyXG4gICAgICAgIGN0eC5zYXZlKCk7XHJcbiAgICAgICAgY3R4LnRyYW5zbGF0ZSh0aGlzLngsIHRoaXMueSk7XHJcbiAgICAgICAgY3R4LnJvdGF0ZSgtTWF0aC5QSSAvIDUwICogdGhpcy50aGV0YSk7XHJcbiAgICAgICAgY3R4LnRleHRBbGlnbiA9IFwiY2VudGVyXCI7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwicmdiYSgyNTUsIDE2OCwgODYsIFwiICsgdGhpcy50aW1lciAqIDEwIC8gMTAwICsgXCIpXCI7XHJcbiAgICAgICAgY3R4LmZpbGxUZXh0KHRoaXMubmFtZSwgMCwgMTUpO1xyXG4gICAgICAgIGN0eC5yZXN0b3JlKCk7XHJcblxyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcIiMwMDAwMDBcIjtcclxuICAgICAgICB0aGlzLnRoZXRhID0gbGVycCh0aGlzLnRoZXRhLCAwLCAwLjA4KTtcclxuICAgICAgICB0aGlzLnggPSBsZXJwKHRoaXMueCwgdGhpcy5lbmRYLCAwLjEpO1xyXG4gICAgICAgIHRoaXMueSA9IGxlcnAodGhpcy55LCB0aGlzLmVuZFksIDAuMSk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy50aW1lci0tO1xyXG4gICAgaWYgKHRoaXMudGltZXIgPD0gMCkge1xyXG4gICAgICAgIGRlbGV0ZSB0aGlzLmNsaWVudC5BTklNQVRJT05fTElTVFt0aGlzLmlkXTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5mdW5jdGlvbiBnZXRSYW5kb20obWluLCBtYXgpIHtcclxuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikgKyBtaW47XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxlcnAoYSwgYiwgcmF0aW8pIHtcclxuICAgIHJldHVybiBhICsgcmF0aW8gKiAoYiAtIGEpO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEFuaW1hdGlvbjsiLCJmdW5jdGlvbiBBcnJvdyh4LCB5LCBjbGllbnQpIHtcclxuICAgIHRoaXMucHJlWCA9IHg7XHJcbiAgICB0aGlzLnByZVkgPSB5O1xyXG4gICAgdGhpcy5wb3N0WCA9IHg7XHJcbiAgICB0aGlzLnBvc3RZID0geTtcclxuICAgIHRoaXMuZGVsdGFYID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnBvc3RYIC0gbWFpbkNhbnZhcy53aWR0aCAvIDI7XHJcbiAgICB9O1xyXG4gICAgdGhpcy5kZWx0YVkgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMucG9zdFkgLSBtYWluQ2FudmFzLmhlaWdodCAvIDI7XHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5BcnJvdy5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjYW52YXMgPSB0aGlzLmNsaWVudC5kcmFmdENhbnZhcztcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5kcmFmdEN0eDtcclxuICAgIHZhciBzZWxmUGxheWVyID0gdGhpcy5jbGllbnQuQ09OVFJPTExFUl9MSVNUW3RoaXMuY2xpZW50LlNFTEZJRF07XHJcbiAgICB2YXIgc2NhbGVGYWN0b3IgPSB0aGlzLmNsaWVudC5zY2FsZUZhY3RvcjtcclxuXHJcbiAgICBpZiAodGhpcy5wb3N0WCkge1xyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcIiM1MjE1MjJcIjtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2JhKDUyLCAxNzUsIDIxNiwgMC4zKVwiO1xyXG5cclxuICAgICAgICB2YXIgcHJlWCA9IHNlbGZQbGF5ZXIueCArICh0aGlzLnByZVggLSBjYW52YXMud2lkdGggLyAyKSAvIHNjYWxlRmFjdG9yO1xyXG4gICAgICAgIHZhciBwcmVZID0gc2VsZlBsYXllci55ICsgKHRoaXMucHJlWSAtIGNhbnZhcy5oZWlnaHQgLyAyKSAvIHNjYWxlRmFjdG9yO1xyXG5cclxuICAgICAgICB2YXIgcG9zdFggPSBzZWxmUGxheWVyLnggKyAodGhpcy5wb3N0WCAtIGNhbnZhcy53aWR0aCAvIDIpIC8gc2NhbGVGYWN0b3I7XHJcbiAgICAgICAgdmFyIHBvc3RZID0gc2VsZlBsYXllci55ICsgKHRoaXMucG9zdFkgLSBjYW52YXMuaGVpZ2h0IC8gMikgLyBzY2FsZUZhY3RvcjtcclxuXHJcbiAgICAgICAgY3R4LmZpbGxSZWN0KHByZVgsIHByZVksIHBvc3RYIC0gcHJlWCwgcG9zdFkgLSBwcmVZKTtcclxuXHJcbiAgICAgICAgY3R4LmFyYyhwb3N0WCwgcG9zdFksIDMsIDAsIDIgKiBNYXRoLlBJLCB0cnVlKTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgfVxyXG5cclxufTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEFycm93OyIsImZ1bmN0aW9uIEJyYWNrZXQoYnJhY2tldEluZm8sIGNsaWVudCkge1xyXG4gICAgdmFyIHRpbGUgPSBjbGllbnQuVElMRV9MSVNUW2JyYWNrZXRJbmZvLnRpbGVJZF07XHJcblxyXG4gICAgdGhpcy54ID0gdGlsZS54O1xyXG4gICAgdGhpcy55ID0gdGlsZS55O1xyXG4gICAgdGhpcy5sZW5ndGggPSB0aWxlLmxlbmd0aDtcclxuXHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxufVxyXG5cclxuQnJhY2tldC5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5kcmFmdEN0eDtcclxuXHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2JhKDEwMCwyMTEsMjExLDAuNilcIjtcclxuICAgIGN0eC5maWxsUmVjdCh0aGlzLngsIHRoaXMueSwgdGhpcy5sZW5ndGgsIHRoaXMubGVuZ3RoKTtcclxuICAgIGN0eC5jbG9zZVBhdGgoKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQnJhY2tldDsiLCJmdW5jdGlvbiBDb250cm9sbGVyKGNvbnRyb2xsZXJJbmZvLCBjbGllbnQpIHtcclxuICAgIHRoaXMuaWQgPSBjb250cm9sbGVySW5mby5pZDtcclxuICAgIHRoaXMubmFtZSA9IGNvbnRyb2xsZXJJbmZvLm5hbWU7XHJcbiAgICB0aGlzLnggPSBjb250cm9sbGVySW5mby54O1xyXG4gICAgdGhpcy55ID0gY29udHJvbGxlckluZm8ueTtcclxuICAgIHRoaXMuaGVhbHRoID0gY29udHJvbGxlckluZm8uaGVhbHRoO1xyXG4gICAgdGhpcy5tYXhIZWFsdGggPSBjb250cm9sbGVySW5mby5tYXhIZWFsdGg7XHJcbiAgICB0aGlzLnNlbGVjdGVkID0gY29udHJvbGxlckluZm8uc2VsZWN0ZWQ7XHJcbiAgICB0aGlzLm93bmVyID0gY29udHJvbGxlckluZm8ub3duZXI7XHJcbiAgICB0aGlzLnRoZXRhID0gY29udHJvbGxlckluZm8udGhldGE7XHJcbiAgICB0aGlzLnR5cGUgPSBjb250cm9sbGVySW5mby50eXBlO1xyXG4gICAgdGhpcy5sZXZlbCA9IGNvbnRyb2xsZXJJbmZvLmxldmVsO1xyXG4gICAgdGhpcy5yYWRpdXMgPSBjb250cm9sbGVySW5mby5yYWRpdXM7XHJcbiAgICB0aGlzLnN0ZWFsdGggPSBjb250cm9sbGVySW5mby5zdGVhbHRoO1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5Db250cm9sbGVyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoY29udHJvbGxlckluZm8pIHtcclxuICAgIHRoaXMueCA9IGNvbnRyb2xsZXJJbmZvLng7XHJcbiAgICB0aGlzLnkgPSBjb250cm9sbGVySW5mby55O1xyXG4gICAgdGhpcy5oZWFsdGggPSBjb250cm9sbGVySW5mby5oZWFsdGg7XHJcbiAgICB0aGlzLm1heEhlYWx0aCA9IGNvbnRyb2xsZXJJbmZvLm1heEhlYWx0aDtcclxuICAgIHRoaXMuc2VsZWN0ZWQgPSBjb250cm9sbGVySW5mby5zZWxlY3RlZDtcclxuICAgIHRoaXMudGhldGEgPSBjb250cm9sbGVySW5mby50aGV0YTtcclxuICAgIHRoaXMubGV2ZWwgPSBjb250cm9sbGVySW5mby5sZXZlbDtcclxuICAgIHRoaXMuc3RlYWx0aCA9IGNvbnRyb2xsZXJJbmZvLnN0ZWFsdGg7XHJcbn07XHJcblxyXG5Db250cm9sbGVyLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50LmRyYWZ0Q3R4O1xyXG4gICAgdmFyIHNlbGZJZCA9IHRoaXMuY2xpZW50LlNFTEZJRDtcclxuICAgIHZhciBmaWxsQWxwaGE7XHJcbiAgICB2YXIgc3Ryb2tlQWxwaGE7XHJcbiAgICB2YXIgaTtcclxuXHJcbiAgICBpZiAodGhpcy5zdGVhbHRoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuaWQgIT09IHNlbGZJZCAmJiB0aGlzLm93bmVyICE9PSBzZWxmSWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGZpbGxBbHBoYSA9IDAuMTtcclxuICAgICAgICAgICAgc3Ryb2tlQWxwaGEgPSAwLjM7XHJcbiAgICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBmaWxsQWxwaGEgPSB0aGlzLmhlYWx0aCAvICg0ICogdGhpcy5tYXhIZWFsdGgpO1xyXG4gICAgICAgIHN0cm9rZUFscGhhID0gMTtcclxuICAgIH1cclxuICAgIGN0eC5mb250ID0gXCIyMHB4IEFyaWFsXCI7XHJcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJnYmEoMjUyLCAxMDIsIDM3LFwiICsgc3Ryb2tlQWxwaGEgKyBcIilcIjtcclxuXHJcbiAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2JhKDEyMywwLDAsXCIgKyBmaWxsQWxwaGEgKyBcIilcIjtcclxuICAgIGN0eC5saW5lV2lkdGggPSAxMDtcclxuXHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAvL2RyYXcgcGxheWVyIG9iamVjdFxyXG4gICAgaWYgKHRoaXMudHlwZSA9PT0gXCJQbGF5ZXJcIikge1xyXG4gICAgICAgIHZhciByYWRpdXMgPSAzMDtcclxuICAgICAgICBjdHgubW92ZVRvKHRoaXMueCArIHJhZGl1cywgdGhpcy55KTtcclxuICAgICAgICBmb3IgKGkgPSBNYXRoLlBJIC8gNDsgaSA8PSAyICogTWF0aC5QSSAtIE1hdGguUEkgLyA0OyBpICs9IE1hdGguUEkgLyA0KSB7XHJcbiAgICAgICAgICAgIHRoZXRhID0gaSArIGdldFJhbmRvbSgtKHRoaXMubWF4SGVhbHRoIC8gdGhpcy5oZWFsdGgpIC8gNywgKHRoaXMubWF4SGVhbHRoIC8gdGhpcy5oZWFsdGgpIC8gNyk7XHJcbiAgICAgICAgICAgIHggPSByYWRpdXMgKiBNYXRoLmNvcyh0aGV0YSk7XHJcbiAgICAgICAgICAgIHkgPSByYWRpdXMgKiBNYXRoLnNpbih0aGV0YSk7XHJcbiAgICAgICAgICAgIGN0eC5saW5lVG8odGhpcy54ICsgeCwgdGhpcy55ICsgeSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGN0eC5saW5lVG8odGhpcy54ICsgcmFkaXVzLCB0aGlzLnkgKyAzKTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgY3R4LmZpbGwoKTtcclxuICAgIH1cclxuICAgIGVsc2UgeyAvL2JvdFxyXG4gICAgICAgIHZhciB4LCB5LCB0aGV0YSwgc3RhcnRYLCBzdGFydFk7XHJcbiAgICAgICAgdmFyIHNtYWxsUmFkaXVzID0gMTI7XHJcbiAgICAgICAgdmFyIGJpZ1JhZGl1cyA9IHRoaXMucmFkaXVzO1xyXG5cclxuICAgICAgICB0aGV0YSA9IHRoaXMudGhldGE7XHJcbiAgICAgICAgc3RhcnRYID0gYmlnUmFkaXVzICogTWF0aC5jb3ModGhldGEpO1xyXG4gICAgICAgIHN0YXJ0WSA9IGJpZ1JhZGl1cyAqIE1hdGguc2luKHRoZXRhKTtcclxuICAgICAgICBjdHgubW92ZVRvKHRoaXMueCArIHN0YXJ0WCwgdGhpcy55ICsgc3RhcnRZKTtcclxuICAgICAgICBmb3IgKGkgPSAxOyBpIDw9IDI7IGkrKykge1xyXG4gICAgICAgICAgICB0aGV0YSA9IHRoaXMudGhldGEgKyAyICogTWF0aC5QSSAvIDMgKiBpICtcclxuICAgICAgICAgICAgICAgIGdldFJhbmRvbSgtdGhpcy5tYXhIZWFsdGggLyB0aGlzLmhlYWx0aCAvIDcsIHRoaXMubWF4SGVhbHRoIC8gdGhpcy5oZWFsdGggLyA3KTtcclxuICAgICAgICAgICAgeCA9IHNtYWxsUmFkaXVzICogTWF0aC5jb3ModGhldGEpO1xyXG4gICAgICAgICAgICB5ID0gc21hbGxSYWRpdXMgKiBNYXRoLnNpbih0aGV0YSk7XHJcbiAgICAgICAgICAgIGN0eC5saW5lVG8odGhpcy54ICsgeCwgdGhpcy55ICsgeSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGN0eC5saW5lVG8odGhpcy54ICsgc3RhcnRYLCB0aGlzLnkgKyBzdGFydFkpO1xyXG4gICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICB9XHJcblxyXG4gICAgY3R4LmZpbGxTdHlsZSA9IFwiI2ZmOWQ2MFwiO1xyXG4gICAgY3R4LmZpbGxUZXh0KHRoaXMubmFtZSwgdGhpcy54LCB0aGlzLnkgKyA3MCk7XHJcbiAgICBpZiAodGhpcy5zZWxlY3RlZCAmJiB0aGlzLm93bmVyID09PSB0aGlzLmNsaWVudC5TRUxGSUQpIHtcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gNTtcclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcIiMxZDU1YWZcIjtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICB9XHJcbiAgICBjdHguY2xvc2VQYXRoKCk7XHJcbn07XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0UmFuZG9tKG1pbiwgbWF4KSB7XHJcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pICsgbWluO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRyb2xsZXI7IiwiZnVuY3Rpb24gRmFjdGlvbihmYWN0aW9uSW5mbywgY2xpZW50KSB7XHJcbiAgICB0aGlzLmlkID0gZmFjdGlvbkluZm8uaWQ7XHJcbiAgICB0aGlzLm5hbWUgPSBmYWN0aW9uSW5mby5uYW1lO1xyXG4gICAgdGhpcy54ID0gZmFjdGlvbkluZm8ueDtcclxuICAgIHRoaXMueSA9IGZhY3Rpb25JbmZvLnk7XHJcbiAgICB0aGlzLnNpemUgPSBmYWN0aW9uSW5mby5zaXplO1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5GYWN0aW9uLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoZmFjdGlvbkluZm8pIHtcclxuICAgIHRoaXMueCA9IGZhY3Rpb25JbmZvLng7XHJcbiAgICB0aGlzLnkgPSBmYWN0aW9uSW5mby55O1xyXG4gICAgdGhpcy5zaXplID0gZmFjdGlvbkluZm8uc2l6ZTtcclxuXHJcbn07XHJcblxyXG5GYWN0aW9uLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50LmRyYWZ0Q3R4O1xyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgY3R4LnN0cm9rZVN0eWxlID0gXCIjMmQzNTQyXCI7XHJcbiAgICBjdHgubGluZVdpZHRoID0gMjtcclxuICAgIGN0eC5maWxsU3R5bGUgPSBcIiNGRkZGRkZcIjtcclxuICAgIGN0eC5mb250ID0gdGhpcy5zaXplICogNjAgKyBcInB4IEFyaWFsXCI7XHJcbiAgICBjdHgudGV4dEFsaWduID0gXCJjZW50ZXJcIjtcclxuICAgIGN0eC5maWxsVGV4dCh0aGlzLm5hbWUsIHRoaXMueCwgdGhpcy55KTtcclxuICAgIGN0eC5zdHJva2VUZXh0KHRoaXMubmFtZSwgdGhpcy54LCB0aGlzLnkpO1xyXG4gICAgY3R4LmZpbGwoKTtcclxuICAgIGN0eC5zdHJva2UoKTtcclxuICAgIGN0eC5jbG9zZVBhdGgoKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRmFjdGlvbjsiLCJmdW5jdGlvbiBIb21lKGhvbWVJbmZvLCBjbGllbnQpIHtcclxuICAgIHRoaXMuaWQgPSBob21lSW5mby5pZDtcclxuICAgIHRoaXMueCA9IGhvbWVJbmZvLng7XHJcbiAgICB0aGlzLnkgPSBob21lSW5mby55O1xyXG4gICAgdGhpcy5uYW1lID0gaG9tZUluZm8ub3duZXI7XHJcbiAgICB0aGlzLnR5cGUgPSBob21lSW5mby50eXBlO1xyXG4gICAgdGhpcy5yYWRpdXMgPSBob21lSW5mby5yYWRpdXM7XHJcbiAgICB0aGlzLnNoYXJkcyA9IGhvbWVJbmZvLnNoYXJkcztcclxuICAgIHRoaXMucG93ZXIgPSBob21lSW5mby5wb3dlcjtcclxuICAgIHRoaXMubGV2ZWwgPSBob21lSW5mby5sZXZlbDtcclxuICAgIHRoaXMuaGFzQ29sb3IgPSBob21lSW5mby5oYXNDb2xvcjtcclxuICAgIHRoaXMuaGVhbHRoID0gaG9tZUluZm8uaGVhbHRoO1xyXG4gICAgdGhpcy5uZWlnaGJvcnMgPSBob21lSW5mby5uZWlnaGJvcnM7XHJcblxyXG4gICAgdGhpcy51bml0RG1nID0gaG9tZUluZm8udW5pdERtZztcclxuICAgIHRoaXMudW5pdFNwZWVkID0gaG9tZUluZm8udW5pdFNwZWVkO1xyXG4gICAgdGhpcy51bml0QXJtb3IgPSBob21lSW5mby51bml0QXJtb3I7XHJcbiAgICB0aGlzLnF1ZXVlID0gaG9tZUluZm8ucXVldWU7XHJcbiAgICB0aGlzLmJvdHMgPSBob21lSW5mby5ib3RzO1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5cclxuSG9tZS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKGhvbWVJbmZvKSB7XHJcbiAgICB0aGlzLnNoYXJkcyA9IGhvbWVJbmZvLnNoYXJkcztcclxuICAgIHRoaXMubGV2ZWwgPSBob21lSW5mby5sZXZlbDtcclxuICAgIHRoaXMucmFkaXVzID0gaG9tZUluZm8ucmFkaXVzO1xyXG4gICAgdGhpcy5wb3dlciA9IGhvbWVJbmZvLnBvd2VyO1xyXG4gICAgdGhpcy5oZWFsdGggPSBob21lSW5mby5oZWFsdGg7XHJcbiAgICB0aGlzLmhhc0NvbG9yID0gaG9tZUluZm8uaGFzQ29sb3I7XHJcbiAgICB0aGlzLm5laWdoYm9ycyA9IGhvbWVJbmZvLm5laWdoYm9ycztcclxuICAgIHRoaXMudW5pdERtZyA9IGhvbWVJbmZvLnVuaXREbWc7XHJcbiAgICB0aGlzLnVuaXRTcGVlZCA9IGhvbWVJbmZvLnVuaXRTcGVlZDtcclxuICAgIHRoaXMudW5pdEFybW9yID0gaG9tZUluZm8udW5pdEFybW9yO1xyXG4gICAgdGhpcy5xdWV1ZSA9IGhvbWVJbmZvLnF1ZXVlO1xyXG4gICAgdGhpcy5ib3RzID0gaG9tZUluZm8uYm90cztcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSG9tZTtcclxuXHJcblxyXG5Ib21lLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50LmRyYWZ0Q3R4O1xyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgaWYgKHRoaXMubmVpZ2hib3JzLmxlbmd0aCA+PSA0KSB7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiIzQxNjllMVwiO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCIjMzk2YTZkXCI7XHJcbiAgICB9XHJcblxyXG4gICAgY3R4LmFyYyh0aGlzLngsIHRoaXMueSwgdGhpcy5yYWRpdXMsIDAsIDIgKiBNYXRoLlBJLCBmYWxzZSk7XHJcbiAgICBjdHguZmlsbCgpO1xyXG5cclxuICAgIHZhciBzZWxmUGxheWVyID0gdGhpcy5jbGllbnQuQ09OVFJPTExFUl9MSVNUW3RoaXMuY2xpZW50LlNFTEZJRF07XHJcblxyXG4gICAgaWYgKGluQm91bmRzQ2xvc2Uoc2VsZlBsYXllciwgdGhpcy54LCB0aGlzLnkpKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuZmFjdGlvbilcclxuICAgICAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCJyZ2JhKDEyLCAyNTUsIDIxOCwgMC43KVwiO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSAxMDtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMub3duZXIgIT09IG51bGwpIHtcclxuICAgICAgICBjdHguZmlsbFRleHQodGhpcy5zaGFyZHMubGVuZ3RoLCB0aGlzLngsIHRoaXMueSArIDQwKTtcclxuICAgIH1cclxuICAgIGN0eC5jbG9zZVBhdGgoKTtcclxufTtcclxuXHJcblxyXG5mdW5jdGlvbiBpbkJvdW5kc0Nsb3NlKHBsYXllciwgeCwgeSkge1xyXG4gICAgdmFyIHJhbmdlID0gMTUwO1xyXG4gICAgcmV0dXJuIHggPCAocGxheWVyLnggKyByYW5nZSkgJiYgeCA+IChwbGF5ZXIueCAtIDUgLyA0ICogcmFuZ2UpXHJcbiAgICAgICAgJiYgeSA8IChwbGF5ZXIueSArIHJhbmdlKSAmJiB5ID4gKHBsYXllci55IC0gNSAvIDQgKiByYW5nZSk7XHJcbn1cclxuIiwiZnVuY3Rpb24gTGFzZXIobGFzZXJJbmZvLCBjbGllbnQpIHtcclxuICAgIHRoaXMuaWQgPSBsYXNlckluZm8uaWQ7XHJcbiAgICB0aGlzLm93bmVyID0gbGFzZXJJbmZvLm93bmVyO1xyXG4gICAgdGhpcy50YXJnZXQgPSBsYXNlckluZm8udGFyZ2V0O1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5MYXNlci5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5kcmFmdEN0eDtcclxuICAgIHZhciB0YXJnZXQgPSB0aGlzLmNsaWVudC5DT05UUk9MTEVSX0xJU1RbdGhpcy50YXJnZXRdO1xyXG4gICAgdmFyIG93bmVyID0gdGhpcy5jbGllbnQuQ09OVFJPTExFUl9MSVNUW3RoaXMub3duZXJdO1xyXG5cclxuICAgIGlmICh0YXJnZXQgJiYgb3duZXIpIHtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4Lm1vdmVUbyhvd25lci54LCBvd25lci55KTtcclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcIiM5MTIyMjJcIjtcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gMTA7XHJcbiAgICAgICAgY3R4LmxpbmVUbyh0YXJnZXQueCwgdGFyZ2V0LnkpO1xyXG4gICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTGFzZXI7IiwiZnVuY3Rpb24gTWluaU1hcCgpIHsgLy9kZXByZWNhdGVkLCBwbGVhc2UgdXBkYXRlXHJcbn1cclxuXHJcbk1pbmlNYXAucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBpZiAobWFwVGltZXIgPD0gMCB8fCBzZXJ2ZXJNYXAgPT09IG51bGwpIHtcclxuICAgICAgICB2YXIgdGlsZUxlbmd0aCA9IE1hdGguc3FydChPYmplY3Quc2l6ZShUSUxFX0xJU1QpKTtcclxuICAgICAgICBpZiAodGlsZUxlbmd0aCA9PT0gMCB8fCAhc2VsZlBsYXllcikge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBpbWdEYXRhID0gbWFpbkN0eC5jcmVhdGVJbWFnZURhdGEodGlsZUxlbmd0aCwgdGlsZUxlbmd0aCk7XHJcbiAgICAgICAgdmFyIHRpbGU7XHJcbiAgICAgICAgdmFyIHRpbGVSR0I7XHJcbiAgICAgICAgdmFyIGkgPSAwO1xyXG5cclxuXHJcbiAgICAgICAgZm9yICh2YXIgaWQgaW4gVElMRV9MSVNUKSB7XHJcbiAgICAgICAgICAgIHRpbGVSR0IgPSB7fTtcclxuICAgICAgICAgICAgdGlsZSA9IFRJTEVfTElTVFtpZF07XHJcbiAgICAgICAgICAgIGlmICh0aWxlLmNvbG9yICYmIHRpbGUuYWxlcnQgfHwgaW5Cb3VuZHMoc2VsZlBsYXllciwgdGlsZS54LCB0aWxlLnkpKSB7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLnIgPSB0aWxlLmNvbG9yLnI7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLmcgPSB0aWxlLmNvbG9yLmc7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLmIgPSB0aWxlLmNvbG9yLmI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLnIgPSAwO1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5nID0gMDtcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuYiA9IDA7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGltZ0RhdGEuZGF0YVtpXSA9IHRpbGVSR0IucjtcclxuICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2kgKyAxXSA9IHRpbGVSR0IuZztcclxuICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2kgKyAyXSA9IHRpbGVSR0IuYjtcclxuICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2kgKyAzXSA9IDI1NTtcclxuICAgICAgICAgICAgaSArPSA0O1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zb2xlLmxvZyg0MDAgLyBPYmplY3Quc2l6ZShUSUxFX0xJU1QpKTtcclxuICAgICAgICBpbWdEYXRhID0gc2NhbGVJbWFnZURhdGEoaW1nRGF0YSwgTWF0aC5mbG9vcig0MDAgLyBPYmplY3Quc2l6ZShUSUxFX0xJU1QpKSwgbWFpbkN0eCk7XHJcblxyXG4gICAgICAgIG1NYXBDdHgucHV0SW1hZ2VEYXRhKGltZ0RhdGEsIDAsIDApO1xyXG5cclxuICAgICAgICBtTWFwQ3R4Um90LnJvdGF0ZSg5MCAqIE1hdGguUEkgLyAxODApO1xyXG4gICAgICAgIG1NYXBDdHhSb3Quc2NhbGUoMSwgLTEpO1xyXG4gICAgICAgIG1NYXBDdHhSb3QuZHJhd0ltYWdlKG1NYXAsIDAsIDApO1xyXG4gICAgICAgIG1NYXBDdHhSb3Quc2NhbGUoMSwgLTEpO1xyXG4gICAgICAgIG1NYXBDdHhSb3Qucm90YXRlKDI3MCAqIE1hdGguUEkgLyAxODApO1xyXG5cclxuICAgICAgICBzZXJ2ZXJNYXAgPSBtTWFwUm90O1xyXG4gICAgICAgIG1hcFRpbWVyID0gMjU7XHJcbiAgICB9XHJcblxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgbWFwVGltZXIgLT0gMTtcclxuICAgIH1cclxuXHJcbiAgICBtYWluQ3R4LmRyYXdJbWFnZShzZXJ2ZXJNYXAsIDgwMCwgNDAwKTtcclxufTsgLy9kZXByZWNhdGVkXHJcblxyXG5NaW5pTWFwLnByb3RvdHlwZS5zY2FsZUltYWdlRGF0YSA9IGZ1bmN0aW9uIChpbWFnZURhdGEsIHNjYWxlLCBtYWluQ3R4KSB7XHJcbiAgICB2YXIgc2NhbGVkID0gbWFpbkN0eC5jcmVhdGVJbWFnZURhdGEoaW1hZ2VEYXRhLndpZHRoICogc2NhbGUsIGltYWdlRGF0YS5oZWlnaHQgKiBzY2FsZSk7XHJcbiAgICB2YXIgc3ViTGluZSA9IG1haW5DdHguY3JlYXRlSW1hZ2VEYXRhKHNjYWxlLCAxKS5kYXRhO1xyXG4gICAgZm9yICh2YXIgcm93ID0gMDsgcm93IDwgaW1hZ2VEYXRhLmhlaWdodDsgcm93KyspIHtcclxuICAgICAgICBmb3IgKHZhciBjb2wgPSAwOyBjb2wgPCBpbWFnZURhdGEud2lkdGg7IGNvbCsrKSB7XHJcbiAgICAgICAgICAgIHZhciBzb3VyY2VQaXhlbCA9IGltYWdlRGF0YS5kYXRhLnN1YmFycmF5KFxyXG4gICAgICAgICAgICAgICAgKHJvdyAqIGltYWdlRGF0YS53aWR0aCArIGNvbCkgKiA0LFxyXG4gICAgICAgICAgICAgICAgKHJvdyAqIGltYWdlRGF0YS53aWR0aCArIGNvbCkgKiA0ICsgNFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgICBmb3IgKHZhciB4ID0gMDsgeCA8IHNjYWxlOyB4KyspIHN1YkxpbmUuc2V0KHNvdXJjZVBpeGVsLCB4ICogNClcclxuICAgICAgICAgICAgZm9yICh2YXIgeSA9IDA7IHkgPCBzY2FsZTsgeSsrKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZGVzdFJvdyA9IHJvdyAqIHNjYWxlICsgeTtcclxuICAgICAgICAgICAgICAgIHZhciBkZXN0Q29sID0gY29sICogc2NhbGU7XHJcbiAgICAgICAgICAgICAgICBzY2FsZWQuZGF0YS5zZXQoc3ViTGluZSwgKGRlc3RSb3cgKiBzY2FsZWQud2lkdGggKyBkZXN0Q29sKSAqIDQpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHNjYWxlZDtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTWluaU1hcDsiLCJmdW5jdGlvbiBTaGFyZCh0aGlzSW5mbywgY2xpZW50KSB7XHJcbiAgICB0aGlzLmlkID0gdGhpc0luZm8uaWQ7XHJcbiAgICB0aGlzLnggPSB0aGlzSW5mby54O1xyXG4gICAgdGhpcy55ID0gdGhpc0luZm8ueTtcclxuICAgIHRoaXMubmFtZSA9IHRoaXNJbmZvLm5hbWU7XHJcbiAgICB0aGlzLnZpc2libGUgPSB0aGlzSW5mby52aXNpYmxlO1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5TaGFyZC5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKHRoaXNJbmZvKSB7XHJcbiAgICB0aGlzLnggPSB0aGlzSW5mby54O1xyXG4gICAgdGhpcy55ID0gdGhpc0luZm8ueTtcclxuICAgIHRoaXMudmlzaWJsZSA9IHRoaXNJbmZvLnZpc2libGU7XHJcbiAgICB0aGlzLm5hbWUgPSB0aGlzSW5mby5uYW1lO1xyXG59O1xyXG5cclxuXHJcblNoYXJkLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50LmRyYWZ0Q3R4O1xyXG4gICAgY3R4LmxpbmVXaWR0aCA9IDI7XHJcblxyXG4gICAgaWYgKHRoaXMudmlzaWJsZSkge1xyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBpZiAodGhpcy5uYW1lICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIGN0eC5mb250ID0gXCIzMHB4IEFyaWFsXCI7XHJcbiAgICAgICAgICAgIGN0eC5maWxsVGV4dCh0aGlzLm5hbWUsIHRoaXMueCwgdGhpcy55KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwicmdiYSgxMDAsIDI1NSwgMjI3LCAwLjEpXCI7XHJcbiAgICAgICAgY3R4LmFyYyh0aGlzLngsIHRoaXMueSwgZ2V0UmFuZG9tKDIwLCA0MCksIDAsIDIgKiBNYXRoLlBJLCBmYWxzZSk7XHJcbiAgICAgICAgY3R4LmZpbGwoKTtcclxuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcblxyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCIjZGZmZjQyXCI7XHJcblxyXG4gICAgICAgIHZhciByYWRpdXMgPSAxMCwgaTtcclxuICAgICAgICB2YXIgc3RhcnRUaGV0YSA9IGdldFJhbmRvbSgwLCAwLjIpO1xyXG4gICAgICAgIHZhciB0aGV0YSA9IDA7XHJcbiAgICAgICAgdmFyIHN0YXJ0WCA9IHJhZGl1cyAqIE1hdGguY29zKHN0YXJ0VGhldGEpO1xyXG4gICAgICAgIHZhciBzdGFydFkgPSByYWRpdXMgKiBNYXRoLnNpbihzdGFydFRoZXRhKTtcclxuICAgICAgICBjdHgubW92ZVRvKHRoaXMueCArIHN0YXJ0WCwgdGhpcy55ICsgc3RhcnRZKTtcclxuICAgICAgICBmb3IgKGkgPSBNYXRoLlBJIC8gMjsgaSA8PSAyICogTWF0aC5QSSAtIE1hdGguUEkgLyAyOyBpICs9IE1hdGguUEkgLyAyKSB7XHJcbiAgICAgICAgICAgIHRoZXRhID0gc3RhcnRUaGV0YSArIGkgKyBnZXRSYW5kb20oLTEgLyAyNCwgMSAvIDI0KTtcclxuICAgICAgICAgICAgdmFyIHggPSByYWRpdXMgKiBNYXRoLmNvcyh0aGV0YSk7XHJcbiAgICAgICAgICAgIHZhciB5ID0gcmFkaXVzICogTWF0aC5zaW4odGhldGEpO1xyXG4gICAgICAgICAgICBjdHgubGluZVRvKHRoaXMueCArIHgsIHRoaXMueSArIHkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjdHgubGluZVRvKHRoaXMueCArIHN0YXJ0WCwgdGhpcy55ICsgc3RhcnRZKTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgY3R4LmZpbGwoKTtcclxuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0UmFuZG9tKG1pbiwgbWF4KSB7XHJcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pICsgbWluO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNoYXJkOyIsImZ1bmN0aW9uIFRpbGUodGhpc0luZm8sIGNsaWVudCkge1xyXG4gICAgdGhpcy5pZCA9IHRoaXNJbmZvLmlkO1xyXG4gICAgdGhpcy54ID0gdGhpc0luZm8ueDtcclxuICAgIHRoaXMueSA9IHRoaXNJbmZvLnk7XHJcbiAgICB0aGlzLmxlbmd0aCA9IHRoaXNJbmZvLmxlbmd0aDtcclxuICAgIHRoaXMuY29sb3IgPSB0aGlzSW5mby5jb2xvcjtcclxuICAgIHRoaXMuYWxlcnQgPSB0aGlzSW5mby5hbGVydDtcclxuICAgIHRoaXMucmFuZG9tID0gTWF0aC5mbG9vcihnZXRSYW5kb20oMCwgMykpO1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5UaWxlLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAodGhpc0luZm8pIHtcclxuICAgIHRoaXMuY29sb3IgPSB0aGlzSW5mby5jb2xvcjtcclxuICAgIHRoaXMuYWxlcnQgPSB0aGlzSW5mby5hbGVydDtcclxufTtcclxuXHJcblRpbGUucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgY3R4ID0gdGhpcy5jbGllbnQuZHJhZnRDdHg7XHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2IoXCIgK1xyXG4gICAgICAgIHRoaXMuY29sb3IuciArIFwiLFwiICtcclxuICAgICAgICB0aGlzLmNvbG9yLmcgKyBcIixcIiArXHJcbiAgICAgICAgdGhpcy5jb2xvci5iICtcclxuICAgICAgICBcIilcIjtcclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiIzAwMDAwMFwiO1xyXG5cclxuICAgIGN0eC5saW5lV2lkdGggPSAxMDA7XHJcblxyXG4gICAgY3R4LnJlY3QodGhpcy54LCB0aGlzLnksIHRoaXMubGVuZ3RoLCB0aGlzLmxlbmd0aCk7XHJcbiAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICBjdHguZmlsbCgpO1xyXG59O1xyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVGlsZTtcclxuXHJcblxyXG5mdW5jdGlvbiBnZXRSYW5kb20obWluLCBtYXgpIHtcclxuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikgKyBtaW47XHJcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgIEFuaW1hdGlvbjogcmVxdWlyZSgnLi9BbmltYXRpb24nKSxcclxuICAgIEFycm93OiByZXF1aXJlKCcuL0Fycm93JyksXHJcbiAgICBCcmFja2V0OiByZXF1aXJlKCcuL0JyYWNrZXQnKSxcclxuICAgIENvbnRyb2xsZXI6IHJlcXVpcmUoJy4vQ29udHJvbGxlcicpLFxyXG4gICAgRmFjdGlvbjogcmVxdWlyZSgnLi9GYWN0aW9uJyksXHJcbiAgICBIb21lOiByZXF1aXJlKCcuL0hvbWUnKSxcclxuICAgIExhc2VyOiByZXF1aXJlKCcuL0xhc2VyJyksXHJcbiAgICBNaW5pTWFwOiByZXF1aXJlKCcuL01pbmlNYXAnKSxcclxuICAgIFNoYXJkOiByZXF1aXJlKCcuL1NoYXJkJyksXHJcbiAgICBUaWxlOiByZXF1aXJlKCcuL1RpbGUnKVxyXG59OyIsInZhciBDbGllbnQgPSByZXF1aXJlKCcuL0NsaWVudC5qcycpO1xyXG52YXIgTWFpblVJID0gcmVxdWlyZSgnLi91aS9NYWluVUknKTtcclxuXHJcbnZhciBjbGllbnQgPSBuZXcgQ2xpZW50KCk7XHJcblxyXG5cclxuZG9jdW1lbnQub25rZXlkb3duID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICBpZiAoY2xpZW50LkNIQVRfT1BFTikge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gODQpIHtcclxuICAgICAgICBjbGllbnQubWFpblVJLmdhbWVVSS5jaGF0VUkudGV4dElucHV0LmNsaWNrKCk7XHJcbiAgICB9XHJcbiAgICBjbGllbnQua2V5c1tldmVudC5rZXlDb2RlXSA9IHRydWU7XHJcbiAgICBjbGllbnQuc29ja2V0LmVtaXQoJ2tleUV2ZW50Jywge2lkOiBldmVudC5rZXlDb2RlLCBzdGF0ZTogdHJ1ZX0pO1xyXG59O1xyXG5cclxuZG9jdW1lbnQub25rZXl1cCA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgY2xpZW50LmtleXNbZXZlbnQua2V5Q29kZV0gPSBmYWxzZTtcclxuICAgIGNsaWVudC5zb2NrZXQuZW1pdCgna2V5RXZlbnQnLCB7aWQ6IGV2ZW50LmtleUNvZGUsIHN0YXRlOiBmYWxzZX0pO1xyXG59O1xyXG5cclxuXHJcbiQod2luZG93KS5iaW5kKCdtb3VzZXdoZWVsIERPTU1vdXNlU2Nyb2xsJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICBpZiAoZXZlbnQuY3RybEtleSA9PT0gdHJ1ZSkge1xyXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICB9XHJcbiAgICBpZiAoY2xpZW50LkNIQVRfU0NST0xMKSB7XHJcbiAgICAgICAgY2xpZW50LkNIQVRfU0NST0xMID0gZmFsc2U7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGlmKGV2ZW50Lm9yaWdpbmFsRXZlbnQud2hlZWxEZWx0YSAvMTIwID4gMCAmJiBjbGllbnQubWFpblNjYWxlRmFjdG9yIDwgMikge1xyXG4gICAgICAgIGNsaWVudC5tYWluU2NhbGVGYWN0b3IgKz0gMC4yO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoY2xpZW50Lm1haW5TY2FsZUZhY3RvciA+IDAuNykge1xyXG4gICAgICAgIGNsaWVudC5tYWluU2NhbGVGYWN0b3IgLT0gMC4yO1xyXG4gICAgfVxyXG59KTtcclxuXHJcbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NvbnRleHRtZW51JywgZnVuY3Rpb24gKGUpIHsgLy9wcmV2ZW50IHJpZ2h0LWNsaWNrIGNvbnRleHQgbWVudVxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG59LCBmYWxzZSk7IiwiZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLm92ZXJmbG93ID0gJ2hpZGRlbic7ICAvLyBmaXJlZm94LCBjaHJvbWVcclxuZG9jdW1lbnQuYm9keS5zY3JvbGwgPSBcIm5vXCI7XHJcbnZhciBQbGF5ZXJOYW1lclVJID0gcmVxdWlyZSgnLi9QbGF5ZXJOYW1lclVJJyk7XHJcbnZhciBTaGFyZE5hbWVyVUkgPSByZXF1aXJlKCcuL1NoYXJkTmFtZXJVSScpO1xyXG52YXIgR2FtZVVJID0gcmVxdWlyZSgnLi9nYW1lL0dhbWVVSScpO1xyXG52YXIgSG9tZVVJID0gcmVxdWlyZShcIi4vaG9tZS9Ib21lVUlcIik7XHJcblxyXG5mdW5jdGlvbiBNYWluVUkoY2xpZW50LCBzb2NrZXQpIHtcclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XHJcblxyXG4gICAgdGhpcy5nYW1lVUkgPSBuZXcgR2FtZVVJKHRoaXMuY2xpZW50LCB0aGlzLnNvY2tldCwgdGhpcyk7XHJcblxyXG4gICAgdGhpcy5wbGF5ZXJOYW1lclVJID0gbmV3IFBsYXllck5hbWVyVUkodGhpcy5jbGllbnQsIHRoaXMuc29ja2V0KTtcclxuICAgIHRoaXMuc2hhcmROYW1lclVJID0gbmV3IFNoYXJkTmFtZXJVSSh0aGlzLmNsaWVudCwgdGhpcy5zb2NrZXQpO1xyXG4gICAgdGhpcy5ob21lVUkgPSBuZXcgSG9tZVVJKHRoaXMuY2xpZW50LCB0aGlzLnNvY2tldCk7XHJcbn1cclxuXHJcbk1haW5VSS5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uIChpbmZvKSB7XHJcbiAgICB2YXIgYWN0aW9uID0gaW5mby5hY3Rpb247XHJcbiAgICB2YXIgaG9tZTtcclxuXHJcbiAgICBpZiAoYWN0aW9uID09PSBcIm5hbWUgc2hhcmRcIikge1xyXG4gICAgICAgIHRoaXMuc2hhcmROYW1lclVJLm9wZW4oKTtcclxuICAgIH1cclxuICAgIGlmIChhY3Rpb24gPT09IFwiaG9tZSBpbmZvXCIpIHtcclxuICAgICAgICBob21lID0gdGhpcy5jbGllbnQuSE9NRV9MSVNUW2luZm8uaG9tZUlkXTtcclxuICAgICAgICB0aGlzLmhvbWVVSS5vcGVuKGhvbWUpO1xyXG4gICAgfVxyXG4gICAgaWYgKGFjdGlvbiA9PT0gXCJnYW1lTXNnUHJvbXB0XCIpIHtcclxuICAgICAgICB0aGlzLmdhbWVVSS5nYW1lTXNnUHJvbXB0Lm9wZW4oaW5mby5tZXNzYWdlKTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5NYWluVUkucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKGFjdGlvbikge1xyXG4gICAgaWYgKGFjdGlvbiA9PT0gXCJuYW1lIHNoYXJkXCIpIHtcclxuICAgICAgICB0aGlzLnNoYXJkTmFtZXJVSS5jbG9zZSgpO1xyXG4gICAgfVxyXG4gICAgaWYgKGFjdGlvbiA9PT0gXCJob21lIGluZm9cIikge1xyXG4gICAgICAgIHRoaXMuTElTVF9TQ1JPTEwgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLmhvbWVVSS5jbG9zZSgpO1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJyZW1vdmVWaWV3ZXJcIiwge30pO1xyXG4gICAgfVxyXG4gICAgaWYgKGFjdGlvbiA9PT0gXCJnYW1lTXNnUHJvbXB0XCIpIHtcclxuICAgICAgICB0aGlzLmdhbWVVSS5nYW1lTXNnUHJvbXB0LmNsb3NlKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuTWFpblVJLnByb3RvdHlwZS51cGRhdGVMZWFkZXJCb2FyZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBsZWFkZXJib2FyZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibGVhZGVyYm9hcmRcIik7XHJcbiAgICB2YXIgRkFDVElPTl9BUlJBWSA9IHRoaXMuY2xpZW50LkZBQ1RJT05fQVJSQVk7XHJcblxyXG5cclxuICAgIHZhciBmYWN0aW9uU29ydCA9IGZ1bmN0aW9uIChhLCBiKSB7XHJcbiAgICAgICAgdmFyIGZhY3Rpb25BID0gdGhpcy5jbGllbnQuRkFDVElPTl9MSVNUW2FdO1xyXG4gICAgICAgIHZhciBmYWN0aW9uQiA9IHRoaXMuY2xpZW50LkZBQ1RJT05fTElTVFtiXTtcclxuICAgICAgICByZXR1cm4gZmFjdGlvbkEuc2l6ZSAtIGZhY3Rpb25CLnNpemU7XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcblxyXG4gICAgRkFDVElPTl9BUlJBWS5zb3J0KGZhY3Rpb25Tb3J0KTtcclxuICAgIGxlYWRlcmJvYXJkLmlubmVySFRNTCA9IFwiXCI7XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IEZBQ1RJT05fQVJSQVkubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuICAgICAgICB2YXIgZmFjdGlvbiA9IHRoaXMuY2xpZW50LkZBQ1RJT05fTElTVFtGQUNUSU9OX0FSUkFZW2ldXTtcclxuXHJcbiAgICAgICAgdmFyIGVudHJ5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcclxuICAgICAgICBlbnRyeS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShmYWN0aW9uLm5hbWUgKyBcIiAtIFwiICsgZmFjdGlvbi5zaXplKSk7XHJcbiAgICAgICAgbGVhZGVyYm9hcmQuYXBwZW5kQ2hpbGQoZW50cnkpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcblxyXG5cclxuLyoqIERFUFJFQ0FURUQgTUVUSE9EUyAqKi9cclxuTWFpblVJLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoaW5mbykge1xyXG4gICAgdmFyIGFjdGlvbiA9IGluZm8uYWN0aW9uO1xyXG4gICAgaWYgKGFjdGlvbiA9PT0gXCJ1cGRhdGUgcXVldWVcIikge1xyXG4gICAgICAgIHRoaXMuaG9tZVVJLmJ1aWxkUGFnZS51cGRhdGUoKTtcclxuICAgICAgICB0aGlzLmhvbWVVSS5ib3RzUGFnZS51cGRhdGUoKTtcclxuICAgICAgICAvL3RoaXMuaG9tZVVJLnVwZ3JhZGVzUGFnZS51cGRhdGUoKTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNYWluVUk7IiwiZnVuY3Rpb24gUGxheWVyTmFtZXJVSSAoY2xpZW50LCBzb2NrZXQpIHtcclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XHJcblxyXG4gICAgdGhpcy5sZWFkZXJib2FyZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibGVhZGVyYm9hcmRfY29udGFpbmVyXCIpO1xyXG4gICAgdGhpcy5uYW1lQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJuYW1lU3VibWl0XCIpO1xyXG4gICAgdGhpcy5wbGF5ZXJOYW1lSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBsYXllck5hbWVJbnB1dFwiKTtcclxuICAgIHRoaXMuZmFjdGlvbk5hbWVJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZmFjdGlvbk5hbWVJbnB1dFwiKTtcclxuICAgIHRoaXMucGxheWVyTmFtZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBsYXllcl9uYW1lclwiKTtcclxufVxyXG5cclxuUGxheWVyTmFtZXJVSS5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICB0aGlzLnBsYXllck5hbWVJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwia2V5dXBcIiwgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMpIHtcclxuICAgICAgICAgICAgdGhpcy5mYWN0aW9uTmFtZUlucHV0LmZvY3VzKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICB0aGlzLmZhY3Rpb25OYW1lSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDEzKSB7XHJcbiAgICAgICAgICAgIHRoaXMubmFtZUJ0bi5jbGljaygpO1xyXG4gICAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG4gICAgdGhpcy5uYW1lQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5jbGllbnQubWFpbkNhbnZhcy5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgdGhpcy5sZWFkZXJib2FyZC5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQuZW1pdChcIm5ld1BsYXllclwiLFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiB0aGlzLnBsYXllck5hbWVJbnB1dC52YWx1ZSxcclxuICAgICAgICAgICAgICAgIGZhY3Rpb246IHRoaXMuZmFjdGlvbk5hbWVJbnB1dC52YWx1ZVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB0aGlzLnBsYXllck5hbWVyLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMucGxheWVyTmFtZXIuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgdGhpcy5wbGF5ZXJOYW1lSW5wdXQuZm9jdXMoKTtcclxuICAgIHRoaXMubGVhZGVyYm9hcmQuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFBsYXllck5hbWVyVUk7IiwiZnVuY3Rpb24gU2hhcmROYW1lclVJKGNsaWVudCwgc29ja2V0KSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NoYXJkX25hbWVyX3VpJyk7XHJcbiAgICB0aGlzLnRleHRJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidGV4dF9pbnB1dFwiKTtcclxuICAgIHRoaXMubmFtZVNoYXJkQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJuYW1lX3NoYXJkX2J0blwiKTtcclxuXHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxuICAgIHRoaXMuc29ja2V0ID0gc29ja2V0O1xyXG5cclxuICAgIHRoaXMudGV4dElucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMpIHtcclxuICAgICAgICAgICAgdGhpcy5zdWJtaXQoKTtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG4gICAgdGhpcy5uYW1lU2hhcmRCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIHRoaXMuc3VibWl0KCk7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG59XHJcblxyXG5TaGFyZE5hbWVyVUkucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xyXG4gICAgdGhpcy50ZXh0SW5wdXQuZm9jdXMoKTtcclxufTtcclxuXHJcblxyXG5TaGFyZE5hbWVyVUkucHJvdG90eXBlLnN1Ym1pdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciB0ZXh0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0ZXh0X2lucHV0XCIpLnZhbHVlO1xyXG4gICAgaWYgKHRleHQgIT09IG51bGwgJiYgdGV4dCAhPT0gXCJcIikge1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoJ3RleHRJbnB1dCcsXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIGlkOiB0aGlzLmNsaWVudC5TRUxGSUQsXHJcbiAgICAgICAgICAgICAgICB3b3JkOiB0ZXh0XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICApXHJcbiAgICB9XHJcbiAgICB0aGlzLmNsb3NlKCk7XHJcbn07XHJcblxyXG5cclxuU2hhcmROYW1lclVJLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMudGV4dElucHV0LnZhbHVlID0gXCJcIjtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU2hhcmROYW1lclVJO1xyXG4iLCJmdW5jdGlvbiBDaGF0VUkocGFyZW50KSB7XHJcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcclxuICAgIHRoaXMudGVtcGxhdGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNoYXRfY29udGFpbmVyXCIpO1xyXG4gICAgdGhpcy50ZXh0SW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2hhdF9pbnB1dCcpO1xyXG4gICAgdGhpcy5jaGF0TGlzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjaGF0X2xpc3QnKTtcclxuXHJcblxyXG4gICAgdGhpcy50ZXh0SW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy50ZXh0SW5wdXQuZm9jdXMoKTtcclxuXHJcbiAgICAgICAgdGhpcy5qdXN0T3BlbmVkID0gdHJ1ZTtcclxuXHJcblxyXG4gICAgICAgIHRoaXMucGFyZW50LmNsaWVudC5DSEFUX09QRU4gPSB0cnVlO1xyXG4gICAgICAgIHRoaXMuY2hhdExpc3Quc3R5bGUuaGVpZ2h0ID0gXCI4MCVcIjtcclxuICAgICAgICB0aGlzLmNoYXRMaXN0LnN0eWxlLm92ZXJmbG93WSA9IFwiYXV0b1wiO1xyXG5cclxuICAgICAgICB0aGlzLnRleHRJbnB1dC5zdHlsZS5iYWNrZ3JvdW5kID0gXCJyZ2JhKDM0LCA0OCwgNzEsIDEpXCI7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMudGV4dElucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgIGlmIChlLmtleUNvZGUgPT09IDEzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2VuZE1lc3NhZ2UoKTtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMudGV4dElucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICBpZiAoZS5rZXlDb2RlID09PSA4NCAmJiB0aGlzLmp1c3RPcGVuZWQpIHtcclxuICAgICAgICAgICAgdGhpcy5qdXN0T3BlbmVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IHRoaXMudGV4dElucHV0LnZhbHVlO1xyXG4gICAgICAgICAgICB0aGlzLnRleHRJbnB1dC52YWx1ZSA9IHZhbHVlLnN1YnN0cigwLCB2YWx1ZS5sZW5ndGggLSAxKTtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMudGVtcGxhdGUuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V3aGVlbCcsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLnBhcmVudC5jbGllbnQuQ0hBVF9TQ1JPTEwgPSB0cnVlO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICB0aGlzLnRlbXBsYXRlLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLnBhcmVudC5jbGllbnQuQ0hBVF9DTElDSyA9IHRydWU7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG59XHJcblxyXG5DaGF0VUkucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAobWVzc2FnZSkge1xyXG4gICAgdGhpcy50ZW1wbGF0ZS5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xyXG4gICAgdGhpcy5jbG9zZSgpO1xyXG59O1xyXG5cclxuXHJcbkNoYXRVSS5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnRleHRJbnB1dC5ibHVyKCk7XHJcbiAgICB0aGlzLnBhcmVudC5jbGllbnQuQ0hBVF9PUEVOID0gZmFsc2U7XHJcbiAgICB0aGlzLmNoYXRMaXN0LnN0eWxlLmhlaWdodCA9IFwiMzAlXCI7XHJcbiAgICB0aGlzLmNoYXRMaXN0LnN0eWxlLmJhY2tncm91bmQgPSBcInJnYmEoMTgyLCAxOTMsIDIxMSwgMC4wMilcIjtcclxuICAgIHRoaXMudGV4dElucHV0LnN0eWxlLmJhY2tncm91bmQgPSBcInJnYmEoMTgyLCAxOTMsIDIxMSwgMC4xKVwiO1xyXG4gICAgdGhpcy5wYXJlbnQuY2xpZW50LkNIQVRfU0NST0xMID0gZmFsc2U7XHJcbiAgICAkKCcjY2hhdF9saXN0JykuYW5pbWF0ZSh7c2Nyb2xsVG9wOiAkKCcjY2hhdF9saXN0JykucHJvcChcInNjcm9sbEhlaWdodFwiKX0sIDEwMCk7XHJcbiAgICB0aGlzLmNoYXRMaXN0LnN0eWxlLm92ZXJmbG93WSA9IFwibm9uZVwiO1xyXG59O1xyXG5cclxuXHJcbkNoYXRVSS5wcm90b3R5cGUuYWRkTWVzc2FnZSA9IGZ1bmN0aW9uIChwYWNrZXQpIHtcclxuICAgIHZhciBlbnRyeSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XHJcbiAgICBlbnRyeS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShwYWNrZXQubmFtZSArIFwiIDogXCIgKyBwYWNrZXQuY2hhdE1lc3NhZ2UpKTtcclxuICAgIHRoaXMuY2hhdExpc3QuYXBwZW5kQ2hpbGQoZW50cnkpO1xyXG5cclxuICAgICQoJyNjaGF0X2xpc3QnKS5hbmltYXRlKHtzY3JvbGxUb3A6ICQoJyNjaGF0X2xpc3QnKS5wcm9wKFwic2Nyb2xsSGVpZ2h0XCIpfSwgMTAwKTtcclxufTtcclxuXHJcblxyXG5DaGF0VUkucHJvdG90eXBlLnNlbmRNZXNzYWdlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHNvY2tldCA9IHRoaXMucGFyZW50LnNvY2tldDtcclxuXHJcblxyXG4gICAgaWYgKHRoaXMudGV4dElucHV0LnZhbHVlICYmIHRoaXMudGV4dElucHV0LnZhbHVlICE9PSBcIlwiKSB7XHJcbiAgICAgICAgc29ja2V0LmVtaXQoJ2NoYXRNZXNzYWdlJywge1xyXG4gICAgICAgICAgICBpZDogdGhpcy5wYXJlbnQuY2xpZW50LlNFTEZJRCxcclxuICAgICAgICAgICAgbWVzc2FnZTogdGhpcy50ZXh0SW5wdXQudmFsdWVcclxuICAgICAgICB9KTtcclxuICAgICAgICB0aGlzLnRleHRJbnB1dC52YWx1ZSA9IFwiXCI7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICB0aGlzLmNsb3NlKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENoYXRVSTtcclxuXHJcblxyXG4iLCJmdW5jdGlvbiBHYW1lTXNnUHJvbXB0KHBhcmVudCkge1xyXG4gICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XHJcbiAgICB0aGlzLnRlbXBsYXRlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwcm9tcHRfY29udGFpbmVyXCIpO1xyXG4gICAgdGhpcy5tZXNzYWdlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dhbWVfbXNnX3Byb21wdCcpO1xyXG59XHJcblxyXG5HYW1lTXNnUHJvbXB0LnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKG1lc3NhZ2UpIHtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcclxuICAgIHRoaXMubWVzc2FnZS5pbm5lckhUTUwgPSBtZXNzYWdlO1xyXG59O1xyXG5cclxuR2FtZU1zZ1Byb21wdC5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gR2FtZU1zZ1Byb21wdDtcclxuXHJcblxyXG4iLCJ2YXIgR2FtZU1zZ1Byb21wdCA9IHJlcXVpcmUoJy4vR2FtZU1zZ1Byb21wdCcpO1xyXG52YXIgU2hhcmROYW1lclByb21wdCA9IHJlcXVpcmUoJy4vU2hhcmROYW1lclByb21wdCcpO1xyXG52YXIgQ2hhdFVJID0gcmVxdWlyZSgnLi9DaGF0VUknKTtcclxuXHJcbmZ1bmN0aW9uIEdhbWVVSShjbGllbnQsIHNvY2tldCwgcGFyZW50KSB7XHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxuICAgIHRoaXMuc29ja2V0ID0gc29ja2V0O1xyXG4gICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XHJcbiAgICB0aGlzLmdhbWVNc2dQcm9tcHQgPSBuZXcgR2FtZU1zZ1Byb21wdCh0aGlzKTtcclxuICAgIHRoaXMuc2hhcmROYW1lclByb21wdCA9IG5ldyBTaGFyZE5hbWVyUHJvbXB0KHRoaXMpO1xyXG4gICAgdGhpcy5jaGF0VUkgPSBuZXcgQ2hhdFVJKHRoaXMpO1xyXG59XHJcblxyXG5HYW1lVUkucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBjb25zb2xlLmxvZyhcIk9QRU5JTkcgR0FNRSBVSVwiKTtcclxuICAgIHRoaXMuc2hhcmROYW1lclByb21wdC5vcGVuKCk7XHJcbiAgICB0aGlzLmNoYXRVSS5vcGVuKCk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9ICBHYW1lVUk7IiwiZnVuY3Rpb24gR2FtZU1zZ1Byb21wdChwYXJlbnQpIHtcclxuICAgIHRoaXMudGVtcGxhdGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2hhcmRfbmFtZXJfY29udGFpbmVyJyk7XHJcbiAgICB0aGlzLnNoYXJkTmFtZXJQcm9tcHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2hhcmRfbmFtZXJfcHJvbXB0Jyk7XHJcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcclxuXHJcbiAgICB0aGlzLnNoYXJkTmFtZXJQcm9tcHQuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLnBhcmVudC5wYXJlbnQuc2hhcmROYW1lclVJLm9wZW4oKTtcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcbn1cclxuXHJcbkdhbWVNc2dQcm9tcHQucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAobWVzc2FnZSkge1xyXG4gICAgdGhpcy50ZW1wbGF0ZS5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xyXG59O1xyXG5cclxuR2FtZU1zZ1Byb21wdC5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gR2FtZU1zZ1Byb21wdDtcclxuIiwidmFyIExpc3RVSSA9IHJlcXVpcmUoJy4vTGlzdFVJJyk7XHJcblxyXG5mdW5jdGlvbiBCb3RzUGFnZShob21lVUkpIHtcclxuICAgIHRoaXMudGVtcGxhdGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImJvdHNfcGFnZVwiKTtcclxuICAgIHRoaXMuYm90c0xpc3RVSSA9IG5ldyBMaXN0VUkoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JvdHNfbGlzdCcpLCBob21lVUkpO1xyXG4gICAgdGhpcy5ob21lVUkgPSBob21lVUk7XHJcbn1cclxuXHJcbkJvdHNQYWdlLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy50ZW1wbGF0ZS5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xyXG4gICAgaWYgKHRoaXMuaG9tZVVJLmhvbWUudHlwZSA9PT0gXCJCYXJyYWNrc1wiKSB7XHJcbiAgICAgICAgdGhpcy5ib3RzTGlzdFVJLmFkZEJvdHMoKTtcclxuICAgIH1cclxufTtcclxuXHJcbkJvdHNQYWdlLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG59O1xyXG5cclxuQm90c1BhZ2UucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGlmICh0aGlzLmhvbWVVSS5ob21lLnR5cGUgPT09IFwiQmFycmFja3NcIikge1xyXG4gICAgICAgIHRoaXMuYm90c0xpc3RVSS5hZGRCb3RzKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEJvdHNQYWdlO1xyXG5cclxuIiwidmFyIExpc3RVSSA9IHJlcXVpcmUoJy4vTGlzdFVJJyk7XHJcblxyXG5cclxuZnVuY3Rpb24gQnVpbGRQYWdlKGhvbWVVSSkge1xyXG4gICAgdGhpcy50ZW1wbGF0ZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY3JlYXRlX3BhZ2VcIik7XHJcbiAgICB0aGlzLmNyZWF0ZUJvdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY3JlYXRlX2JvdF9jb250YWluZXJcIik7XHJcbiAgICB0aGlzLm1ha2VTb2xkaWVyQm90c0J0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYWtlX3NvbGRpZXJfYm90c19idG4nKTtcclxuICAgIHRoaXMubWFrZUJvb3N0ZXJCb3RzQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21ha2VfYm9vc3Rlcl9ib3RzX2J0bicpO1xyXG4gICAgdGhpcy5tYWtlU3RlYWx0aEJvdHNCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFrZV9zdGVhbHRoX2JvdHNfYnRuJyk7XHJcbiAgICB0aGlzLnNvY2tldCA9IGhvbWVVSS5zb2NrZXQ7XHJcblxyXG4gICAgdGhpcy5TRUxFQ1RFRF9TSEFSRFMgPSB7fTtcclxuICAgIHRoaXMuYnVpbGRRdWV1ZVVJID0gbmV3IExpc3RVSShkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnVpbGRfcXVldWUnKSwgaG9tZVVJKTtcclxuICAgIHRoaXMuc2hhcmRzVUkgPSBuZXcgTGlzdFVJKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdidWlsZF9zaGFyZHNfbGlzdCcpLCBob21lVUksIHRoaXMpO1xyXG4gICAgdGhpcy5ob21lVUkgPSBob21lVUk7XHJcbn1cclxuXHJcblxyXG5CdWlsZFBhZ2UucHJvdG90eXBlLmNoZWNrU2VsZWN0aW9uID0gZnVuY3Rpb24gKGlucHV0KSB7XHJcbiAgICB2YXIgbWFrZVNvbGRpZXJCb3RzQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21ha2Vfc29sZGllcl9ib3RzX2J0bicpO1xyXG4gICAgdmFyIG1ha2VCb29zdGVyQm90c0J0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYWtlX2Jvb3N0ZXJfYm90c19idG4nKTtcclxuICAgIHZhciBtYWtlU3RlYWx0aEJvdHNCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFrZV9zdGVhbHRoX2JvdHNfYnRuJyk7XHJcblxyXG4gICAgaWYgKGlucHV0ID4gMCkge1xyXG4gICAgICAgIG1ha2VTb2xkaWVyQm90c0J0bi5kaXNhYmxlZCA9IGZhbHNlO1xyXG4gICAgICAgIG1ha2VCb29zdGVyQm90c0J0bi5kaXNhYmxlZCA9IGZhbHNlO1xyXG4gICAgICAgIG1ha2VTdGVhbHRoQm90c0J0bi5kaXNhYmxlZCA9IGZhbHNlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBtYWtlU29sZGllckJvdHNCdG4uZGlzYWJsZWQgPSBcImRpc2FibGVkXCI7XHJcbiAgICAgICAgbWFrZUJvb3N0ZXJCb3RzQnRuLmRpc2FibGVkID0gXCJkaXNhYmxlZFwiO1xyXG4gICAgICAgIG1ha2VTdGVhbHRoQm90c0J0bi5kaXNhYmxlZCA9IFwiZGlzYWJsZWRcIjtcclxuICAgIH1cclxufTtcclxuXHJcbkJ1aWxkUGFnZS5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcclxuICAgIHRoaXMuU0VMRUNURURfU0hBUkRTID0ge307XHJcblxyXG4gICAgdmFyIG1ha2VTb2xkaWVyQm90cyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLnNvY2tldC5lbWl0KCdtYWtlQm90cycsIHtcclxuICAgICAgICAgICAgYm90VHlwZTogXCJzb2xkaWVyXCIsXHJcbiAgICAgICAgICAgIGhvbWU6IHRoaXMuaG9tZVVJLmhvbWUuaWQsXHJcbiAgICAgICAgICAgIHNoYXJkczogdGhpcy5TRUxFQ1RFRF9TSEFSRFNcclxuICAgICAgICB9KTtcclxuICAgIH0uYmluZCh0aGlzKTtcclxuICAgIHZhciBtYWtlQm9vc3RlckJvdHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQuZW1pdCgnbWFrZUJvdHMnLCB7XHJcbiAgICAgICAgICAgIGJvdFR5cGU6IFwiYm9vc3RlclwiLFxyXG4gICAgICAgICAgICBob21lOiB0aGlzLmhvbWVVSS5ob21lLmlkLFxyXG4gICAgICAgICAgICBzaGFyZHM6IHRoaXMuU0VMRUNURURfU0hBUkRTXHJcbiAgICAgICAgfSlcclxuICAgIH0uYmluZCh0aGlzKTtcclxuICAgIHZhciBtYWtlU3RlYWx0aEJvdHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQuZW1pdCgnbWFrZUJvdHMnLCB7XHJcbiAgICAgICAgICAgIGJvdFR5cGU6IFwic3RlYWx0aFwiLFxyXG4gICAgICAgICAgICBob21lOiB0aGlzLmhvbWVVSS5ob21lLmlkLFxyXG4gICAgICAgICAgICBzaGFyZHM6IHRoaXMuU0VMRUNURURfU0hBUkRTXHJcbiAgICAgICAgfSlcclxuICAgIH0uYmluZCh0aGlzKTtcclxuXHJcbiAgICBpZiAodGhpcy5ob21lVUkuaG9tZS50eXBlID09PSBcIkJhcnJhY2tzXCIpIHtcclxuICAgICAgICB0aGlzLm1ha2VTb2xkaWVyQm90c0J0biA9IHRoaXMuaG9tZVVJLnJlc2V0QnV0dG9uKHRoaXMubWFrZVNvbGRpZXJCb3RzQnRuLCBtYWtlU29sZGllckJvdHMpO1xyXG4gICAgICAgIHRoaXMubWFrZUJvb3N0ZXJCb3RzQnRuID0gdGhpcy5ob21lVUkucmVzZXRCdXR0b24odGhpcy5tYWtlQm9vc3RlckJvdHNCdG4sIG1ha2VCb29zdGVyQm90cyk7XHJcbiAgICAgICAgdGhpcy5tYWtlU3RlYWx0aEJvdHNCdG4gPSB0aGlzLmhvbWVVSS5yZXNldEJ1dHRvbih0aGlzLm1ha2VTdGVhbHRoQm90c0J0biwgbWFrZVN0ZWFsdGhCb3RzKTtcclxuXHJcbiAgICAgICAgdGhpcy5jcmVhdGVCb3Quc3R5bGUuZGlzcGxheSA9IFwiZmxleFwiO1xyXG4gICAgICAgIHRoaXMuYnVpbGRRdWV1ZVVJLmFkZFF1ZXVlKHRoaXMuaG9tZVVJLmhvbWUpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLmNyZWF0ZUJvdC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcbiAgICB9XHJcbiAgICB0aGlzLnNoYXJkc1VJLmFkZFNoYXJkcygpO1xyXG59O1xyXG5cclxuQnVpbGRQYWdlLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG59O1xyXG5cclxuXHJcbkJ1aWxkUGFnZS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5idWlsZFF1ZXVlVUkuYWRkUXVldWUoKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQnVpbGRQYWdlO1xyXG5cclxuIiwidmFyIFVwZ3JhZGVzUGFnZSA9IHJlcXVpcmUoJy4vVXBncmFkZXNQYWdlJyk7XHJcbnZhciBCb3RzUGFnZSA9IHJlcXVpcmUoJy4vQm90c1BhZ2UnKTtcclxudmFyIEJ1aWxkUGFnZSA9IHJlcXVpcmUoJy4vQnVpbGRQYWdlJyk7XHJcblxyXG5mdW5jdGlvbiBIb21lVUkoY2xpZW50LCBzb2NrZXQpIHtcclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XHJcbiAgICB0aGlzLnRlbXBsYXRlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2hvbWVfdWknKTtcclxuICAgIHRoaXMuaG9tZSA9IG51bGw7XHJcbn1cclxuXHJcbkhvbWVVSS5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uIChob21lKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xyXG4gICAgdGhpcy5ob21lID0gaG9tZTtcclxuXHJcbiAgICBpZiAoIXRoaXMudXBncmFkZXNQYWdlKSB7XHJcbiAgICAgICAgdGhpcy51cGdyYWRlc1BhZ2UgPSBuZXcgVXBncmFkZXNQYWdlKHRoaXMpO1xyXG4gICAgICAgIHRoaXMuYm90c1BhZ2UgPSBuZXcgQm90c1BhZ2UodGhpcyk7XHJcbiAgICAgICAgdGhpcy5idWlsZFBhZ2UgPSBuZXcgQnVpbGRQYWdlKHRoaXMpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZFRhYkxpc3RlbmVycygpO1xyXG4gICAgICAgIHRoaXMuYWRkQ2xvc2VMaXN0ZW5lcigpO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMub3BlbkhvbWVJbmZvKCk7XHJcbiAgICB0aGlzLnVwZ3JhZGVzUGFnZS5vcGVuKCk7XHJcbiAgICB0aGlzLmJ1aWxkUGFnZS5jbG9zZSgpO1xyXG4gICAgdGhpcy5ib3RzUGFnZS5jbG9zZSgpO1xyXG5cclxuICAgIC8vdGhpcy5vcGVuQ29sb3JQaWNrZXIoaG9tZSk7XHJcbn07XHJcblxyXG5Ib21lVUkucHJvdG90eXBlLm9wZW5Ib21lSW5mbyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdob21lX3R5cGUnKS5pbm5lckhUTUwgPSB0aGlzLmhvbWUudHlwZTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdob21lX2xldmVsJykuaW5uZXJIVE1MID0gdGhpcy5ob21lLmxldmVsO1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2hvbWVfaGVhbHRoJykuaW5uZXJIVE1MID0gdGhpcy5ob21lLmhlYWx0aDtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdob21lX3Bvd2VyJykuaW5uZXJIVE1MID0gdGhpcy5ob21lLnBvd2VyO1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2hvbWVfZmFjdGlvbl9uYW1lJykuaW5uZXJIVE1MID0gdGhpcy5ob21lLmZhY3Rpb247XHJcbn07XHJcblxyXG5Ib21lVUkucHJvdG90eXBlLm9wZW5Db2xvclBpY2tlciA9IGZ1bmN0aW9uIChob21lKSB7XHJcbiAgICB2YXIgY29sb3JQaWNrZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNvbG9yX3BpY2tlclwiKTtcclxuICAgIHZhciBjb2xvckNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY29sb3JfY2FudmFzXCIpO1xyXG4gICAgdmFyIGNvbG9yQ3R4ID0gY29sb3JDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG5cclxuICAgIGNvbG9yQ2FudmFzLndpZHRoID0gMTAwO1xyXG4gICAgY29sb3JDYW52YXMuaGVpZ2h0ID0gMTAwO1xyXG5cclxuICAgIGlmICghaG9tZS5oYXNDb2xvciAmJiBob21lLmxldmVsID4gMSkge1xyXG4gICAgICAgIGNvbG9yUGlja2VyLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBjb2xvclBpY2tlci5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdmFyIGNvbG9ycyA9IG5ldyBJbWFnZSgpO1xyXG4gICAgY29sb3JzLnNyYyA9ICdjb2xvcnMuanBnJztcclxuICAgIGNvbG9ycy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgY29sb3JDdHguZmlsbFN0eWxlID0gXCIjMzMzZWVlXCI7XHJcbiAgICAgICAgY29sb3JDdHguZmlsbFJlY3QoMCwgMCwgY29sb3JDYW52YXMud2lkdGggLyAyLCBjb2xvckNhbnZhcy5oZWlnaHQgLyAyKTtcclxuICAgICAgICBjb2xvckN0eC5maWxsU3R5bGUgPSBcIiM2MjNlZWVcIjtcclxuICAgICAgICBjb2xvckN0eC5maWxsUmVjdChjb2xvckNhbnZhcy53aWR0aCAvIDIsIGNvbG9yQ2FudmFzLmhlaWdodCAvIDIsIGNvbG9yQ2FudmFzLndpZHRoLCBjb2xvckNhbnZhcy5oZWlnaHQpO1xyXG4gICAgfTtcclxuXHJcbiAgICBjb2xvckNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgdmFyIHJlY3QgPSBjb2xvckNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICB2YXIgeCA9IGV2ZW50LmNsaWVudFggLSByZWN0LmxlZnQ7XHJcbiAgICAgICAgdmFyIHkgPSBldmVudC5jbGllbnRZIC0gcmVjdC50b3A7XHJcbiAgICAgICAgdmFyIGltZ19kYXRhID0gY29sb3JDdHguZ2V0SW1hZ2VEYXRhKHgsIHksIDEwMCwgMTAwKS5kYXRhO1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJuZXdDb2xvclwiLCB7XHJcbiAgICAgICAgICAgIGhvbWU6IGhvbWUuaWQsXHJcbiAgICAgICAgICAgIGNvbG9yOiB7XHJcbiAgICAgICAgICAgICAgICByOiBpbWdfZGF0YVswXSxcclxuICAgICAgICAgICAgICAgIGc6IGltZ19kYXRhWzFdLFxyXG4gICAgICAgICAgICAgICAgYjogaW1nX2RhdGFbMl1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxufTtcclxuXHJcbkhvbWVVSS5wcm90b3R5cGUuYWRkVGFiTGlzdGVuZXJzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHVwZ3JhZGVzVGFiID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3VwZ3JhZGVzX3RhYicpO1xyXG4gICAgdmFyIGNyZWF0ZVRhYiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjcmVhdGVfdGFiJyk7XHJcbiAgICB2YXIgYm90c1RhYiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdib3RzX3RhYicpO1xyXG5cclxuICAgIHVwZ3JhZGVzVGFiLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGV2dCkge1xyXG4gICAgICAgIHRoaXMudXBncmFkZXNQYWdlLm9wZW4oKTtcclxuICAgICAgICB0aGlzLmJ1aWxkUGFnZS5jbG9zZSgpO1xyXG4gICAgICAgIHRoaXMuYm90c1BhZ2UuY2xvc2UoKTtcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG4gICAgY3JlYXRlVGFiLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGV2dCkge1xyXG4gICAgICAgIHRoaXMudXBncmFkZXNQYWdlLmNsb3NlKCk7XHJcbiAgICAgICAgdGhpcy5idWlsZFBhZ2Uub3BlbigpO1xyXG4gICAgICAgIHRoaXMuYm90c1BhZ2UuY2xvc2UoKTtcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG4gICAgYm90c1RhYi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChldnQpIHtcclxuICAgICAgICB0aGlzLnVwZ3JhZGVzUGFnZS5jbG9zZSgpO1xyXG4gICAgICAgIHRoaXMuYnVpbGRQYWdlLmNsb3NlKCk7XHJcbiAgICAgICAgdGhpcy5ib3RzUGFnZS5vcGVuKCk7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG59O1xyXG5cclxuSG9tZVVJLnByb3RvdHlwZS5hZGRDbG9zZUxpc3RlbmVyID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGNsb3NlQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjbG9zZV9ob21lX3VpXCIpO1xyXG4gICAgY2xvc2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLmNsaWVudC5tYWluVUkuY2xvc2UoXCJob21lIGluZm9cIik7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG59O1xyXG5cclxuSG9tZVVJLnByb3RvdHlwZS5yZXNldEJ1dHRvbiA9IGZ1bmN0aW9uIChidXR0b24sIGNhbGxiYWNrKSB7XHJcbiAgICB2YXIgc2V0U2tpbGxNZXRlciA9IGZ1bmN0aW9uIChidXR0b24pIHtcclxuICAgICAgICB2YXIgZmluZENoaWxkQ2FudmFzID0gZnVuY3Rpb24gKHNraWxsRGl2KSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2tpbGxEaXYuY2hpbGROb2Rlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHNraWxsRGl2LmNoaWxkTm9kZXNbaV0ubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gXCJjYW52YXNcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBza2lsbERpdi5jaGlsZE5vZGVzW2ldO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgdmFyIGNhbnZhcyA9IGZpbmRDaGlsZENhbnZhcyhidXR0b24ucGFyZW50Tm9kZSk7XHJcbiAgICAgICAgY2FudmFzLndpZHRoID0gMjYwO1xyXG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSAxMDA7XHJcbiAgICAgICAgdmFyIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XHJcbiAgICAgICAgY3R4LmNsZWFyUmVjdCgwLCAwLCAxMDAwLCAyMDApO1xyXG4gICAgICAgIHZhciBtYWduaXR1ZGUgPSAwO1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcIiNGRkZGRkZcIjtcclxuICAgICAgICBzd2l0Y2ggKGJ1dHRvbi51cGdUeXBlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJob21lSGVhbHRoXCI6XHJcbiAgICAgICAgICAgICAgICBtYWduaXR1ZGUgPSB0aGlzLmhvbWUucG93ZXI7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcImRtZ1wiOlxyXG4gICAgICAgICAgICAgICAgbWFnbml0dWRlID0gdGhpcy5ob21lLnVuaXREbWc7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcImFybW9yXCI6XHJcbiAgICAgICAgICAgICAgICBtYWduaXR1ZGUgPSB0aGlzLmhvbWUudW5pdEFybW9yO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJzcGVlZFwiOlxyXG4gICAgICAgICAgICAgICAgbWFnbml0dWRlID0gdGhpcy5ob21lLnVuaXRTcGVlZDtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICB9XHJcbiAgICAgICAgY3R4LmZpbGxSZWN0KDAsIDAsIG1hZ25pdHVkZSAqIDEwLCAyMDApO1xyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG4gICAgdmFyIG5ld0J1dHRvbiA9IGJ1dHRvbi5jbG9uZU5vZGUodHJ1ZSk7XHJcbiAgICBuZXdCdXR0b24udXBnVHlwZSA9IGJ1dHRvbi51cGdUeXBlO1xyXG5cclxuICAgIGJ1dHRvbi5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdCdXR0b24sIGJ1dHRvbik7XHJcbiAgICBidXR0b24gPSBuZXdCdXR0b247XHJcbiAgICBidXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjYWxsYmFjayk7XHJcbiAgICBpZiAoYnV0dG9uLnVwZ1R5cGUpIHtcclxuICAgICAgICBzZXRTa2lsbE1ldGVyKGJ1dHRvbik7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gYnV0dG9uO1xyXG59O1xyXG5cclxuSG9tZVVJLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSG9tZVVJO1xyXG4iLCJmdW5jdGlvbiBMaXN0VUkobGlzdCwgaG9tZVVJLCBwYXJlbnQpIHtcclxuICAgIHRoaXMubGlzdCA9IGxpc3Q7XHJcbiAgICB0aGlzLmhvbWVVSSA9IGhvbWVVSTtcclxuICAgIHRoaXMuY2xpZW50ID0gaG9tZVVJLmNsaWVudDtcclxuICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xyXG5cclxuICAgIHRoaXMubGlzdC5hZGRFdmVudExpc3RlbmVyKCdzY3JvbGwnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICB0aGlzLmhvbWVVSS5MSVNUX1NDUk9MTCA9IHRydWU7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG59XHJcblxyXG5MaXN0VUkucHJvdG90eXBlLmFkZFF1ZXVlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGhvbWUgPSB0aGlzLmhvbWVVSS5ob21lO1xyXG4gICAgdGhpcy5saXN0LmlubmVySFRNTCA9IFwiXCI7XHJcbiAgICBpZiAoIWhvbWUucXVldWUpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGhvbWUucXVldWUubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgYnVpbGRJbmZvID0gaG9tZS5xdWV1ZVtpXTtcclxuICAgICAgICB2YXIgZW50cnkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xyXG4gICAgICAgIGVudHJ5LmlkID0gTWF0aC5yYW5kb20oKTtcclxuXHJcbiAgICAgICAgKGZ1bmN0aW9uIChfaWQpIHtcclxuICAgICAgICAgICAgZW50cnkuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5jbGlja2VkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGlja2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0eWxlLmJhY2tncm91bmQgPSBcIiNmZmZiMjJcIjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2xpY2tlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3R5bGUuYmFja2dyb3VuZCA9IFwiIzU0MmZjZVwiO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KShlbnRyeS5pZCk7XHJcblxyXG4gICAgICAgIGVudHJ5LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKFxyXG4gICAgICAgICAgICBidWlsZEluZm8uc2hhcmROYW1lICsgXCIgLS0gXCIgKyBNYXRoLmZsb29yKGJ1aWxkSW5mby50aW1lciAvIDEwMDApICtcclxuICAgICAgICAgICAgXCI6XCIgKyBNYXRoLmZsb29yKGJ1aWxkSW5mby50aW1lciAlIDEwMDApKSk7XHJcbiAgICAgICAgdGhpcy5saXN0LmFwcGVuZENoaWxkKGVudHJ5KTtcclxuICAgIH1cclxufTtcclxuXHJcbkxpc3RVSS5wcm90b3R5cGUuYWRkQm90cyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBob21lID0gdGhpcy5ob21lVUkuaG9tZTtcclxuICAgIHRoaXMubGlzdC5pbm5lckhUTUwgPSBcIlwiO1xyXG4gICAgaWYgKCFob21lLnF1ZXVlKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBob21lLmJvdHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgYm90SW5mbyA9IGhvbWUuYm90c1tpXTtcclxuICAgICAgICB2YXIgZW50cnkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xyXG4gICAgICAgIGVudHJ5LmlkID0gTWF0aC5yYW5kb20oKTtcclxuXHJcbiAgICAgICAgKGZ1bmN0aW9uIChfaWQpIHtcclxuICAgICAgICAgICAgZW50cnkuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5jbGlja2VkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGlja2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0eWxlLmJhY2tncm91bmQgPSBcIiNmZmZiMjJcIjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2xpY2tlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3R5bGUuYmFja2dyb3VuZCA9IFwiIzU0MmZjZVwiO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KShlbnRyeS5pZCk7XHJcblxyXG4gICAgICAgIGVudHJ5LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKFxyXG4gICAgICAgICAgICBib3RJbmZvLm5hbWUgKyBcIiAtLSBcIiArIFwiTGV2ZWw6XCIgKyBib3RJbmZvLmxldmVsKSk7XHJcbiAgICAgICAgdGhpcy5saXN0LmFwcGVuZENoaWxkKGVudHJ5KTtcclxuICAgIH1cclxufTtcclxuXHJcbkxpc3RVSS5wcm90b3R5cGUuYWRkU2hhcmRzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGhvbWUgPSB0aGlzLmhvbWVVSS5ob21lO1xyXG4gICAgdmFyIFNFTEVDVEVEX1NIQVJEUyA9IHRoaXMucGFyZW50LlNFTEVDVEVEX1NIQVJEUztcclxuICAgIHRoaXMubGlzdC5pbm5lckhUTUwgPSBcIlwiO1xyXG5cclxuICAgIHZhciBjaGVja1NlbGVjdGlvbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLnBhcmVudC5jaGVja1NlbGVjdGlvbihPYmplY3Quc2l6ZShTRUxFQ1RFRF9TSEFSRFMpKTtcclxuICAgIH0uYmluZCh0aGlzKTtcclxuXHJcbiAgICBjaGVja1NlbGVjdGlvbigpO1xyXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCBob21lLnNoYXJkcy5sZW5ndGg7IGorKykge1xyXG4gICAgICAgIHZhciBlbnRyeSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XHJcbiAgICAgICAgdmFyIHNoYXJkID0gdGhpcy5jbGllbnQuU0hBUkRfTElTVFtob21lLnNoYXJkc1tqXV07XHJcblxyXG5cclxuICAgICAgICBlbnRyeS5pZCA9IHNoYXJkLmlkO1xyXG5cclxuICAgICAgICAoZnVuY3Rpb24gKF9pZCkge1xyXG4gICAgICAgICAgICBlbnRyeS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmNsaWNrZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNsaWNrZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3R5bGUuYmFja2dyb3VuZCA9IFwiI2ZmZmIyMlwiO1xyXG4gICAgICAgICAgICAgICAgICAgIFNFTEVDVEVEX1NIQVJEU1tfaWRdID0gX2lkO1xyXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrU2VsZWN0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNsaWNrZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0eWxlLmJhY2tncm91bmQgPSBcIiM1NDJmY2VcIjtcclxuICAgICAgICAgICAgICAgICAgICBkZWxldGUgU0VMRUNURURfU0hBUkRTW19pZF07XHJcbiAgICAgICAgICAgICAgICAgICAgY2hlY2tTZWxlY3Rpb24oKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSkoZW50cnkuaWQpO1xyXG5cclxuICAgICAgICBlbnRyeS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzaGFyZC5uYW1lKSk7XHJcbiAgICAgICAgdGhpcy5saXN0LmFwcGVuZENoaWxkKGVudHJ5KTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IExpc3RVSTtcclxuXHJcbk9iamVjdC5zaXplID0gZnVuY3Rpb24ob2JqKSB7XHJcbiAgICB2YXIgc2l6ZSA9IDAsIGtleTtcclxuICAgIGZvciAoa2V5IGluIG9iaikge1xyXG4gICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5KSkgc2l6ZSsrO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHNpemU7XHJcbn07IiwidmFyIExpc3RVSSA9IHJlcXVpcmUoJy4vTGlzdFVJJyk7XHJcblxyXG5mdW5jdGlvbiBVcGdyYWRlc1BhZ2UoaG9tZVVJKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ1cGdyYWRlc19wYWdlXCIpO1xyXG4gICAgdGhpcy51bml0VXBncmFkZXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInVuaXRfdXBncmFkZXNcIik7XHJcbiAgICB0aGlzLmJsZEJhc2VIZWFsdGhCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmxkX2hvbWVfYnRuJyk7XHJcbiAgICB0aGlzLmJsZEFybW9yQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JsZF9hcm1vcicpO1xyXG4gICAgdGhpcy5ibGRTcGVlZEJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdibGRfc3BlZWQnKTtcclxuICAgIHRoaXMuYmxkRG1nQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JsZF9kYW1hZ2UnKTtcclxuXHJcbiAgICB0aGlzLlNFTEVDVEVEX1NIQVJEUyA9IHt9O1xyXG5cclxuICAgIHRoaXMuc2hhcmRzVUkgPSBuZXcgTGlzdFVJKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidXBncmFkZXNfc2hhcmRzX2xpc3RcIiksIGhvbWVVSSwgdGhpcyk7XHJcbiAgICB0aGlzLmhvbWVVSSA9IGhvbWVVSTtcclxuICAgIHRoaXMuc29ja2V0ID0gdGhpcy5ob21lVUkuc29ja2V0O1xyXG59XHJcblxyXG5VcGdyYWRlc1BhZ2UucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcbiAgICB0aGlzLmJsZEJhc2VIZWFsdGhCdG4udXBnVHlwZSA9IFwiaG9tZUhlYWx0aFwiO1xyXG4gICAgdGhpcy5ibGRBcm1vckJ0bi51cGdUeXBlID0gXCJhcm1vclwiO1xyXG4gICAgdGhpcy5ibGRTcGVlZEJ0bi51cGdUeXBlID0gXCJzcGVlZFwiO1xyXG4gICAgdGhpcy5ibGREbWdCdG4udXBnVHlwZSA9IFwiZG1nXCI7XHJcblxyXG4gICAgdGhpcy5zaGFyZHNVSS5hZGRTaGFyZHMoKTtcclxuXHJcbiAgICB2YXIgYmxkSG9tZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLnNvY2tldC5lbWl0KCdidWlsZEhvbWUnLCB7XHJcbiAgICAgICAgICAgIGhvbWU6IHRoaXMuaG9tZVVJLmhvbWUuaWQsXHJcbiAgICAgICAgICAgIHNoYXJkczogdGhpcy5TRUxFQ1RFRF9TSEFSRFNcclxuICAgICAgICB9KVxyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG4gICAgdmFyIHVwZ1VuaXQgPSBmdW5jdGlvbiAoKSB7IC8vVE9ETzogZml4IHVwZ3JhZGluZyB1bml0c1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoJ3VwZ3JhZGVVbml0Jywge1xyXG4gICAgICAgICAgICBob21lOiB0aGlzLmhvbWVVSS5ob21lLmlkLFxyXG4gICAgICAgICAgICB0eXBlOiB0aGlzLnVwZ1R5cGUsXHJcbiAgICAgICAgICAgIHNoYXJkczogdGhpcy5TRUxFQ1RFRF9TSEFSRFNcclxuICAgICAgICB9KTtcclxuICAgIH0uYmluZCh0aGlzKTtcclxuXHJcbiAgICB0aGlzLmJsZEJhc2VIZWFsdGhCdG4gPSB0aGlzLmhvbWVVSS5yZXNldEJ1dHRvbih0aGlzLmJsZEJhc2VIZWFsdGhCdG4sIGJsZEhvbWUpO1xyXG5cclxuICAgIGlmICh0aGlzLmhvbWVVSS5ob21lLnR5cGUgPT09IFwiQmFycmFja3NcIikge1xyXG4gICAgICAgIHRoaXMudW5pdFVwZ3JhZGVzLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcbiAgICAgICAgdGhpcy5ibGRBcm1vckJ0biA9IHRoaXMuaG9tZVVJLnJlc2V0QnV0dG9uKHRoaXMuYmxkQXJtb3JCdG4sIHVwZ1VuaXQpO1xyXG4gICAgICAgIHRoaXMuYmxkU3BlZWRCdG4gPSB0aGlzLmhvbWVVSS5yZXNldEJ1dHRvbih0aGlzLmJsZFNwZWVkQnRuLCB1cGdVbml0KTtcclxuICAgICAgICB0aGlzLmJsZERtZ0J0biA9IHRoaXMuaG9tZVVJLnJlc2V0QnV0dG9uKHRoaXMuYmxkRG1nQnRuLCB1cGdVbml0KTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIHRoaXMudW5pdFVwZ3JhZGVzLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5VcGdyYWRlc1BhZ2UucHJvdG90eXBlLmNoZWNrU2VsZWN0aW9uID0gZnVuY3Rpb24gKGlucHV0KSB7XHJcbiAgICB2YXIgYmxkQmFzZUhlYWx0aEJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdibGRfaG9tZV9idG4nKTtcclxuICAgIHZhciBibGRBcm1vckJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdibGRfYXJtb3InKTtcclxuICAgIHZhciBibGRTcGVlZEJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdibGRfc3BlZWQnKTtcclxuICAgIHZhciBibGREbWdCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmxkX2RhbWFnZScpO1xyXG5cclxuICAgIGlmIChpbnB1dCA+IDApIHtcclxuICAgICAgICBibGRCYXNlSGVhbHRoQnRuLmRpc2FibGVkID0gZmFsc2U7XHJcbiAgICAgICAgYmxkQXJtb3JCdG4uZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICBibGRTcGVlZEJ0bi5kaXNhYmxlZCA9IGZhbHNlO1xyXG4gICAgICAgIGJsZERtZ0J0bi5kaXNhYmxlZCA9IGZhbHNlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBibGRCYXNlSGVhbHRoQnRuLmRpc2FibGVkID0gXCJkaXNhYmxlZFwiO1xyXG4gICAgICAgIGJsZEFybW9yQnRuLmRpc2FibGVkID0gXCJkaXNhYmxlZFwiO1xyXG4gICAgICAgIGJsZFNwZWVkQnRuLmRpc2FibGVkID0gXCJkaXNhYmxlZFwiO1xyXG4gICAgICAgIGJsZERtZ0J0bi5kaXNhYmxlZCA9IFwiZGlzYWJsZWRcIjtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5VcGdyYWRlc1BhZ2UucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy50ZW1wbGF0ZS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcbn07XHJcblxyXG5VcGdyYWRlc1BhZ2UucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuc2hhcmRzVUkuYWRkU2hhcmRzKClcclxufTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFVwZ3JhZGVzUGFnZTsiXX0=
