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
            this.ARROW = new Entity.Arrow(event.x / this.mainCanvas.offsetWidth * 1000,
                event.y / this.mainCanvas.offsetHeight * 500, this);
        }
    }.bind(this));

    this.mainCanvas.addEventListener("mouseup", function (event) {
        if (!this.rightClick) {
            this.ARROW.postX = event.x / this.mainCanvas.offsetWidth * 1000;
            this.ARROW.postY = event.y / this.mainCanvas.offsetHeight * 500;

            this.socket.emit("selectBots", {
                minX: (this.ARROW.preX - this.draftCanvas.width / 2) / this.scaleFactor,
                minY: (this.ARROW.preY - this.draftCanvas.height / 2) / this.scaleFactor,
                maxX: (this.ARROW.postX - this.draftCanvas.width / 2) / this.scaleFactor,
                maxY: (this.ARROW.postY - this.draftCanvas.height / 2) / this.scaleFactor
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
    }.bind(this));

    this.mainCanvas.addEventListener("mousemove", function (event) {
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

Client.prototype.initSocket = function () {
    this.socket = io();
    this.socket.verified = false;

    this.socket.on('addFactionsUI', this.addFactionstoUI.bind(this));
    this.socket.on('updateEntities', this.handlePacket.bind(this));
    this.socket.on('drawScene', this.drawScene.bind(this));
};

Client.prototype.initViewers = function () {
    this.keys = [];
    this.scaleFactor = 1;
    this.mainScaleFactor = 1;
    console.log("MAKING NEW VIEWER");
    this.mainUI = new MainUI(this, this.socket);

    this.mainUI.playerNamerUI.open();
    this.mainUI.gameUI.open();
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
            console.log("UPDATING FACTION " + packet.size);
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
            console.log("ADDING FACTION");
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
            break;
    }
};

Client.prototype.drawScene = function (data) {
    var id;
    var selfPlayer = this.CONTROLLER_LIST[this.SELFID];
    if (!selfPlayer) {
        return;
    }

    this.mainCtx.clearRect(0, 0, 11000, 11000);
    this.draftCtx.clearRect(0, 0, 11000, 11000);
    this.mMapCtx.clearRect(0, 0, 500, 500);

    var entityList = [this.TILE_LIST, this.CONTROLLER_LIST,
        this.SHARD_LIST, this.LASER_LIST, this.HOME_LIST,
        this.FACTION_LIST, this.ANIMATION_LIST];

    var inBounds = function (player, x, y) {
        var range = this.mainCanvas.width / (1.2 * this.scaleFactor);
        return x < (player.x + range) && x > (player.x - 5 / 4 * range)
            && y < (player.y + range) && y > (player.y - 5 / 4 * range);
    }.bind(this);

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

    var drawConnectors = function () {
        for (var id in this.HOME_LIST) {
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

    drawConnectors();
    translateScene();
    this.mainCtx.drawImage(this.draftCanvas, 0, 0);
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

        var preX = selfPlayer.x + (this.preX - canvas.width / 2) / scaleFactor;
        var preY = selfPlayer.y + (this.preY - canvas.height / 2) / scaleFactor;

        var postX = selfPlayer.x + (this.postX - canvas.width / 2) / scaleFactor;
        var postY = selfPlayer.y + (this.postY - canvas.height / 2) / scaleFactor;

        ctx.fillRect(preX, preY, postX - preX, postY - preY);

        ctx.arc(postX, postY, 3, 0, 2 * Math.PI, true);
        ctx.stroke();
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
    var selfPlayer = this.client.CONTROLLER_LIST[this.client.SELFID];
    var ctx = this.client.draftCtx;

    ctx.fillStyle = "rgba(100,211,211,0.6)";
    ctx.fillRect(this.x, this.y, this.length, this.length);
    ctx.font = "20px Arial";

    ctx.fillText("Press Z to Place Sentinel", selfPlayer.x, selfPlayer.y + 100);
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
    var selfId = this.client.SELFID;
    if (this.stealth && this.id !== selfId && this.owner !== selfId) {
        return;
    }
    this.client.draftCtx.font = "20px Arial";
    this.client.draftCtx.strokeStyle = "#ff9d60";

    this.client.draftCtx.fillStyle = "rgba(123,0,0," + this.health / (4 * this.maxHealth) + ")";
    this.client.draftCtx.lineWidth = 10;
    this.client.draftCtx.beginPath();

    //draw player object
    if (this.type === "Player") {
        var radius = 30;
        this.client.draftCtx.moveTo(this.x + radius, this.y);
        for (i = Math.PI / 4; i <= 2 * Math.PI - Math.PI / 4; i += Math.PI / 4) {
            theta = i + getRandom(-(this.maxHealth / this.health) / 7, (this.maxHealth / this.health) / 7);
            x = radius * Math.cos(theta);
            y = radius * Math.sin(theta);
            this.client.draftCtx.lineTo(this.x + x, this.y + y);
        }
        this.client.draftCtx.lineTo(this.x + radius, this.y + 3);
        this.client.draftCtx.stroke();
        this.client.draftCtx.fill();
    }
    else { //bot
        var x, y, theta, startX, startY;
        var smallRadius = 12;
        var bigRadius = this.radius;

        theta = this.theta;
        startX = bigRadius * Math.cos(theta);
        startY = bigRadius * Math.sin(theta);
        this.client.draftCtx.moveTo(this.x + startX, this.y + startY);
        for (i = 1; i <= 2; i++) {
            theta = this.theta + 2 * Math.PI / 3 * i +
                getRandom(-this.maxHealth / this.health / 7, this.maxHealth / this.health / 7);
            x = smallRadius * Math.cos(theta);
            y = smallRadius * Math.sin(theta);
            this.client.draftCtx.lineTo(this.x + x, this.y + y);
        }
        this.client.draftCtx.lineTo(this.x + startX, this.y + startY);
        this.client.draftCtx.fill();
    }

    this.client.draftCtx.fillStyle = "#ff9d60";
    this.client.draftCtx.fillText(this.name, this.x, this.y + 70);
    if (this.selected && this.owner === this.client.SELFID) {
        this.client.draftCtx.lineWidth = 5;
        this.client.draftCtx.strokeStyle = "#1d55af";
        this.client.draftCtx.stroke();
    }
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
    ctx.font = this.size * 30 + "px Arial";
    ctx.textAlign = "center";
    ctx.fillText(this.name, this.x, this.y);
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
        ctx.arc(this.x, this.y, 20, 0, 2 * Math.PI, false);
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

    ctx.lineWidth = 15;
    ctx.strokeStyle = "#1e2a2b";

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



    this.playerNamerUI = new PlayerNamerUI(this.client, this.socket);
    this.gameUI = new GameUI(this.client, this.socket);
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
};


MainUI.prototype.updateLeaderBoard = function () {
    var leaderboard = document.getElementById("leaderboard");
    var FACTION_ARRAY = this.client.FACTION_ARRAY;


    var factionSort = function (a, b) {
        console.log(a,b);
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
},{"./PlayerNamerUI":15,"./ShardNamerUI":16,"./game/GameUI":17,"./home/HomeUI":20}],15:[function(require,module,exports){
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

},{"./ShardNamerUI":16}],17:[function(require,module,exports){
function GameUI() {

}

GameUI.prototype.open = function () {
    var shardNamerPrompt = document.getElementById('shard_namer_prompt');
    shardNamerPrompt.addEventListener("click", function () {
        openShardNamerUI();
    });
};

module.exports =  GameUI;
},{}],18:[function(require,module,exports){
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


},{"./ListUI":21}],19:[function(require,module,exports){
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


},{"./ListUI":21}],20:[function(require,module,exports){
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

},{"./BotsPage":18,"./BuildPage":19,"./UpgradesPage":22}],21:[function(require,module,exports){
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
    for (var j = 0; j < home.shards.length; j++) {
        var entry = document.createElement('li');
        var shard = this.client.SHARD_LIST[home.shards[j]];

        var checkSelection = function () {
            this.parent.checkSelection(Object.size(SELECTED_SHARDS));
        }.bind(this);


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
                    delete SELECTED_SHARDS[entry.id];
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
},{}],22:[function(require,module,exports){
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

    console.log("RESETTING BUTTON");
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
},{"./ListUI":21}]},{},[13])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY2xpZW50L2pzL0NsaWVudC5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L0FuaW1hdGlvbi5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L0Fycm93LmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvQnJhY2tldC5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L0NvbnRyb2xsZXIuanMiLCJzcmMvY2xpZW50L2pzL2VudGl0eS9GYWN0aW9uLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvSG9tZS5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L0xhc2VyLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvTWluaU1hcC5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L1NoYXJkLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvVGlsZS5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L2luZGV4LmpzIiwic3JjL2NsaWVudC9qcy9pbmRleC5qcyIsInNyYy9jbGllbnQvanMvdWkvTWFpblVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9QbGF5ZXJOYW1lclVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9TaGFyZE5hbWVyVUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL2dhbWUvR2FtZVVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9ob21lL0JvdHNQYWdlLmpzIiwic3JjL2NsaWVudC9qcy91aS9ob21lL0J1aWxkUGFnZS5qcyIsInNyYy9jbGllbnQvanMvdWkvaG9tZS9Ib21lVUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL2hvbWUvTGlzdFVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9ob21lL1VwZ3JhZGVzUGFnZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIEVudGl0eSA9IHJlcXVpcmUoJy4vZW50aXR5Jyk7XHJcbnZhciBNYWluVUkgPSByZXF1aXJlKCcuL3VpL01haW5VSScpO1xyXG5cclxuZnVuY3Rpb24gQ2xpZW50KCkge1xyXG4gICAgdGhpcy5TRUxGSUQgPSBudWxsO1xyXG4gICAgdGhpcy5BUlJPVyA9IG51bGw7XHJcbiAgICB0aGlzLkJSQUNLRVQgPSBudWxsO1xyXG4gICAgdGhpcy5yaWdodENsaWNrID0gZmFsc2U7XHJcbiAgICB0aGlzLmluaXQoKTtcclxufVxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5pbml0U29ja2V0KCk7XHJcbiAgICB0aGlzLmluaXRDYW52YXNlcygpO1xyXG4gICAgdGhpcy5pbml0TGlzdHMoKTtcclxuICAgIHRoaXMuaW5pdFZpZXdlcnMoKTtcclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdENhbnZhc2VzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5tYWluQ2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtYWluX2NhbnZhc1wiKTtcclxuICAgIHRoaXMuZHJhZnRDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpO1xyXG4gICAgdGhpcy5tTWFwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTtcclxuICAgIHRoaXMubU1hcFJvdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7XHJcblxyXG4gICAgdGhpcy5tYWluQ2FudmFzLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG4gICAgdGhpcy5kcmFmdENhbnZhcy5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcbiAgICB0aGlzLm1NYXAuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG4gICAgdGhpcy5tTWFwUm90LnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuXHJcbiAgICB0aGlzLmRyYWZ0Q2FudmFzLmhlaWdodCA9IHRoaXMubWFpbkNhbnZhcy5oZWlnaHQ7XHJcbiAgICB0aGlzLmRyYWZ0Q2FudmFzLndpZHRoID0gdGhpcy5tYWluQ2FudmFzLndpZHRoO1xyXG4gICAgdGhpcy5tTWFwLmhlaWdodCA9IDUwMDtcclxuICAgIHRoaXMubU1hcC53aWR0aCA9IDUwMDtcclxuICAgIHRoaXMubU1hcFJvdC5oZWlnaHQgPSA1MDA7XHJcbiAgICB0aGlzLm1NYXBSb3Qud2lkdGggPSA1MDA7XHJcblxyXG4gICAgdGhpcy5tYWluQ3R4ID0gdGhpcy5tYWluQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuICAgIHRoaXMuZHJhZnRDdHggPSB0aGlzLmRyYWZ0Q2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuICAgIHRoaXMubU1hcEN0eCA9IHRoaXMubU1hcC5nZXRDb250ZXh0KFwiMmRcIik7XHJcbiAgICB0aGlzLm1NYXBDdHhSb3QgPSB0aGlzLm1NYXBSb3QuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG5cclxuICAgIHRoaXMubWFpbkNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGlmIChldmVudC5idXR0b24gPT09IDIpIHtcclxuICAgICAgICAgICAgdGhpcy5yaWdodENsaWNrID0gdHJ1ZTtcclxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuQ09OVFJPTExFUl9MSVNUW3RoaXMuU0VMRklEXSkge1xyXG4gICAgICAgICAgICB0aGlzLkFSUk9XID0gbmV3IEVudGl0eS5BcnJvdyhldmVudC54IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldFdpZHRoICogMTAwMCxcclxuICAgICAgICAgICAgICAgIGV2ZW50LnkgLyB0aGlzLm1haW5DYW52YXMub2Zmc2V0SGVpZ2h0ICogNTAwLCB0aGlzKTtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMubWFpbkNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBpZiAoIXRoaXMucmlnaHRDbGljaykge1xyXG4gICAgICAgICAgICB0aGlzLkFSUk9XLnBvc3RYID0gZXZlbnQueCAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRXaWR0aCAqIDEwMDA7XHJcbiAgICAgICAgICAgIHRoaXMuQVJST1cucG9zdFkgPSBldmVudC55IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldEhlaWdodCAqIDUwMDtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJzZWxlY3RCb3RzXCIsIHtcclxuICAgICAgICAgICAgICAgIG1pblg6ICh0aGlzLkFSUk9XLnByZVggLSB0aGlzLmRyYWZ0Q2FudmFzLndpZHRoIC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yLFxyXG4gICAgICAgICAgICAgICAgbWluWTogKHRoaXMuQVJST1cucHJlWSAtIHRoaXMuZHJhZnRDYW52YXMuaGVpZ2h0IC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yLFxyXG4gICAgICAgICAgICAgICAgbWF4WDogKHRoaXMuQVJST1cucG9zdFggLSB0aGlzLmRyYWZ0Q2FudmFzLndpZHRoIC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yLFxyXG4gICAgICAgICAgICAgICAgbWF4WTogKHRoaXMuQVJST1cucG9zdFkgLSB0aGlzLmRyYWZ0Q2FudmFzLmhlaWdodCAvIDIpIC8gdGhpcy5zY2FsZUZhY3RvclxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHZhciB4ID0gZXZlbnQueCAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRXaWR0aCAqIDEwMDA7XHJcbiAgICAgICAgICAgIHZhciB5ID0gZXZlbnQueSAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRIZWlnaHQgKiA1MDA7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNvY2tldC5lbWl0KFwiYm90Q29tbWFuZFwiLCB7XHJcbiAgICAgICAgICAgICAgICB4OiAoeCAtIHRoaXMuZHJhZnRDYW52YXMud2lkdGggLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3IsXHJcbiAgICAgICAgICAgICAgICB5OiAoeSAtIHRoaXMuZHJhZnRDYW52YXMuaGVpZ2h0IC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5yaWdodENsaWNrID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5BUlJPVyA9IG51bGw7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMubWFpbkNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGlmICh0aGlzLkFSUk9XKSB7XHJcbiAgICAgICAgICAgIHRoaXMuQVJST1cucG9zdFggPSBldmVudC54IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldFdpZHRoICogMTAwMDtcclxuICAgICAgICAgICAgdGhpcy5BUlJPVy5wb3N0WSA9IGV2ZW50LnkgLyB0aGlzLm1haW5DYW52YXMub2Zmc2V0SGVpZ2h0ICogNTAwO1xyXG4gICAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKSk7XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLmluaXRMaXN0cyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuRkFDVElPTl9MSVNUID0ge307XHJcbiAgICB0aGlzLkZBQ1RJT05fQVJSQVkgPSBbXTtcclxuXHJcbiAgICB0aGlzLkNPTlRST0xMRVJfTElTVCA9IHt9O1xyXG4gICAgdGhpcy5USUxFX0xJU1QgPSB7fTtcclxuICAgIHRoaXMuU0hBUkRfTElTVCA9IHt9O1xyXG4gICAgdGhpcy5MQVNFUl9MSVNUID0ge307XHJcbiAgICB0aGlzLkhPTUVfTElTVCA9IHt9O1xyXG4gICAgdGhpcy5BTklNQVRJT05fTElTVCA9IHt9O1xyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5pbml0U29ja2V0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5zb2NrZXQgPSBpbygpO1xyXG4gICAgdGhpcy5zb2NrZXQudmVyaWZpZWQgPSBmYWxzZTtcclxuXHJcbiAgICB0aGlzLnNvY2tldC5vbignYWRkRmFjdGlvbnNVSScsIHRoaXMuYWRkRmFjdGlvbnN0b1VJLmJpbmQodGhpcykpO1xyXG4gICAgdGhpcy5zb2NrZXQub24oJ3VwZGF0ZUVudGl0aWVzJywgdGhpcy5oYW5kbGVQYWNrZXQuYmluZCh0aGlzKSk7XHJcbiAgICB0aGlzLnNvY2tldC5vbignZHJhd1NjZW5lJywgdGhpcy5kcmF3U2NlbmUuYmluZCh0aGlzKSk7XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLmluaXRWaWV3ZXJzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5rZXlzID0gW107XHJcbiAgICB0aGlzLnNjYWxlRmFjdG9yID0gMTtcclxuICAgIHRoaXMubWFpblNjYWxlRmFjdG9yID0gMTtcclxuICAgIGNvbnNvbGUubG9nKFwiTUFLSU5HIE5FVyBWSUVXRVJcIik7XHJcbiAgICB0aGlzLm1haW5VSSA9IG5ldyBNYWluVUkodGhpcywgdGhpcy5zb2NrZXQpO1xyXG5cclxuICAgIHRoaXMubWFpblVJLnBsYXllck5hbWVyVUkub3BlbigpO1xyXG4gICAgdGhpcy5tYWluVUkuZ2FtZVVJLm9wZW4oKTtcclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUuYWRkRmFjdGlvbnN0b1VJID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgIGlmICghdGhpcy5zb2NrZXQudmVyaWZpZWQpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlZFUklGSUVEXCIpO1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJ2ZXJpZnlcIiwge30pO1xyXG4gICAgICAgIHRoaXMuc29ja2V0LnZlcmlmaWVkID0gdHJ1ZTtcclxuICAgIH1cclxuICAgIHZhciBmYWN0aW9ucyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmYWN0aW9ucycpO1xyXG4gICAgdmFyIHBhY2tldCA9IGRhdGEuZmFjdGlvbnM7XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYWNrZXQubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgbmFtZSA9IHBhY2tldFtpXTtcclxuICAgICAgICB2YXIgb3B0aW9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnb3B0aW9uJyk7XHJcbiAgICAgICAgb3B0aW9uLnZhbHVlID0gbmFtZTtcclxuICAgICAgICBmYWN0aW9ucy5hcHBlbmRDaGlsZChvcHRpb24pO1xyXG4gICAgfVxyXG59OyAvL2NoYW5nZSBtZXRob2QgbmFtZSBhbmQgbG9jYXRpb25cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaGFuZGxlUGFja2V0ID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgIHZhciBwYWNrZXQsIGk7XHJcbiAgICBmb3IgKGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHBhY2tldCA9IGRhdGFbaV07XHJcbiAgICAgICAgc3dpdGNoIChwYWNrZXQubWFzdGVyKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJhZGRcIjpcclxuICAgICAgICAgICAgICAgIHRoaXMuYWRkRW50aXRpZXMocGFja2V0KTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwiZGVsZXRlXCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRlbGV0ZUVudGl0aWVzKHBhY2tldCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcInVwZGF0ZVwiOlxyXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVFbnRpdGllcyhwYWNrZXQpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS51cGRhdGVFbnRpdGllcyA9IGZ1bmN0aW9uIChwYWNrZXQpIHtcclxuICAgIGZ1bmN0aW9uIHVwZGF0ZUVudGl0eShwYWNrZXQsIGxpc3QpIHtcclxuICAgICAgICBpZiAoIXBhY2tldCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBlbnRpdHkgPSBsaXN0W3BhY2tldC5pZF07XHJcbiAgICAgICAgaWYgKCFlbnRpdHkpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbnRpdHkudXBkYXRlKHBhY2tldCk7XHJcbiAgICB9XHJcblxyXG4gICAgc3dpdGNoIChwYWNrZXQuY2xhc3MpIHtcclxuICAgICAgICBjYXNlIFwiY29udHJvbGxlckluZm9cIjpcclxuICAgICAgICAgICAgdXBkYXRlRW50aXR5KHBhY2tldCwgdGhpcy5DT05UUk9MTEVSX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwidGlsZUluZm9cIjpcclxuICAgICAgICAgICAgdXBkYXRlRW50aXR5KHBhY2tldCwgdGhpcy5USUxFX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwic2hhcmRJbmZvXCI6XHJcbiAgICAgICAgICAgIHVwZGF0ZUVudGl0eShwYWNrZXQsIHRoaXMuU0hBUkRfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJob21lSW5mb1wiOlxyXG4gICAgICAgICAgICB1cGRhdGVFbnRpdHkocGFja2V0LCB0aGlzLkhPTUVfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJmYWN0aW9uSW5mb1wiOlxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlVQREFUSU5HIEZBQ1RJT04gXCIgKyBwYWNrZXQuc2l6ZSk7XHJcbiAgICAgICAgICAgIHVwZGF0ZUVudGl0eShwYWNrZXQsIHRoaXMuRkFDVElPTl9MSVNUKTtcclxuICAgICAgICAgICAgdGhpcy5tYWluVUkudXBkYXRlTGVhZGVyQm9hcmQoKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcIlVJSW5mb1wiOlxyXG4gICAgICAgICAgICBpZiAodGhpcy5TRUxGSUQgPT09IHBhY2tldC5wbGF5ZXJJZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tYWluVUkudXBkYXRlKHBhY2tldCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLmRlbGV0ZUVudGl0aWVzID0gZnVuY3Rpb24gKHBhY2tldCkge1xyXG4gICAgdmFyIGRlbGV0ZUVudGl0eSA9IGZ1bmN0aW9uIChwYWNrZXQsIGxpc3QsIGFycmF5KSB7XHJcbiAgICAgICAgaWYgKCFwYWNrZXQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoYXJyYXkpIHtcclxuICAgICAgICAgICAgdmFyIGluZGV4ID0gYXJyYXkuaW5kZXhPZihwYWNrZXQuaWQpO1xyXG4gICAgICAgICAgICBhcnJheS5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBkZWxldGUgbGlzdFtwYWNrZXQuaWRdO1xyXG4gICAgfTtcclxuXHJcbiAgICBzd2l0Y2ggKHBhY2tldC5jbGFzcykge1xyXG4gICAgICAgIGNhc2UgXCJ0aWxlSW5mb1wiOlxyXG4gICAgICAgICAgICBkZWxldGVFbnRpdHkocGFja2V0LCB0aGlzLlRJTEVfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJjb250cm9sbGVySW5mb1wiOlxyXG4gICAgICAgICAgICBkZWxldGVFbnRpdHkocGFja2V0LCB0aGlzLkNPTlRST0xMRVJfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJzaGFyZEluZm9cIjpcclxuICAgICAgICAgICAgZGVsZXRlRW50aXR5KHBhY2tldCwgdGhpcy5TSEFSRF9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImhvbWVJbmZvXCI6XHJcbiAgICAgICAgICAgIGRlbGV0ZUVudGl0eShwYWNrZXQsIHRoaXMuSE9NRV9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImZhY3Rpb25JbmZvXCI6XHJcbiAgICAgICAgICAgIGRlbGV0ZUVudGl0eShwYWNrZXQsIHRoaXMuRkFDVElPTl9MSVNULCB0aGlzLkZBQ1RJT05fQVJSQVkpO1xyXG4gICAgICAgICAgICB0aGlzLm1haW5VSS51cGRhdGVMZWFkZXJCb2FyZCgpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiYW5pbWF0aW9uSW5mb1wiOlxyXG4gICAgICAgICAgICBkZWxldGVFbnRpdHkocGFja2V0LCB0aGlzLkFOSU1BVElPTl9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImxhc2VySW5mb1wiOlxyXG4gICAgICAgICAgICBkZWxldGVFbnRpdHkocGFja2V0LCB0aGlzLkxBU0VSX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiYnJhY2tldEluZm9cIjpcclxuICAgICAgICAgICAgaWYgKHRoaXMuU0VMRklEID09PSBwYWNrZXQuaWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuQlJBQ0tFVCA9IG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcIlVJSW5mb1wiOlxyXG4gICAgICAgICAgICBpZiAodGhpcy5TRUxGSUQgPT09IHBhY2tldC5pZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tYWluVUkuY2xvc2UocGFja2V0LmFjdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLmFkZEVudGl0aWVzID0gZnVuY3Rpb24gKHBhY2tldCkge1xyXG4gICAgdmFyIGFkZEVudGl0eSA9IGZ1bmN0aW9uIChwYWNrZXQsIGxpc3QsIGVudGl0eSwgYXJyYXkpIHtcclxuICAgICAgICBpZiAoIXBhY2tldCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxpc3RbcGFja2V0LmlkXSA9IG5ldyBlbnRpdHkocGFja2V0LCB0aGlzKTtcclxuICAgICAgICBpZiAoYXJyYXkgJiYgYXJyYXkuaW5kZXhPZihwYWNrZXQuaWQpID09PSAtMSkge1xyXG4gICAgICAgICAgICBhcnJheS5wdXNoKHBhY2tldC5pZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG5cclxuICAgIHN3aXRjaCAocGFja2V0LmNsYXNzKSB7XHJcbiAgICAgICAgY2FzZSBcInRpbGVJbmZvXCI6XHJcbiAgICAgICAgICAgIGFkZEVudGl0eShwYWNrZXQsIHRoaXMuVElMRV9MSVNULCBFbnRpdHkuVGlsZSk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJjb250cm9sbGVySW5mb1wiOlxyXG4gICAgICAgICAgICBhZGRFbnRpdHkocGFja2V0LCB0aGlzLkNPTlRST0xMRVJfTElTVCwgRW50aXR5LkNvbnRyb2xsZXIpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwic2hhcmRJbmZvXCI6XHJcbiAgICAgICAgICAgIGFkZEVudGl0eShwYWNrZXQsIHRoaXMuU0hBUkRfTElTVCwgRW50aXR5LlNoYXJkKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImxhc2VySW5mb1wiOlxyXG4gICAgICAgICAgICBhZGRFbnRpdHkocGFja2V0LCB0aGlzLkxBU0VSX0xJU1QsIEVudGl0eS5MYXNlcik7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJob21lSW5mb1wiOlxyXG4gICAgICAgICAgICBhZGRFbnRpdHkocGFja2V0LCB0aGlzLkhPTUVfTElTVCwgRW50aXR5LkhvbWUpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiZmFjdGlvbkluZm9cIjpcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJBRERJTkcgRkFDVElPTlwiKTtcclxuICAgICAgICAgICAgYWRkRW50aXR5KHBhY2tldCwgdGhpcy5GQUNUSU9OX0xJU1QsIEVudGl0eS5GYWN0aW9uLCB0aGlzLkZBQ1RJT05fQVJSQVkpO1xyXG4gICAgICAgICAgICB0aGlzLm1haW5VSS51cGRhdGVMZWFkZXJCb2FyZCgpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiYW5pbWF0aW9uSW5mb1wiOlxyXG4gICAgICAgICAgICBhZGRFbnRpdHkocGFja2V0LCB0aGlzLkFOSU1BVElPTl9MSVNULCBFbnRpdHkuQW5pbWF0aW9uKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImJyYWNrZXRJbmZvXCI6XHJcbiAgICAgICAgICAgIGlmICh0aGlzLlNFTEZJRCA9PT0gcGFja2V0LnBsYXllcklkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLkJSQUNLRVQgPSBuZXcgRW50aXR5LkJyYWNrZXQocGFja2V0LCB0aGlzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiVUlJbmZvXCI6XHJcbiAgICAgICAgICAgIGlmICh0aGlzLlNFTEZJRCA9PT0gcGFja2V0LnBsYXllcklkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1haW5VSS5vcGVuKHBhY2tldCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcInNlbGZJZFwiOlxyXG4gICAgICAgICAgICB0aGlzLlNFTEZJRCA9IHBhY2tldC5zZWxmSWQ7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5kcmF3U2NlbmUgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgdmFyIGlkO1xyXG4gICAgdmFyIHNlbGZQbGF5ZXIgPSB0aGlzLkNPTlRST0xMRVJfTElTVFt0aGlzLlNFTEZJRF07XHJcbiAgICBpZiAoIXNlbGZQbGF5ZXIpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5tYWluQ3R4LmNsZWFyUmVjdCgwLCAwLCAxMTAwMCwgMTEwMDApO1xyXG4gICAgdGhpcy5kcmFmdEN0eC5jbGVhclJlY3QoMCwgMCwgMTEwMDAsIDExMDAwKTtcclxuICAgIHRoaXMubU1hcEN0eC5jbGVhclJlY3QoMCwgMCwgNTAwLCA1MDApO1xyXG5cclxuICAgIHZhciBlbnRpdHlMaXN0ID0gW3RoaXMuVElMRV9MSVNULCB0aGlzLkNPTlRST0xMRVJfTElTVCxcclxuICAgICAgICB0aGlzLlNIQVJEX0xJU1QsIHRoaXMuTEFTRVJfTElTVCwgdGhpcy5IT01FX0xJU1QsXHJcbiAgICAgICAgdGhpcy5GQUNUSU9OX0xJU1QsIHRoaXMuQU5JTUFUSU9OX0xJU1RdO1xyXG5cclxuICAgIHZhciBpbkJvdW5kcyA9IGZ1bmN0aW9uIChwbGF5ZXIsIHgsIHkpIHtcclxuICAgICAgICB2YXIgcmFuZ2UgPSB0aGlzLm1haW5DYW52YXMud2lkdGggLyAoMS4yICogdGhpcy5zY2FsZUZhY3Rvcik7XHJcbiAgICAgICAgcmV0dXJuIHggPCAocGxheWVyLnggKyByYW5nZSkgJiYgeCA+IChwbGF5ZXIueCAtIDUgLyA0ICogcmFuZ2UpXHJcbiAgICAgICAgICAgICYmIHkgPCAocGxheWVyLnkgKyByYW5nZSkgJiYgeSA+IChwbGF5ZXIueSAtIDUgLyA0ICogcmFuZ2UpO1xyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZW50aXR5TGlzdC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciBsaXN0ID0gZW50aXR5TGlzdFtpXTtcclxuICAgICAgICBmb3IgKGlkIGluIGxpc3QpIHtcclxuICAgICAgICAgICAgdmFyIGVudGl0eSA9IGxpc3RbaWRdO1xyXG4gICAgICAgICAgICBpZiAoaW5Cb3VuZHMoc2VsZlBsYXllciwgZW50aXR5LngsIGVudGl0eS55KSkge1xyXG4gICAgICAgICAgICAgICAgZW50aXR5LnNob3coKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgaWYgKHRoaXMuQlJBQ0tFVCkge1xyXG4gICAgICAgIHRoaXMuQlJBQ0tFVC5zaG93KCk7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5BUlJPVykge1xyXG4gICAgICAgIHRoaXMuQVJST1cuc2hvdygpO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBkcmF3Q29ubmVjdG9ycyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBmb3IgKHZhciBpZCBpbiB0aGlzLkhPTUVfTElTVCkge1xyXG4gICAgICAgICAgICB2YXIgaG9tZSA9IHRoaXMuSE9NRV9MSVNUW2lkXTtcclxuICAgICAgICAgICAgaWYgKGhvbWUubmVpZ2hib3JzKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGhvbWUubmVpZ2hib3JzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5laWdoYm9yID0gdGhpcy5IT01FX0xJU1RbaG9tZS5uZWlnaGJvcnNbaV1dO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZHJhZnRDdHgubW92ZVRvKGhvbWUueCwgaG9tZS55KTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRyYWZ0Q3R4LnN0cm9rZVN0eWxlID0gXCIjOTEyMzgxXCI7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZHJhZnRDdHgubGluZVdpZHRoID0gMTA7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kcmFmdEN0eC5saW5lVG8obmVpZ2hib3IueCwgbmVpZ2hib3IueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kcmFmdEN0eC5zdHJva2UoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKTtcclxuXHJcblxyXG4gICAgdmFyIHRyYW5zbGF0ZVNjZW5lID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuZHJhZnRDdHguc2V0VHJhbnNmb3JtKDEsIDAsIDAsIDEsIDAsIDApO1xyXG4gICAgICAgIHRoaXMuc2NhbGVGYWN0b3IgPSBsZXJwKHRoaXMuc2NhbGVGYWN0b3IsIHRoaXMubWFpblNjYWxlRmFjdG9yLCAwLjMpO1xyXG5cclxuICAgICAgICB0aGlzLmRyYWZ0Q3R4LnRyYW5zbGF0ZSh0aGlzLm1haW5DYW52YXMud2lkdGggLyAyLCB0aGlzLm1haW5DYW52YXMuaGVpZ2h0IC8gMik7XHJcbiAgICAgICAgdGhpcy5kcmFmdEN0eC5zY2FsZSh0aGlzLnNjYWxlRmFjdG9yLCB0aGlzLnNjYWxlRmFjdG9yKTtcclxuICAgICAgICB0aGlzLmRyYWZ0Q3R4LnRyYW5zbGF0ZSgtc2VsZlBsYXllci54LCAtc2VsZlBsYXllci55KTtcclxuICAgIH0uYmluZCh0aGlzKTtcclxuXHJcbiAgICBkcmF3Q29ubmVjdG9ycygpO1xyXG4gICAgdHJhbnNsYXRlU2NlbmUoKTtcclxuICAgIHRoaXMubWFpbkN0eC5kcmF3SW1hZ2UodGhpcy5kcmFmdENhbnZhcywgMCwgMCk7XHJcbn07XHJcblxyXG5cclxuXHJcbmZ1bmN0aW9uIGxlcnAoYSwgYiwgcmF0aW8pIHtcclxuICAgIHJldHVybiBhICsgcmF0aW8gKiAoYiAtIGEpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmaW5kV2l0aEF0dHIoYXJyYXksIGF0dHIsIHZhbHVlKSB7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSArPSAxKSB7XHJcbiAgICAgICAgaWYgKGFycmF5W2ldW2F0dHJdID09PSB2YWx1ZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gaTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gLTE7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFJhbmRvbShtaW4sIG1heCkge1xyXG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pbjtcclxufVxyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ2xpZW50OyIsImZ1bmN0aW9uIEFuaW1hdGlvbihhbmltYXRpb25JbmZvLCBjbGllbnQpIHtcclxuICAgIHRoaXMudHlwZSA9IGFuaW1hdGlvbkluZm8udHlwZTtcclxuICAgIHRoaXMuaWQgPSBhbmltYXRpb25JbmZvLmlkO1xyXG4gICAgdGhpcy5uYW1lID0gYW5pbWF0aW9uSW5mby5uYW1lO1xyXG4gICAgdGhpcy54ID0gYW5pbWF0aW9uSW5mby54O1xyXG4gICAgdGhpcy55ID0gYW5pbWF0aW9uSW5mby55O1xyXG4gICAgdGhpcy50aGV0YSA9IDE1O1xyXG4gICAgdGhpcy50aW1lciA9IGdldFJhbmRvbSgxMCwgMTQpO1xyXG5cclxuICAgIGlmICh0aGlzLngpIHtcclxuICAgICAgICB0aGlzLmVuZFggPSB0aGlzLnggKyBnZXRSYW5kb20oLTEwMCwgMTAwKTtcclxuICAgICAgICB0aGlzLmVuZFkgPSB0aGlzLnkgKyBnZXRSYW5kb20oLTEwMCwgMTAwKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxufVxyXG5cclxuXHJcbkFuaW1hdGlvbi5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBob21lO1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50LmRyYWZ0Q3R4O1xyXG4gICAgaWYgKHRoaXMudHlwZSA9PT0gXCJhZGRTaGFyZFwiKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJEUkFXSU5HIEFERCBTSEFSRCBBTklNQVRJT05cIik7XHJcbiAgICAgICAgaG9tZSA9IHRoaXMuY2xpZW50LkhPTUVfTElTVFt0aGlzLmlkXTtcclxuICAgICAgICBpZiAoIWhvbWUpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDMgKiB0aGlzLnRpbWVyO1xyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiIzAxMkNDQ1wiO1xyXG4gICAgICAgIGN0eC5hcmMoaG9tZS54LCBob21lLnksIGhvbWUucmFkaXVzLCAwLCB0aGlzLnRpbWVyIC8gMS4yLCB0cnVlKTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLnR5cGUgPT09IFwicmVtb3ZlU2hhcmRcIikge1xyXG4gICAgICAgIGhvbWUgPSB0aGlzLmNsaWVudC5IT01FX0xJU1RbdGhpcy5pZF07XHJcbiAgICAgICAgaWYgKCFob21lKSB7XHJcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmNsaWVudC5BTklNQVRJT05fTElTVFtpZF07XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSAxNSAtIHRoaXMudGltZXI7XHJcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCJyZ2JhKDI1NSwgMCwgMCwgXCIgKyB0aGlzLnRpbWVyICogMTAgLyAxMDAgKyBcIilcIjtcclxuICAgICAgICBjdHguYXJjKGhvbWUueCwgaG9tZS55LCBob21lLnJhZGl1cywgMCwgMiAqIE1hdGguUEksIGZhbHNlKTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLnR5cGUgPT09IFwic2hhcmREZWF0aFwiKSB7XHJcbiAgICAgICAgY3R4LmZvbnQgPSA2MCAtIHRoaXMudGltZXIgKyBcInB4IEFyaWFsXCI7XHJcbiAgICAgICAgY3R4LnNhdmUoKTtcclxuICAgICAgICBjdHgudHJhbnNsYXRlKHRoaXMueCwgdGhpcy55KTtcclxuICAgICAgICBjdHgucm90YXRlKC1NYXRoLlBJIC8gNTAgKiB0aGlzLnRoZXRhKTtcclxuICAgICAgICBjdHgudGV4dEFsaWduID0gXCJjZW50ZXJcIjtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2JhKDI1NSwgMTY4LCA4NiwgXCIgKyB0aGlzLnRpbWVyICogMTAgLyAxMDAgKyBcIilcIjtcclxuICAgICAgICBjdHguZmlsbFRleHQodGhpcy5uYW1lLCAwLCAxNSk7XHJcbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcclxuXHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiIzAwMDAwMFwiO1xyXG4gICAgICAgIHRoaXMudGhldGEgPSBsZXJwKHRoaXMudGhldGEsIDAsIDAuMDgpO1xyXG4gICAgICAgIHRoaXMueCA9IGxlcnAodGhpcy54LCB0aGlzLmVuZFgsIDAuMSk7XHJcbiAgICAgICAgdGhpcy55ID0gbGVycCh0aGlzLnksIHRoaXMuZW5kWSwgMC4xKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnRpbWVyLS07XHJcbiAgICBpZiAodGhpcy50aW1lciA8PSAwKSB7XHJcbiAgICAgICAgZGVsZXRlIHRoaXMuY2xpZW50LkFOSU1BVElPTl9MSVNUW3RoaXMuaWRdO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbmZ1bmN0aW9uIGdldFJhbmRvbShtaW4sIG1heCkge1xyXG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pbjtcclxufVxyXG5cclxuZnVuY3Rpb24gbGVycChhLCBiLCByYXRpbykge1xyXG4gICAgcmV0dXJuIGEgKyByYXRpbyAqIChiIC0gYSk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQW5pbWF0aW9uOyIsImZ1bmN0aW9uIEFycm93KHgsIHksIGNsaWVudCkge1xyXG4gICAgdGhpcy5wcmVYID0geDtcclxuICAgIHRoaXMucHJlWSA9IHk7XHJcbiAgICB0aGlzLnBvc3RYID0geDtcclxuICAgIHRoaXMucG9zdFkgPSB5O1xyXG4gICAgdGhpcy5kZWx0YVggPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMucG9zdFggLSBtYWluQ2FudmFzLndpZHRoIC8gMjtcclxuICAgIH07XHJcbiAgICB0aGlzLmRlbHRhWSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5wb3N0WSAtIG1haW5DYW52YXMuaGVpZ2h0IC8gMjtcclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbn1cclxuXHJcbkFycm93LnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGNhbnZhcyA9IHRoaXMuY2xpZW50LmRyYWZ0Q2FudmFzO1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50LmRyYWZ0Q3R4O1xyXG4gICAgdmFyIHNlbGZQbGF5ZXIgPSB0aGlzLmNsaWVudC5DT05UUk9MTEVSX0xJU1RbdGhpcy5jbGllbnQuU0VMRklEXTtcclxuICAgIHZhciBzY2FsZUZhY3RvciA9IHRoaXMuY2xpZW50LnNjYWxlRmFjdG9yO1xyXG5cclxuICAgIGlmICh0aGlzLnBvc3RYKSB7XHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiIzUyMTUyMlwiO1xyXG5cclxuICAgICAgICB2YXIgcHJlWCA9IHNlbGZQbGF5ZXIueCArICh0aGlzLnByZVggLSBjYW52YXMud2lkdGggLyAyKSAvIHNjYWxlRmFjdG9yO1xyXG4gICAgICAgIHZhciBwcmVZID0gc2VsZlBsYXllci55ICsgKHRoaXMucHJlWSAtIGNhbnZhcy5oZWlnaHQgLyAyKSAvIHNjYWxlRmFjdG9yO1xyXG5cclxuICAgICAgICB2YXIgcG9zdFggPSBzZWxmUGxheWVyLnggKyAodGhpcy5wb3N0WCAtIGNhbnZhcy53aWR0aCAvIDIpIC8gc2NhbGVGYWN0b3I7XHJcbiAgICAgICAgdmFyIHBvc3RZID0gc2VsZlBsYXllci55ICsgKHRoaXMucG9zdFkgLSBjYW52YXMuaGVpZ2h0IC8gMikgLyBzY2FsZUZhY3RvcjtcclxuXHJcbiAgICAgICAgY3R4LmZpbGxSZWN0KHByZVgsIHByZVksIHBvc3RYIC0gcHJlWCwgcG9zdFkgLSBwcmVZKTtcclxuXHJcbiAgICAgICAgY3R4LmFyYyhwb3N0WCwgcG9zdFksIDMsIDAsIDIgKiBNYXRoLlBJLCB0cnVlKTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICB9XHJcblxyXG59O1xyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQXJyb3c7IiwiZnVuY3Rpb24gQnJhY2tldChicmFja2V0SW5mbywgY2xpZW50KSB7XHJcbiAgICB2YXIgdGlsZSA9IGNsaWVudC5USUxFX0xJU1RbYnJhY2tldEluZm8udGlsZUlkXTtcclxuXHJcbiAgICB0aGlzLnggPSB0aWxlLng7XHJcbiAgICB0aGlzLnkgPSB0aWxlLnk7XHJcbiAgICB0aGlzLmxlbmd0aCA9IHRpbGUubGVuZ3RoO1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5CcmFja2V0LnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHNlbGZQbGF5ZXIgPSB0aGlzLmNsaWVudC5DT05UUk9MTEVSX0xJU1RbdGhpcy5jbGllbnQuU0VMRklEXTtcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5kcmFmdEN0eDtcclxuXHJcbiAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2JhKDEwMCwyMTEsMjExLDAuNilcIjtcclxuICAgIGN0eC5maWxsUmVjdCh0aGlzLngsIHRoaXMueSwgdGhpcy5sZW5ndGgsIHRoaXMubGVuZ3RoKTtcclxuICAgIGN0eC5mb250ID0gXCIyMHB4IEFyaWFsXCI7XHJcblxyXG4gICAgY3R4LmZpbGxUZXh0KFwiUHJlc3MgWiB0byBQbGFjZSBTZW50aW5lbFwiLCBzZWxmUGxheWVyLngsIHNlbGZQbGF5ZXIueSArIDEwMCk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEJyYWNrZXQ7IiwiZnVuY3Rpb24gQ29udHJvbGxlcihjb250cm9sbGVySW5mbywgY2xpZW50KSB7XHJcbiAgICB0aGlzLmlkID0gY29udHJvbGxlckluZm8uaWQ7XHJcbiAgICB0aGlzLm5hbWUgPSBjb250cm9sbGVySW5mby5uYW1lO1xyXG4gICAgdGhpcy54ID0gY29udHJvbGxlckluZm8ueDtcclxuICAgIHRoaXMueSA9IGNvbnRyb2xsZXJJbmZvLnk7XHJcbiAgICB0aGlzLmhlYWx0aCA9IGNvbnRyb2xsZXJJbmZvLmhlYWx0aDtcclxuICAgIHRoaXMubWF4SGVhbHRoID0gY29udHJvbGxlckluZm8ubWF4SGVhbHRoO1xyXG4gICAgdGhpcy5zZWxlY3RlZCA9IGNvbnRyb2xsZXJJbmZvLnNlbGVjdGVkO1xyXG4gICAgdGhpcy5vd25lciA9IGNvbnRyb2xsZXJJbmZvLm93bmVyO1xyXG4gICAgdGhpcy50aGV0YSA9IGNvbnRyb2xsZXJJbmZvLnRoZXRhO1xyXG4gICAgdGhpcy50eXBlID0gY29udHJvbGxlckluZm8udHlwZTtcclxuICAgIHRoaXMubGV2ZWwgPSBjb250cm9sbGVySW5mby5sZXZlbDtcclxuICAgIHRoaXMucmFkaXVzID0gY29udHJvbGxlckluZm8ucmFkaXVzO1xyXG4gICAgdGhpcy5zdGVhbHRoID0gY29udHJvbGxlckluZm8uc3RlYWx0aDtcclxuXHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxufVxyXG5cclxuQ29udHJvbGxlci5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKGNvbnRyb2xsZXJJbmZvKSB7XHJcbiAgICB0aGlzLnggPSBjb250cm9sbGVySW5mby54O1xyXG4gICAgdGhpcy55ID0gY29udHJvbGxlckluZm8ueTtcclxuICAgIHRoaXMuaGVhbHRoID0gY29udHJvbGxlckluZm8uaGVhbHRoO1xyXG4gICAgdGhpcy5tYXhIZWFsdGggPSBjb250cm9sbGVySW5mby5tYXhIZWFsdGg7XHJcbiAgICB0aGlzLnNlbGVjdGVkID0gY29udHJvbGxlckluZm8uc2VsZWN0ZWQ7XHJcbiAgICB0aGlzLnRoZXRhID0gY29udHJvbGxlckluZm8udGhldGE7XHJcbiAgICB0aGlzLmxldmVsID0gY29udHJvbGxlckluZm8ubGV2ZWw7XHJcbiAgICB0aGlzLnN0ZWFsdGggPSBjb250cm9sbGVySW5mby5zdGVhbHRoO1xyXG59O1xyXG5cclxuQ29udHJvbGxlci5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBzZWxmSWQgPSB0aGlzLmNsaWVudC5TRUxGSUQ7XHJcbiAgICBpZiAodGhpcy5zdGVhbHRoICYmIHRoaXMuaWQgIT09IHNlbGZJZCAmJiB0aGlzLm93bmVyICE9PSBzZWxmSWQpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5mb250ID0gXCIyMHB4IEFyaWFsXCI7XHJcbiAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5zdHJva2VTdHlsZSA9IFwiI2ZmOWQ2MFwiO1xyXG5cclxuICAgIHRoaXMuY2xpZW50LmRyYWZ0Q3R4LmZpbGxTdHlsZSA9IFwicmdiYSgxMjMsMCwwLFwiICsgdGhpcy5oZWFsdGggLyAoNCAqIHRoaXMubWF4SGVhbHRoKSArIFwiKVwiO1xyXG4gICAgdGhpcy5jbGllbnQuZHJhZnRDdHgubGluZVdpZHRoID0gMTA7XHJcbiAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5iZWdpblBhdGgoKTtcclxuXHJcbiAgICAvL2RyYXcgcGxheWVyIG9iamVjdFxyXG4gICAgaWYgKHRoaXMudHlwZSA9PT0gXCJQbGF5ZXJcIikge1xyXG4gICAgICAgIHZhciByYWRpdXMgPSAzMDtcclxuICAgICAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5tb3ZlVG8odGhpcy54ICsgcmFkaXVzLCB0aGlzLnkpO1xyXG4gICAgICAgIGZvciAoaSA9IE1hdGguUEkgLyA0OyBpIDw9IDIgKiBNYXRoLlBJIC0gTWF0aC5QSSAvIDQ7IGkgKz0gTWF0aC5QSSAvIDQpIHtcclxuICAgICAgICAgICAgdGhldGEgPSBpICsgZ2V0UmFuZG9tKC0odGhpcy5tYXhIZWFsdGggLyB0aGlzLmhlYWx0aCkgLyA3LCAodGhpcy5tYXhIZWFsdGggLyB0aGlzLmhlYWx0aCkgLyA3KTtcclxuICAgICAgICAgICAgeCA9IHJhZGl1cyAqIE1hdGguY29zKHRoZXRhKTtcclxuICAgICAgICAgICAgeSA9IHJhZGl1cyAqIE1hdGguc2luKHRoZXRhKTtcclxuICAgICAgICAgICAgdGhpcy5jbGllbnQuZHJhZnRDdHgubGluZVRvKHRoaXMueCArIHgsIHRoaXMueSArIHkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5saW5lVG8odGhpcy54ICsgcmFkaXVzLCB0aGlzLnkgKyAzKTtcclxuICAgICAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5zdHJva2UoKTtcclxuICAgICAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5maWxsKCk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHsgLy9ib3RcclxuICAgICAgICB2YXIgeCwgeSwgdGhldGEsIHN0YXJ0WCwgc3RhcnRZO1xyXG4gICAgICAgIHZhciBzbWFsbFJhZGl1cyA9IDEyO1xyXG4gICAgICAgIHZhciBiaWdSYWRpdXMgPSB0aGlzLnJhZGl1cztcclxuXHJcbiAgICAgICAgdGhldGEgPSB0aGlzLnRoZXRhO1xyXG4gICAgICAgIHN0YXJ0WCA9IGJpZ1JhZGl1cyAqIE1hdGguY29zKHRoZXRhKTtcclxuICAgICAgICBzdGFydFkgPSBiaWdSYWRpdXMgKiBNYXRoLnNpbih0aGV0YSk7XHJcbiAgICAgICAgdGhpcy5jbGllbnQuZHJhZnRDdHgubW92ZVRvKHRoaXMueCArIHN0YXJ0WCwgdGhpcy55ICsgc3RhcnRZKTtcclxuICAgICAgICBmb3IgKGkgPSAxOyBpIDw9IDI7IGkrKykge1xyXG4gICAgICAgICAgICB0aGV0YSA9IHRoaXMudGhldGEgKyAyICogTWF0aC5QSSAvIDMgKiBpICtcclxuICAgICAgICAgICAgICAgIGdldFJhbmRvbSgtdGhpcy5tYXhIZWFsdGggLyB0aGlzLmhlYWx0aCAvIDcsIHRoaXMubWF4SGVhbHRoIC8gdGhpcy5oZWFsdGggLyA3KTtcclxuICAgICAgICAgICAgeCA9IHNtYWxsUmFkaXVzICogTWF0aC5jb3ModGhldGEpO1xyXG4gICAgICAgICAgICB5ID0gc21hbGxSYWRpdXMgKiBNYXRoLnNpbih0aGV0YSk7XHJcbiAgICAgICAgICAgIHRoaXMuY2xpZW50LmRyYWZ0Q3R4LmxpbmVUbyh0aGlzLnggKyB4LCB0aGlzLnkgKyB5KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5jbGllbnQuZHJhZnRDdHgubGluZVRvKHRoaXMueCArIHN0YXJ0WCwgdGhpcy55ICsgc3RhcnRZKTtcclxuICAgICAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5maWxsKCk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5jbGllbnQuZHJhZnRDdHguZmlsbFN0eWxlID0gXCIjZmY5ZDYwXCI7XHJcbiAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5maWxsVGV4dCh0aGlzLm5hbWUsIHRoaXMueCwgdGhpcy55ICsgNzApO1xyXG4gICAgaWYgKHRoaXMuc2VsZWN0ZWQgJiYgdGhpcy5vd25lciA9PT0gdGhpcy5jbGllbnQuU0VMRklEKSB7XHJcbiAgICAgICAgdGhpcy5jbGllbnQuZHJhZnRDdHgubGluZVdpZHRoID0gNTtcclxuICAgICAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5zdHJva2VTdHlsZSA9IFwiIzFkNTVhZlwiO1xyXG4gICAgICAgIHRoaXMuY2xpZW50LmRyYWZ0Q3R4LnN0cm9rZSgpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbmZ1bmN0aW9uIGdldFJhbmRvbShtaW4sIG1heCkge1xyXG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pbjtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb250cm9sbGVyOyIsImZ1bmN0aW9uIEZhY3Rpb24oZmFjdGlvbkluZm8sIGNsaWVudCkge1xyXG4gICAgdGhpcy5pZCA9IGZhY3Rpb25JbmZvLmlkO1xyXG4gICAgdGhpcy5uYW1lID0gZmFjdGlvbkluZm8ubmFtZTtcclxuICAgIHRoaXMueCA9IGZhY3Rpb25JbmZvLng7XHJcbiAgICB0aGlzLnkgPSBmYWN0aW9uSW5mby55O1xyXG4gICAgdGhpcy5zaXplID0gZmFjdGlvbkluZm8uc2l6ZTtcclxuXHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxufVxyXG5cclxuRmFjdGlvbi5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKGZhY3Rpb25JbmZvKSB7XHJcbiAgICB0aGlzLnggPSBmYWN0aW9uSW5mby54O1xyXG4gICAgdGhpcy55ID0gZmFjdGlvbkluZm8ueTtcclxuICAgIHRoaXMuc2l6ZSA9IGZhY3Rpb25JbmZvLnNpemU7XHJcblxyXG59O1xyXG5cclxuRmFjdGlvbi5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5kcmFmdEN0eDtcclxuICAgIGN0eC5mb250ID0gdGhpcy5zaXplICogMzAgKyBcInB4IEFyaWFsXCI7XHJcbiAgICBjdHgudGV4dEFsaWduID0gXCJjZW50ZXJcIjtcclxuICAgIGN0eC5maWxsVGV4dCh0aGlzLm5hbWUsIHRoaXMueCwgdGhpcy55KTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRmFjdGlvbjsiLCJmdW5jdGlvbiBIb21lKGhvbWVJbmZvLCBjbGllbnQpIHtcclxuICAgIHRoaXMuaWQgPSBob21lSW5mby5pZDtcclxuICAgIHRoaXMueCA9IGhvbWVJbmZvLng7XHJcbiAgICB0aGlzLnkgPSBob21lSW5mby55O1xyXG4gICAgdGhpcy5uYW1lID0gaG9tZUluZm8ub3duZXI7XHJcbiAgICB0aGlzLnR5cGUgPSBob21lSW5mby50eXBlO1xyXG4gICAgdGhpcy5yYWRpdXMgPSBob21lSW5mby5yYWRpdXM7XHJcbiAgICB0aGlzLnNoYXJkcyA9IGhvbWVJbmZvLnNoYXJkcztcclxuICAgIHRoaXMucG93ZXIgPSBob21lSW5mby5wb3dlcjtcclxuICAgIHRoaXMubGV2ZWwgPSBob21lSW5mby5sZXZlbDtcclxuICAgIHRoaXMuaGFzQ29sb3IgPSBob21lSW5mby5oYXNDb2xvcjtcclxuICAgIHRoaXMuaGVhbHRoID0gaG9tZUluZm8uaGVhbHRoO1xyXG4gICAgdGhpcy5uZWlnaGJvcnMgPSBob21lSW5mby5uZWlnaGJvcnM7XHJcblxyXG4gICAgdGhpcy51bml0RG1nID0gaG9tZUluZm8udW5pdERtZztcclxuICAgIHRoaXMudW5pdFNwZWVkID0gaG9tZUluZm8udW5pdFNwZWVkO1xyXG4gICAgdGhpcy51bml0QXJtb3IgPSBob21lSW5mby51bml0QXJtb3I7XHJcbiAgICB0aGlzLnF1ZXVlID0gaG9tZUluZm8ucXVldWU7XHJcbiAgICB0aGlzLmJvdHMgPSBob21lSW5mby5ib3RzO1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5cclxuSG9tZS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKGhvbWVJbmZvKSB7XHJcbiAgICB0aGlzLnNoYXJkcyA9IGhvbWVJbmZvLnNoYXJkcztcclxuICAgIHRoaXMubGV2ZWwgPSBob21lSW5mby5sZXZlbDtcclxuICAgIHRoaXMucmFkaXVzID0gaG9tZUluZm8ucmFkaXVzO1xyXG4gICAgdGhpcy5wb3dlciA9IGhvbWVJbmZvLnBvd2VyO1xyXG4gICAgdGhpcy5oZWFsdGggPSBob21lSW5mby5oZWFsdGg7XHJcbiAgICB0aGlzLmhhc0NvbG9yID0gaG9tZUluZm8uaGFzQ29sb3I7XHJcbiAgICB0aGlzLm5laWdoYm9ycyA9IGhvbWVJbmZvLm5laWdoYm9ycztcclxuICAgIHRoaXMudW5pdERtZyA9IGhvbWVJbmZvLnVuaXREbWc7XHJcbiAgICB0aGlzLnVuaXRTcGVlZCA9IGhvbWVJbmZvLnVuaXRTcGVlZDtcclxuICAgIHRoaXMudW5pdEFybW9yID0gaG9tZUluZm8udW5pdEFybW9yO1xyXG4gICAgdGhpcy5xdWV1ZSA9IGhvbWVJbmZvLnF1ZXVlO1xyXG4gICAgdGhpcy5ib3RzID0gaG9tZUluZm8uYm90cztcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSG9tZTtcclxuXHJcblxyXG5Ib21lLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50LmRyYWZ0Q3R4O1xyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgaWYgKHRoaXMubmVpZ2hib3JzLmxlbmd0aCA+PSA0KSB7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiIzQxNjllMVwiO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCIjMzk2YTZkXCI7XHJcbiAgICB9XHJcblxyXG4gICAgY3R4LmFyYyh0aGlzLngsIHRoaXMueSwgdGhpcy5yYWRpdXMsIDAsIDIgKiBNYXRoLlBJLCBmYWxzZSk7XHJcbiAgICBjdHguZmlsbCgpO1xyXG5cclxuICAgIHZhciBzZWxmUGxheWVyID0gdGhpcy5jbGllbnQuQ09OVFJPTExFUl9MSVNUW3RoaXMuY2xpZW50LlNFTEZJRF07XHJcblxyXG4gICAgaWYgKGluQm91bmRzQ2xvc2Uoc2VsZlBsYXllciwgdGhpcy54LCB0aGlzLnkpKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuZmFjdGlvbilcclxuICAgICAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCJyZ2JhKDEyLCAyNTUsIDIxOCwgMC43KVwiO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSAxMDtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMub3duZXIgIT09IG51bGwpIHtcclxuICAgICAgICBjdHguZmlsbFRleHQodGhpcy5zaGFyZHMubGVuZ3RoLCB0aGlzLngsIHRoaXMueSArIDQwKTtcclxuICAgIH1cclxuICAgIGN0eC5jbG9zZVBhdGgoKTtcclxufTtcclxuXHJcblxyXG5mdW5jdGlvbiBpbkJvdW5kc0Nsb3NlKHBsYXllciwgeCwgeSkge1xyXG4gICAgdmFyIHJhbmdlID0gMTUwO1xyXG4gICAgcmV0dXJuIHggPCAocGxheWVyLnggKyByYW5nZSkgJiYgeCA+IChwbGF5ZXIueCAtIDUgLyA0ICogcmFuZ2UpXHJcbiAgICAgICAgJiYgeSA8IChwbGF5ZXIueSArIHJhbmdlKSAmJiB5ID4gKHBsYXllci55IC0gNSAvIDQgKiByYW5nZSk7XHJcbn1cclxuIiwiZnVuY3Rpb24gTGFzZXIobGFzZXJJbmZvLCBjbGllbnQpIHtcclxuICAgIHRoaXMuaWQgPSBsYXNlckluZm8uaWQ7XHJcbiAgICB0aGlzLm93bmVyID0gbGFzZXJJbmZvLm93bmVyO1xyXG4gICAgdGhpcy50YXJnZXQgPSBsYXNlckluZm8udGFyZ2V0O1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5MYXNlci5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5kcmFmdEN0eDtcclxuICAgIHZhciB0YXJnZXQgPSB0aGlzLmNsaWVudC5DT05UUk9MTEVSX0xJU1RbdGhpcy50YXJnZXRdO1xyXG4gICAgdmFyIG93bmVyID0gdGhpcy5jbGllbnQuQ09OVFJPTExFUl9MSVNUW3RoaXMub3duZXJdO1xyXG5cclxuICAgIGlmICh0YXJnZXQgJiYgb3duZXIpIHtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4Lm1vdmVUbyhvd25lci54LCBvd25lci55KTtcclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcIiM5MTIyMjJcIjtcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gMTA7XHJcbiAgICAgICAgY3R4LmxpbmVUbyh0YXJnZXQueCwgdGFyZ2V0LnkpO1xyXG4gICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTGFzZXI7IiwiZnVuY3Rpb24gTWluaU1hcCgpIHtcclxufVxyXG5cclxuTWluaU1hcC5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGlmIChtYXBUaW1lciA8PSAwIHx8IHNlcnZlck1hcCA9PT0gbnVsbCkge1xyXG4gICAgICAgIHZhciB0aWxlTGVuZ3RoID0gTWF0aC5zcXJ0KE9iamVjdC5zaXplKFRJTEVfTElTVCkpO1xyXG4gICAgICAgIGlmICh0aWxlTGVuZ3RoID09PSAwIHx8ICFzZWxmUGxheWVyKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGltZ0RhdGEgPSBtYWluQ3R4LmNyZWF0ZUltYWdlRGF0YSh0aWxlTGVuZ3RoLCB0aWxlTGVuZ3RoKTtcclxuICAgICAgICB2YXIgdGlsZTtcclxuICAgICAgICB2YXIgdGlsZVJHQjtcclxuICAgICAgICB2YXIgaSA9IDA7XHJcblxyXG5cclxuICAgICAgICBmb3IgKHZhciBpZCBpbiBUSUxFX0xJU1QpIHtcclxuICAgICAgICAgICAgdGlsZVJHQiA9IHt9O1xyXG4gICAgICAgICAgICB0aWxlID0gVElMRV9MSVNUW2lkXTtcclxuICAgICAgICAgICAgaWYgKHRpbGUuY29sb3IgJiYgdGlsZS5hbGVydCB8fCBpbkJvdW5kcyhzZWxmUGxheWVyLCB0aWxlLngsIHRpbGUueSkpIHtcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuciA9IHRpbGUuY29sb3IucjtcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuZyA9IHRpbGUuY29sb3IuZztcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuYiA9IHRpbGUuY29sb3IuYjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuciA9IDA7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLmcgPSAwO1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5iID0gMDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2ldID0gdGlsZVJHQi5yO1xyXG4gICAgICAgICAgICBpbWdEYXRhLmRhdGFbaSArIDFdID0gdGlsZVJHQi5nO1xyXG4gICAgICAgICAgICBpbWdEYXRhLmRhdGFbaSArIDJdID0gdGlsZVJHQi5iO1xyXG4gICAgICAgICAgICBpbWdEYXRhLmRhdGFbaSArIDNdID0gMjU1O1xyXG4gICAgICAgICAgICBpICs9IDQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnNvbGUubG9nKDQwMCAvIE9iamVjdC5zaXplKFRJTEVfTElTVCkpO1xyXG4gICAgICAgIGltZ0RhdGEgPSBzY2FsZUltYWdlRGF0YShpbWdEYXRhLCBNYXRoLmZsb29yKDQwMCAvIE9iamVjdC5zaXplKFRJTEVfTElTVCkpLCBtYWluQ3R4KTtcclxuXHJcbiAgICAgICAgbU1hcEN0eC5wdXRJbWFnZURhdGEoaW1nRGF0YSwgMCwgMCk7XHJcblxyXG4gICAgICAgIG1NYXBDdHhSb3Qucm90YXRlKDkwICogTWF0aC5QSSAvIDE4MCk7XHJcbiAgICAgICAgbU1hcEN0eFJvdC5zY2FsZSgxLCAtMSk7XHJcbiAgICAgICAgbU1hcEN0eFJvdC5kcmF3SW1hZ2UobU1hcCwgMCwgMCk7XHJcbiAgICAgICAgbU1hcEN0eFJvdC5zY2FsZSgxLCAtMSk7XHJcbiAgICAgICAgbU1hcEN0eFJvdC5yb3RhdGUoMjcwICogTWF0aC5QSSAvIDE4MCk7XHJcblxyXG4gICAgICAgIHNlcnZlck1hcCA9IG1NYXBSb3Q7XHJcbiAgICAgICAgbWFwVGltZXIgPSAyNTtcclxuICAgIH1cclxuXHJcbiAgICBlbHNlIHtcclxuICAgICAgICBtYXBUaW1lciAtPSAxO1xyXG4gICAgfVxyXG5cclxuICAgIG1haW5DdHguZHJhd0ltYWdlKHNlcnZlck1hcCwgODAwLCA0MDApO1xyXG59OyAvL2RlcHJlY2F0ZWRcclxuXHJcbk1pbmlNYXAucHJvdG90eXBlLnNjYWxlSW1hZ2VEYXRhID0gZnVuY3Rpb24gKGltYWdlRGF0YSwgc2NhbGUsIG1haW5DdHgpIHtcclxuICAgIHZhciBzY2FsZWQgPSBtYWluQ3R4LmNyZWF0ZUltYWdlRGF0YShpbWFnZURhdGEud2lkdGggKiBzY2FsZSwgaW1hZ2VEYXRhLmhlaWdodCAqIHNjYWxlKTtcclxuICAgIHZhciBzdWJMaW5lID0gbWFpbkN0eC5jcmVhdGVJbWFnZURhdGEoc2NhbGUsIDEpLmRhdGE7XHJcbiAgICBmb3IgKHZhciByb3cgPSAwOyByb3cgPCBpbWFnZURhdGEuaGVpZ2h0OyByb3crKykge1xyXG4gICAgICAgIGZvciAodmFyIGNvbCA9IDA7IGNvbCA8IGltYWdlRGF0YS53aWR0aDsgY29sKyspIHtcclxuICAgICAgICAgICAgdmFyIHNvdXJjZVBpeGVsID0gaW1hZ2VEYXRhLmRhdGEuc3ViYXJyYXkoXHJcbiAgICAgICAgICAgICAgICAocm93ICogaW1hZ2VEYXRhLndpZHRoICsgY29sKSAqIDQsXHJcbiAgICAgICAgICAgICAgICAocm93ICogaW1hZ2VEYXRhLndpZHRoICsgY29sKSAqIDQgKyA0XHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIGZvciAodmFyIHggPSAwOyB4IDwgc2NhbGU7IHgrKykgc3ViTGluZS5zZXQoc291cmNlUGl4ZWwsIHggKiA0KVxyXG4gICAgICAgICAgICBmb3IgKHZhciB5ID0gMDsgeSA8IHNjYWxlOyB5KyspIHtcclxuICAgICAgICAgICAgICAgIHZhciBkZXN0Um93ID0gcm93ICogc2NhbGUgKyB5O1xyXG4gICAgICAgICAgICAgICAgdmFyIGRlc3RDb2wgPSBjb2wgKiBzY2FsZTtcclxuICAgICAgICAgICAgICAgIHNjYWxlZC5kYXRhLnNldChzdWJMaW5lLCAoZGVzdFJvdyAqIHNjYWxlZC53aWR0aCArIGRlc3RDb2wpICogNClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gc2NhbGVkO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNaW5pTWFwOyIsImZ1bmN0aW9uIFNoYXJkKHRoaXNJbmZvLCBjbGllbnQpIHtcclxuICAgIHRoaXMuaWQgPSB0aGlzSW5mby5pZDtcclxuICAgIHRoaXMueCA9IHRoaXNJbmZvLng7XHJcbiAgICB0aGlzLnkgPSB0aGlzSW5mby55O1xyXG4gICAgdGhpcy5uYW1lID0gdGhpc0luZm8ubmFtZTtcclxuICAgIHRoaXMudmlzaWJsZSA9IHRoaXNJbmZvLnZpc2libGU7XHJcblxyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbn1cclxuXHJcblNoYXJkLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAodGhpc0luZm8pIHtcclxuICAgIHRoaXMueCA9IHRoaXNJbmZvLng7XHJcbiAgICB0aGlzLnkgPSB0aGlzSW5mby55O1xyXG4gICAgdGhpcy52aXNpYmxlID0gdGhpc0luZm8udmlzaWJsZTtcclxuICAgIHRoaXMubmFtZSA9IHRoaXNJbmZvLm5hbWU7XHJcbn07XHJcblxyXG5cclxuU2hhcmQucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgY3R4ID0gdGhpcy5jbGllbnQuZHJhZnRDdHg7XHJcbiAgICBjdHgubGluZVdpZHRoID0gMjtcclxuXHJcbiAgICBpZiAodGhpcy52aXNpYmxlKSB7XHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGlmICh0aGlzLm5hbWUgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgY3R4LmZvbnQgPSBcIjMwcHggQXJpYWxcIjtcclxuICAgICAgICAgICAgY3R4LmZpbGxUZXh0KHRoaXMubmFtZSwgdGhpcy54LCB0aGlzLnkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2JhKDEwMCwgMjU1LCAyMjcsIDAuMSlcIjtcclxuICAgICAgICBjdHguYXJjKHRoaXMueCwgdGhpcy55LCAyMCwgMCwgMiAqIE1hdGguUEksIGZhbHNlKTtcclxuICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuXHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcIiNkZmZmNDJcIjtcclxuXHJcbiAgICAgICAgdmFyIHJhZGl1cyA9IDEwLCBpO1xyXG4gICAgICAgIHZhciBzdGFydFRoZXRhID0gZ2V0UmFuZG9tKDAsIDAuMik7XHJcbiAgICAgICAgdmFyIHRoZXRhID0gMDtcclxuICAgICAgICB2YXIgc3RhcnRYID0gcmFkaXVzICogTWF0aC5jb3Moc3RhcnRUaGV0YSk7XHJcbiAgICAgICAgdmFyIHN0YXJ0WSA9IHJhZGl1cyAqIE1hdGguc2luKHN0YXJ0VGhldGEpO1xyXG4gICAgICAgIGN0eC5tb3ZlVG8odGhpcy54ICsgc3RhcnRYLCB0aGlzLnkgKyBzdGFydFkpO1xyXG4gICAgICAgIGZvciAoaSA9IE1hdGguUEkgLyAyOyBpIDw9IDIgKiBNYXRoLlBJIC0gTWF0aC5QSSAvIDI7IGkgKz0gTWF0aC5QSSAvIDIpIHtcclxuICAgICAgICAgICAgdGhldGEgPSBzdGFydFRoZXRhICsgaSArIGdldFJhbmRvbSgtMSAvIDI0LCAxIC8gMjQpO1xyXG4gICAgICAgICAgICB2YXIgeCA9IHJhZGl1cyAqIE1hdGguY29zKHRoZXRhKTtcclxuICAgICAgICAgICAgdmFyIHkgPSByYWRpdXMgKiBNYXRoLnNpbih0aGV0YSk7XHJcbiAgICAgICAgICAgIGN0eC5saW5lVG8odGhpcy54ICsgeCwgdGhpcy55ICsgeSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGN0eC5saW5lVG8odGhpcy54ICsgc3RhcnRYLCB0aGlzLnkgKyBzdGFydFkpO1xyXG4gICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5mdW5jdGlvbiBnZXRSYW5kb20obWluLCBtYXgpIHtcclxuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikgKyBtaW47XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU2hhcmQ7IiwiZnVuY3Rpb24gVGlsZSh0aGlzSW5mbywgY2xpZW50KSB7XHJcbiAgICB0aGlzLmlkID0gdGhpc0luZm8uaWQ7XHJcbiAgICB0aGlzLnggPSB0aGlzSW5mby54O1xyXG4gICAgdGhpcy55ID0gdGhpc0luZm8ueTtcclxuICAgIHRoaXMubGVuZ3RoID0gdGhpc0luZm8ubGVuZ3RoO1xyXG4gICAgdGhpcy5jb2xvciA9IHRoaXNJbmZvLmNvbG9yO1xyXG4gICAgdGhpcy5hbGVydCA9IHRoaXNJbmZvLmFsZXJ0O1xyXG4gICAgdGhpcy5yYW5kb20gPSBNYXRoLmZsb29yKGdldFJhbmRvbSgwLCAzKSk7XHJcblxyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbn1cclxuXHJcblRpbGUucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICh0aGlzSW5mbykge1xyXG4gICAgdGhpcy5jb2xvciA9IHRoaXNJbmZvLmNvbG9yO1xyXG4gICAgdGhpcy5hbGVydCA9IHRoaXNJbmZvLmFsZXJ0O1xyXG59O1xyXG5cclxuVGlsZS5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5kcmFmdEN0eDtcclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgIGN0eC5maWxsU3R5bGUgPSBcInJnYihcIiArXHJcbiAgICAgICAgdGhpcy5jb2xvci5yICsgXCIsXCIgK1xyXG4gICAgICAgIHRoaXMuY29sb3IuZyArIFwiLFwiICtcclxuICAgICAgICB0aGlzLmNvbG9yLmIgK1xyXG4gICAgICAgIFwiKVwiO1xyXG5cclxuICAgIGN0eC5saW5lV2lkdGggPSAxNTtcclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiIzFlMmEyYlwiO1xyXG5cclxuICAgIGN0eC5yZWN0KHRoaXMueCwgdGhpcy55LCB0aGlzLmxlbmd0aCwgdGhpcy5sZW5ndGgpO1xyXG4gICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgY3R4LmZpbGwoKTtcclxufTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFRpbGU7XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0UmFuZG9tKG1pbiwgbWF4KSB7XHJcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pICsgbWluO1xyXG59IiwibW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgICBBbmltYXRpb246IHJlcXVpcmUoJy4vQW5pbWF0aW9uJyksXHJcbiAgICBBcnJvdzogcmVxdWlyZSgnLi9BcnJvdycpLFxyXG4gICAgQnJhY2tldDogcmVxdWlyZSgnLi9CcmFja2V0JyksXHJcbiAgICBDb250cm9sbGVyOiByZXF1aXJlKCcuL0NvbnRyb2xsZXInKSxcclxuICAgIEZhY3Rpb246IHJlcXVpcmUoJy4vRmFjdGlvbicpLFxyXG4gICAgSG9tZTogcmVxdWlyZSgnLi9Ib21lJyksXHJcbiAgICBMYXNlcjogcmVxdWlyZSgnLi9MYXNlcicpLFxyXG4gICAgTWluaU1hcDogcmVxdWlyZSgnLi9NaW5pTWFwJyksXHJcbiAgICBTaGFyZDogcmVxdWlyZSgnLi9TaGFyZCcpLFxyXG4gICAgVGlsZTogcmVxdWlyZSgnLi9UaWxlJylcclxufTsiLCJ2YXIgQ2xpZW50ID0gcmVxdWlyZSgnLi9DbGllbnQuanMnKTtcclxudmFyIE1haW5VSSA9IHJlcXVpcmUoJy4vdWkvTWFpblVJJyk7XHJcblxyXG52YXIgY2xpZW50ID0gbmV3IENsaWVudCgpO1xyXG5cclxuXHJcbmRvY3VtZW50Lm9ua2V5ZG93biA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgY2xpZW50LmtleXNbZXZlbnQua2V5Q29kZV0gPSB0cnVlO1xyXG4gICAgY2xpZW50LnNvY2tldC5lbWl0KCdrZXlFdmVudCcsIHtpZDogZXZlbnQua2V5Q29kZSwgc3RhdGU6IHRydWV9KTtcclxufTtcclxuXHJcbmRvY3VtZW50Lm9ua2V5dXAgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGNsaWVudC5rZXlzW2V2ZW50LmtleUNvZGVdID0gZmFsc2U7XHJcbiAgICBjbGllbnQuc29ja2V0LmVtaXQoJ2tleUV2ZW50Jywge2lkOiBldmVudC5rZXlDb2RlLCBzdGF0ZTogZmFsc2V9KTtcclxufTtcclxuXHJcblxyXG4kKHdpbmRvdykuYmluZCgnbW91c2V3aGVlbCBET01Nb3VzZVNjcm9sbCcsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgaWYgKGV2ZW50LmN0cmxLZXkgPT09IHRydWUpIHtcclxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmKGV2ZW50Lm9yaWdpbmFsRXZlbnQud2hlZWxEZWx0YSAvMTIwID4gMCAmJiBjbGllbnQubWFpblNjYWxlRmFjdG9yIDwgMikge1xyXG4gICAgICAgIGNsaWVudC5tYWluU2NhbGVGYWN0b3IgKz0gMC4yO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoY2xpZW50Lm1haW5TY2FsZUZhY3RvciA+IDAuNykge1xyXG4gICAgICAgIGNsaWVudC5tYWluU2NhbGVGYWN0b3IgLT0gMC4yO1xyXG4gICAgfVxyXG59KTtcclxuXHJcbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NvbnRleHRtZW51JywgZnVuY3Rpb24gKGUpIHsgLy9wcmV2ZW50IHJpZ2h0LWNsaWNrIGNvbnRleHQgbWVudVxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG59LCBmYWxzZSk7IiwiZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLm92ZXJmbG93ID0gJ2hpZGRlbic7ICAvLyBmaXJlZm94LCBjaHJvbWVcclxuZG9jdW1lbnQuYm9keS5zY3JvbGwgPSBcIm5vXCI7XHJcbnZhciBQbGF5ZXJOYW1lclVJID0gcmVxdWlyZSgnLi9QbGF5ZXJOYW1lclVJJyk7XHJcbnZhciBTaGFyZE5hbWVyVUkgPSByZXF1aXJlKCcuL1NoYXJkTmFtZXJVSScpO1xyXG52YXIgR2FtZVVJID0gcmVxdWlyZSgnLi9nYW1lL0dhbWVVSScpO1xyXG52YXIgSG9tZVVJID0gcmVxdWlyZShcIi4vaG9tZS9Ib21lVUlcIik7XHJcblxyXG5mdW5jdGlvbiBNYWluVUkoY2xpZW50LCBzb2NrZXQpIHtcclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XHJcblxyXG5cclxuXHJcbiAgICB0aGlzLnBsYXllck5hbWVyVUkgPSBuZXcgUGxheWVyTmFtZXJVSSh0aGlzLmNsaWVudCwgdGhpcy5zb2NrZXQpO1xyXG4gICAgdGhpcy5nYW1lVUkgPSBuZXcgR2FtZVVJKHRoaXMuY2xpZW50LCB0aGlzLnNvY2tldCk7XHJcbiAgICB0aGlzLnNoYXJkTmFtZXJVSSA9IG5ldyBTaGFyZE5hbWVyVUkodGhpcy5jbGllbnQsIHRoaXMuc29ja2V0KTtcclxuICAgIHRoaXMuaG9tZVVJID0gbmV3IEhvbWVVSSh0aGlzLmNsaWVudCwgdGhpcy5zb2NrZXQpO1xyXG59XHJcblxyXG5NYWluVUkucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoaW5mbykge1xyXG4gICAgdmFyIGFjdGlvbiA9IGluZm8uYWN0aW9uO1xyXG4gICAgdmFyIGhvbWU7XHJcblxyXG4gICAgaWYgKGFjdGlvbiA9PT0gXCJuYW1lIHNoYXJkXCIpIHtcclxuICAgICAgICB0aGlzLnNoYXJkTmFtZXJVSS5vcGVuKCk7XHJcbiAgICB9XHJcbiAgICBpZiAoYWN0aW9uID09PSBcImhvbWUgaW5mb1wiKSB7XHJcbiAgICAgICAgaG9tZSA9IHRoaXMuY2xpZW50LkhPTUVfTElTVFtpbmZvLmhvbWVJZF07XHJcbiAgICAgICAgdGhpcy5ob21lVUkub3Blbihob21lKTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5NYWluVUkucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKGFjdGlvbikge1xyXG4gICAgaWYgKGFjdGlvbiA9PT0gXCJuYW1lIHNoYXJkXCIpIHtcclxuICAgICAgICB0aGlzLnNoYXJkTmFtZXJVSS5jbG9zZSgpO1xyXG4gICAgfVxyXG4gICAgaWYgKGFjdGlvbiA9PT0gXCJob21lIGluZm9cIikge1xyXG4gICAgICAgIHRoaXMuTElTVF9TQ1JPTEwgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLmhvbWVVSS5jbG9zZSgpO1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJyZW1vdmVWaWV3ZXJcIiwge30pO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbk1haW5VSS5wcm90b3R5cGUudXBkYXRlTGVhZGVyQm9hcmQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgbGVhZGVyYm9hcmQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImxlYWRlcmJvYXJkXCIpO1xyXG4gICAgdmFyIEZBQ1RJT05fQVJSQVkgPSB0aGlzLmNsaWVudC5GQUNUSU9OX0FSUkFZO1xyXG5cclxuXHJcbiAgICB2YXIgZmFjdGlvblNvcnQgPSBmdW5jdGlvbiAoYSwgYikge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGEsYik7XHJcbiAgICAgICAgdmFyIGZhY3Rpb25BID0gdGhpcy5jbGllbnQuRkFDVElPTl9MSVNUW2FdO1xyXG4gICAgICAgIHZhciBmYWN0aW9uQiA9IHRoaXMuY2xpZW50LkZBQ1RJT05fTElTVFtiXTtcclxuICAgICAgICByZXR1cm4gZmFjdGlvbkEuc2l6ZSAtIGZhY3Rpb25CLnNpemU7XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcblxyXG4gICAgRkFDVElPTl9BUlJBWS5zb3J0KGZhY3Rpb25Tb3J0KTtcclxuICAgIGxlYWRlcmJvYXJkLmlubmVySFRNTCA9IFwiXCI7XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IEZBQ1RJT05fQVJSQVkubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuICAgICAgICB2YXIgZmFjdGlvbiA9IHRoaXMuY2xpZW50LkZBQ1RJT05fTElTVFtGQUNUSU9OX0FSUkFZW2ldXTtcclxuXHJcbiAgICAgICAgdmFyIGVudHJ5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcclxuICAgICAgICBlbnRyeS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShmYWN0aW9uLm5hbWUgKyBcIiAtIFwiICsgZmFjdGlvbi5zaXplKSk7XHJcbiAgICAgICAgbGVhZGVyYm9hcmQuYXBwZW5kQ2hpbGQoZW50cnkpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcblxyXG5cclxuLyoqIERFUFJFQ0FURUQgTUVUSE9EUyAqKi9cclxuTWFpblVJLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoaW5mbykge1xyXG4gICAgdmFyIGFjdGlvbiA9IGluZm8uYWN0aW9uO1xyXG4gICAgaWYgKGFjdGlvbiA9PT0gXCJ1cGRhdGUgcXVldWVcIikge1xyXG4gICAgICAgIHRoaXMuaG9tZVVJLmJ1aWxkUGFnZS51cGRhdGUoKTtcclxuICAgICAgICB0aGlzLmhvbWVVSS5ib3RzUGFnZS51cGRhdGUoKTtcclxuICAgICAgICAvL3RoaXMuaG9tZVVJLnVwZ3JhZGVzUGFnZS51cGRhdGUoKTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNYWluVUk7IiwiZnVuY3Rpb24gUGxheWVyTmFtZXJVSSAoY2xpZW50LCBzb2NrZXQpIHtcclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XHJcblxyXG4gICAgdGhpcy5sZWFkZXJib2FyZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibGVhZGVyYm9hcmRfY29udGFpbmVyXCIpO1xyXG4gICAgdGhpcy5uYW1lQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJuYW1lU3VibWl0XCIpO1xyXG4gICAgdGhpcy5wbGF5ZXJOYW1lSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBsYXllck5hbWVJbnB1dFwiKTtcclxuICAgIHRoaXMuZmFjdGlvbk5hbWVJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZmFjdGlvbk5hbWVJbnB1dFwiKTtcclxuICAgIHRoaXMucGxheWVyTmFtZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBsYXllcl9uYW1lclwiKTtcclxufVxyXG5cclxuUGxheWVyTmFtZXJVSS5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICB0aGlzLnBsYXllck5hbWVJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwia2V5dXBcIiwgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMpIHtcclxuICAgICAgICAgICAgdGhpcy5mYWN0aW9uTmFtZUlucHV0LmZvY3VzKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICB0aGlzLmZhY3Rpb25OYW1lSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDEzKSB7XHJcbiAgICAgICAgICAgIHRoaXMubmFtZUJ0bi5jbGljaygpO1xyXG4gICAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG4gICAgdGhpcy5uYW1lQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5jbGllbnQubWFpbkNhbnZhcy5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgdGhpcy5sZWFkZXJib2FyZC5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQuZW1pdChcIm5ld1BsYXllclwiLFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiB0aGlzLnBsYXllck5hbWVJbnB1dC52YWx1ZSxcclxuICAgICAgICAgICAgICAgIGZhY3Rpb246IHRoaXMuZmFjdGlvbk5hbWVJbnB1dC52YWx1ZVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB0aGlzLnBsYXllck5hbWVyLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMucGxheWVyTmFtZXIuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgdGhpcy5wbGF5ZXJOYW1lSW5wdXQuZm9jdXMoKTtcclxuICAgIHRoaXMubGVhZGVyYm9hcmQuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFBsYXllck5hbWVyVUk7IiwidmFyIHVpID0gcmVxdWlyZSgnLi9TaGFyZE5hbWVyVUknKTtcclxuXHJcbmZ1bmN0aW9uIFNoYXJkTmFtZXJVSShjbGllbnQsIHNvY2tldCkge1xyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbiAgICB0aGlzLnNvY2tldCA9IHNvY2tldDtcclxuXHJcbiAgICB0aGlzLnNoYXJkTmFtZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2hhcmRfbmFtZXJfdWknKTtcclxuICAgIHRoaXMudGV4dElucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0ZXh0SW5wdXRcIik7XHJcbiAgICB0aGlzLm5hbWVTaGFyZEJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibmFtZVNoYXJkQnRuXCIpO1xyXG59XHJcblxyXG5TaGFyZE5hbWVyVUkucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgc2hhcmROYW1lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzaGFyZF9uYW1lcl91aScpO1xyXG4gICAgdmFyIHRleHRJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidGV4dElucHV0XCIpO1xyXG4gICAgdmFyIG5hbWVTaGFyZEJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibmFtZVNoYXJkQnRuXCIpO1xyXG5cclxuICAgIHNoYXJkTmFtZXIuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XHJcblxyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsIHRoaXMuZm9jdXNUZXh0SW5wdXQpO1xyXG5cclxuICAgIHRleHRJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwia2V5dXBcIiwgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMpIHtcclxuICAgICAgICAgICAgdmFyIHRleHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInRleHRJbnB1dFwiKS52YWx1ZTtcclxuICAgICAgICAgICAgaWYgKHRleHQgIT09IG51bGwgJiYgdGV4dCAhPT0gXCJcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zb2NrZXQuZW1pdCgndGV4dElucHV0JyxcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBzZWxmSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdvcmQ6IHRleHRcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdWkuY2xvc2VVSShcIm5hbWUgc2hhcmRcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn07XHJcblxyXG5TaGFyZE5hbWVyVUkucHJvdG90eXBlLmZvY3VzVGV4dElucHV0ID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDEzKSB7XHJcbiAgICAgICAgdGV4dElucHV0LmZvY3VzKCk7XHJcbiAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsIGZvY3VzVGV4dElucHV0KTtcclxuICAgIH1cclxufTtcclxuXHJcblNoYXJkTmFtZXJVSS5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnRleHRJbnB1dC52YWx1ZSA9IFwiXCI7XHJcbiAgICB0aGlzLnRlbXBsYXRlLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNoYXJkTmFtZXJVSTtcclxuIiwiZnVuY3Rpb24gR2FtZVVJKCkge1xyXG5cclxufVxyXG5cclxuR2FtZVVJLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHNoYXJkTmFtZXJQcm9tcHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2hhcmRfbmFtZXJfcHJvbXB0Jyk7XHJcbiAgICBzaGFyZE5hbWVyUHJvbXB0LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgb3BlblNoYXJkTmFtZXJVSSgpO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9ICBHYW1lVUk7IiwidmFyIExpc3RVSSA9IHJlcXVpcmUoJy4vTGlzdFVJJyk7XHJcblxyXG5mdW5jdGlvbiBCb3RzUGFnZShob21lVUkpIHtcclxuICAgIHRoaXMudGVtcGxhdGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImJvdHNfcGFnZVwiKTtcclxuICAgIHRoaXMuYm90c0xpc3RVSSA9IG5ldyBMaXN0VUkoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JvdHNfbGlzdCcpLCBob21lVUkpO1xyXG4gICAgdGhpcy5ob21lVUkgPSBob21lVUk7XHJcbn1cclxuXHJcbkJvdHNQYWdlLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy50ZW1wbGF0ZS5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xyXG4gICAgaWYgKHRoaXMuaG9tZVVJLmhvbWUudHlwZSA9PT0gXCJCYXJyYWNrc1wiKSB7XHJcbiAgICAgICAgdGhpcy5ib3RzTGlzdFVJLmFkZEJvdHMoKTtcclxuICAgIH1cclxufTtcclxuXHJcbkJvdHNQYWdlLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG59O1xyXG5cclxuQm90c1BhZ2UucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGlmICh0aGlzLmhvbWVVSS5ob21lLnR5cGUgPT09IFwiQmFycmFja3NcIikge1xyXG4gICAgICAgIHRoaXMuYm90c0xpc3RVSS5hZGRCb3RzKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEJvdHNQYWdlO1xyXG5cclxuIiwidmFyIExpc3RVSSA9IHJlcXVpcmUoJy4vTGlzdFVJJyk7XHJcblxyXG5cclxuZnVuY3Rpb24gQnVpbGRQYWdlKGhvbWVVSSkge1xyXG4gICAgdGhpcy50ZW1wbGF0ZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY3JlYXRlX3BhZ2VcIik7XHJcbiAgICB0aGlzLmNyZWF0ZUJvdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY3JlYXRlX2JvdF9jb250YWluZXJcIik7XHJcbiAgICB0aGlzLm1ha2VTb2xkaWVyQm90c0J0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYWtlX3NvbGRpZXJfYm90c19idG4nKTtcclxuICAgIHRoaXMubWFrZUJvb3N0ZXJCb3RzQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21ha2VfYm9vc3Rlcl9ib3RzX2J0bicpO1xyXG4gICAgdGhpcy5tYWtlU3RlYWx0aEJvdHNCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFrZV9zdGVhbHRoX2JvdHNfYnRuJyk7XHJcbiAgICB0aGlzLnNvY2tldCA9IGhvbWVVSS5zb2NrZXQ7XHJcblxyXG4gICAgdGhpcy5TRUxFQ1RFRF9TSEFSRFMgPSB7fTtcclxuICAgIHRoaXMuYnVpbGRRdWV1ZVVJID0gbmV3IExpc3RVSShkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnVpbGRfcXVldWUnKSwgaG9tZVVJKTtcclxuICAgIHRoaXMuc2hhcmRzVUkgPSBuZXcgTGlzdFVJKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdidWlsZF9zaGFyZHNfbGlzdCcpLCBob21lVUksIHRoaXMpO1xyXG4gICAgdGhpcy5ob21lVUkgPSBob21lVUk7XHJcbn1cclxuXHJcblxyXG5CdWlsZFBhZ2UucHJvdG90eXBlLmNoZWNrU2VsZWN0aW9uID0gZnVuY3Rpb24gKGlucHV0KSB7XHJcbiAgICB2YXIgbWFrZVNvbGRpZXJCb3RzQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21ha2Vfc29sZGllcl9ib3RzX2J0bicpO1xyXG4gICAgdmFyIG1ha2VCb29zdGVyQm90c0J0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYWtlX2Jvb3N0ZXJfYm90c19idG4nKTtcclxuICAgIHZhciBtYWtlU3RlYWx0aEJvdHNCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFrZV9zdGVhbHRoX2JvdHNfYnRuJyk7XHJcblxyXG4gICAgaWYgKGlucHV0ID4gMCkge1xyXG4gICAgICAgIG1ha2VTb2xkaWVyQm90c0J0bi5kaXNhYmxlZCA9IGZhbHNlO1xyXG4gICAgICAgIG1ha2VCb29zdGVyQm90c0J0bi5kaXNhYmxlZCA9IGZhbHNlO1xyXG4gICAgICAgIG1ha2VTdGVhbHRoQm90c0J0bi5kaXNhYmxlZCA9IGZhbHNlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBtYWtlU29sZGllckJvdHNCdG4uZGlzYWJsZWQgPSBcImRpc2FibGVkXCI7XHJcbiAgICAgICAgbWFrZUJvb3N0ZXJCb3RzQnRuLmRpc2FibGVkID0gXCJkaXNhYmxlZFwiO1xyXG4gICAgICAgIG1ha2VTdGVhbHRoQm90c0J0bi5kaXNhYmxlZCA9IFwiZGlzYWJsZWRcIjtcclxuICAgIH1cclxufTtcclxuXHJcbkJ1aWxkUGFnZS5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcclxuICAgIHRoaXMuU0VMRUNURURfU0hBUkRTID0ge307XHJcblxyXG4gICAgdmFyIG1ha2VTb2xkaWVyQm90cyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLnNvY2tldC5lbWl0KCdtYWtlQm90cycsIHtcclxuICAgICAgICAgICAgYm90VHlwZTogXCJzb2xkaWVyXCIsXHJcbiAgICAgICAgICAgIGhvbWU6IHRoaXMuaG9tZVVJLmhvbWUuaWQsXHJcbiAgICAgICAgICAgIHNoYXJkczogdGhpcy5TRUxFQ1RFRF9TSEFSRFNcclxuICAgICAgICB9KTtcclxuICAgIH0uYmluZCh0aGlzKTtcclxuICAgIHZhciBtYWtlQm9vc3RlckJvdHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQuZW1pdCgnbWFrZUJvdHMnLCB7XHJcbiAgICAgICAgICAgIGJvdFR5cGU6IFwiYm9vc3RlclwiLFxyXG4gICAgICAgICAgICBob21lOiB0aGlzLmhvbWVVSS5ob21lLmlkLFxyXG4gICAgICAgICAgICBzaGFyZHM6IHRoaXMuU0VMRUNURURfU0hBUkRTXHJcbiAgICAgICAgfSlcclxuICAgIH0uYmluZCh0aGlzKTtcclxuICAgIHZhciBtYWtlU3RlYWx0aEJvdHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQuZW1pdCgnbWFrZUJvdHMnLCB7XHJcbiAgICAgICAgICAgIGJvdFR5cGU6IFwic3RlYWx0aFwiLFxyXG4gICAgICAgICAgICBob21lOiB0aGlzLmhvbWVVSS5ob21lLmlkLFxyXG4gICAgICAgICAgICBzaGFyZHM6IHRoaXMuU0VMRUNURURfU0hBUkRTXHJcbiAgICAgICAgfSlcclxuICAgIH0uYmluZCh0aGlzKTtcclxuXHJcbiAgICBpZiAodGhpcy5ob21lVUkuaG9tZS50eXBlID09PSBcIkJhcnJhY2tzXCIpIHtcclxuICAgICAgICB0aGlzLm1ha2VTb2xkaWVyQm90c0J0biA9IHRoaXMuaG9tZVVJLnJlc2V0QnV0dG9uKHRoaXMubWFrZVNvbGRpZXJCb3RzQnRuLCBtYWtlU29sZGllckJvdHMpO1xyXG4gICAgICAgIHRoaXMubWFrZUJvb3N0ZXJCb3RzQnRuID0gdGhpcy5ob21lVUkucmVzZXRCdXR0b24odGhpcy5tYWtlQm9vc3RlckJvdHNCdG4sIG1ha2VCb29zdGVyQm90cyk7XHJcbiAgICAgICAgdGhpcy5tYWtlU3RlYWx0aEJvdHNCdG4gPSB0aGlzLmhvbWVVSS5yZXNldEJ1dHRvbih0aGlzLm1ha2VTdGVhbHRoQm90c0J0biwgbWFrZVN0ZWFsdGhCb3RzKTtcclxuXHJcbiAgICAgICAgdGhpcy5jcmVhdGVCb3Quc3R5bGUuZGlzcGxheSA9IFwiZmxleFwiO1xyXG4gICAgICAgIHRoaXMuYnVpbGRRdWV1ZVVJLmFkZFF1ZXVlKHRoaXMuaG9tZVVJLmhvbWUpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLmNyZWF0ZUJvdC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcbiAgICB9XHJcbiAgICB0aGlzLnNoYXJkc1VJLmFkZFNoYXJkcygpO1xyXG59O1xyXG5cclxuQnVpbGRQYWdlLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG59O1xyXG5cclxuXHJcbkJ1aWxkUGFnZS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5idWlsZFF1ZXVlVUkuYWRkUXVldWUoKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQnVpbGRQYWdlO1xyXG5cclxuIiwidmFyIFVwZ3JhZGVzUGFnZSA9IHJlcXVpcmUoJy4vVXBncmFkZXNQYWdlJyk7XHJcbnZhciBCb3RzUGFnZSA9IHJlcXVpcmUoJy4vQm90c1BhZ2UnKTtcclxudmFyIEJ1aWxkUGFnZSA9IHJlcXVpcmUoJy4vQnVpbGRQYWdlJyk7XHJcblxyXG5mdW5jdGlvbiBIb21lVUkoY2xpZW50LCBzb2NrZXQpIHtcclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XHJcbiAgICB0aGlzLnRlbXBsYXRlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2hvbWVfdWknKTtcclxuICAgIHRoaXMuaG9tZSA9IG51bGw7XHJcbn1cclxuXHJcbkhvbWVVSS5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uIChob21lKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xyXG4gICAgdGhpcy5ob21lID0gaG9tZTtcclxuXHJcbiAgICBpZiAoIXRoaXMudXBncmFkZXNQYWdlKSB7XHJcbiAgICAgICAgdGhpcy51cGdyYWRlc1BhZ2UgPSBuZXcgVXBncmFkZXNQYWdlKHRoaXMpO1xyXG4gICAgICAgIHRoaXMuYm90c1BhZ2UgPSBuZXcgQm90c1BhZ2UodGhpcyk7XHJcbiAgICAgICAgdGhpcy5idWlsZFBhZ2UgPSBuZXcgQnVpbGRQYWdlKHRoaXMpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZFRhYkxpc3RlbmVycygpO1xyXG4gICAgICAgIHRoaXMuYWRkQ2xvc2VMaXN0ZW5lcigpO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMub3BlbkhvbWVJbmZvKCk7XHJcbiAgICB0aGlzLnVwZ3JhZGVzUGFnZS5vcGVuKCk7XHJcbiAgICB0aGlzLmJ1aWxkUGFnZS5jbG9zZSgpO1xyXG4gICAgdGhpcy5ib3RzUGFnZS5jbG9zZSgpO1xyXG5cclxuICAgIC8vdGhpcy5vcGVuQ29sb3JQaWNrZXIoaG9tZSk7XHJcbn07XHJcblxyXG5Ib21lVUkucHJvdG90eXBlLm9wZW5Ib21lSW5mbyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdob21lX3R5cGUnKS5pbm5lckhUTUwgPSB0aGlzLmhvbWUudHlwZTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdob21lX2xldmVsJykuaW5uZXJIVE1MID0gdGhpcy5ob21lLmxldmVsO1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2hvbWVfaGVhbHRoJykuaW5uZXJIVE1MID0gdGhpcy5ob21lLmhlYWx0aDtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdob21lX3Bvd2VyJykuaW5uZXJIVE1MID0gdGhpcy5ob21lLnBvd2VyO1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2hvbWVfZmFjdGlvbl9uYW1lJykuaW5uZXJIVE1MID0gdGhpcy5ob21lLmZhY3Rpb247XHJcbn07XHJcblxyXG5Ib21lVUkucHJvdG90eXBlLm9wZW5Db2xvclBpY2tlciA9IGZ1bmN0aW9uIChob21lKSB7XHJcbiAgICB2YXIgY29sb3JQaWNrZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNvbG9yX3BpY2tlclwiKTtcclxuICAgIHZhciBjb2xvckNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY29sb3JfY2FudmFzXCIpO1xyXG4gICAgdmFyIGNvbG9yQ3R4ID0gY29sb3JDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG5cclxuICAgIGNvbG9yQ2FudmFzLndpZHRoID0gMTAwO1xyXG4gICAgY29sb3JDYW52YXMuaGVpZ2h0ID0gMTAwO1xyXG5cclxuICAgIGlmICghaG9tZS5oYXNDb2xvciAmJiBob21lLmxldmVsID4gMSkge1xyXG4gICAgICAgIGNvbG9yUGlja2VyLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBjb2xvclBpY2tlci5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdmFyIGNvbG9ycyA9IG5ldyBJbWFnZSgpO1xyXG4gICAgY29sb3JzLnNyYyA9ICdjb2xvcnMuanBnJztcclxuICAgIGNvbG9ycy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgY29sb3JDdHguZmlsbFN0eWxlID0gXCIjMzMzZWVlXCI7XHJcbiAgICAgICAgY29sb3JDdHguZmlsbFJlY3QoMCwgMCwgY29sb3JDYW52YXMud2lkdGggLyAyLCBjb2xvckNhbnZhcy5oZWlnaHQgLyAyKTtcclxuICAgICAgICBjb2xvckN0eC5maWxsU3R5bGUgPSBcIiM2MjNlZWVcIjtcclxuICAgICAgICBjb2xvckN0eC5maWxsUmVjdChjb2xvckNhbnZhcy53aWR0aCAvIDIsIGNvbG9yQ2FudmFzLmhlaWdodCAvIDIsIGNvbG9yQ2FudmFzLndpZHRoLCBjb2xvckNhbnZhcy5oZWlnaHQpO1xyXG4gICAgfTtcclxuXHJcbiAgICBjb2xvckNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgdmFyIHJlY3QgPSBjb2xvckNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICB2YXIgeCA9IGV2ZW50LmNsaWVudFggLSByZWN0LmxlZnQ7XHJcbiAgICAgICAgdmFyIHkgPSBldmVudC5jbGllbnRZIC0gcmVjdC50b3A7XHJcbiAgICAgICAgdmFyIGltZ19kYXRhID0gY29sb3JDdHguZ2V0SW1hZ2VEYXRhKHgsIHksIDEwMCwgMTAwKS5kYXRhO1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJuZXdDb2xvclwiLCB7XHJcbiAgICAgICAgICAgIGhvbWU6IGhvbWUuaWQsXHJcbiAgICAgICAgICAgIGNvbG9yOiB7XHJcbiAgICAgICAgICAgICAgICByOiBpbWdfZGF0YVswXSxcclxuICAgICAgICAgICAgICAgIGc6IGltZ19kYXRhWzFdLFxyXG4gICAgICAgICAgICAgICAgYjogaW1nX2RhdGFbMl1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxufTtcclxuXHJcbkhvbWVVSS5wcm90b3R5cGUuYWRkVGFiTGlzdGVuZXJzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHVwZ3JhZGVzVGFiID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3VwZ3JhZGVzX3RhYicpO1xyXG4gICAgdmFyIGNyZWF0ZVRhYiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjcmVhdGVfdGFiJyk7XHJcbiAgICB2YXIgYm90c1RhYiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdib3RzX3RhYicpO1xyXG5cclxuICAgIHVwZ3JhZGVzVGFiLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGV2dCkge1xyXG4gICAgICAgIHRoaXMudXBncmFkZXNQYWdlLm9wZW4oKTtcclxuICAgICAgICB0aGlzLmJ1aWxkUGFnZS5jbG9zZSgpO1xyXG4gICAgICAgIHRoaXMuYm90c1BhZ2UuY2xvc2UoKTtcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG4gICAgY3JlYXRlVGFiLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGV2dCkge1xyXG4gICAgICAgIHRoaXMudXBncmFkZXNQYWdlLmNsb3NlKCk7XHJcbiAgICAgICAgdGhpcy5idWlsZFBhZ2Uub3BlbigpO1xyXG4gICAgICAgIHRoaXMuYm90c1BhZ2UuY2xvc2UoKTtcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG4gICAgYm90c1RhYi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChldnQpIHtcclxuICAgICAgICB0aGlzLnVwZ3JhZGVzUGFnZS5jbG9zZSgpO1xyXG4gICAgICAgIHRoaXMuYnVpbGRQYWdlLmNsb3NlKCk7XHJcbiAgICAgICAgdGhpcy5ib3RzUGFnZS5vcGVuKCk7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG59O1xyXG5cclxuSG9tZVVJLnByb3RvdHlwZS5hZGRDbG9zZUxpc3RlbmVyID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGNsb3NlQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjbG9zZV9ob21lX3VpXCIpO1xyXG4gICAgY2xvc2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLmNsaWVudC5tYWluVUkuY2xvc2UoXCJob21lIGluZm9cIik7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG59O1xyXG5cclxuSG9tZVVJLnByb3RvdHlwZS5yZXNldEJ1dHRvbiA9IGZ1bmN0aW9uIChidXR0b24sIGNhbGxiYWNrKSB7XHJcbiAgICB2YXIgc2V0U2tpbGxNZXRlciA9IGZ1bmN0aW9uIChidXR0b24pIHtcclxuICAgICAgICB2YXIgZmluZENoaWxkQ2FudmFzID0gZnVuY3Rpb24gKHNraWxsRGl2KSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2tpbGxEaXYuY2hpbGROb2Rlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHNraWxsRGl2LmNoaWxkTm9kZXNbaV0ubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gXCJjYW52YXNcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBza2lsbERpdi5jaGlsZE5vZGVzW2ldO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgdmFyIGNhbnZhcyA9IGZpbmRDaGlsZENhbnZhcyhidXR0b24ucGFyZW50Tm9kZSk7XHJcbiAgICAgICAgY2FudmFzLndpZHRoID0gMjYwO1xyXG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSAxMDA7XHJcbiAgICAgICAgdmFyIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XHJcbiAgICAgICAgY3R4LmNsZWFyUmVjdCgwLCAwLCAxMDAwLCAyMDApO1xyXG4gICAgICAgIHZhciBtYWduaXR1ZGUgPSAwO1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcIiNGRkZGRkZcIjtcclxuICAgICAgICBzd2l0Y2ggKGJ1dHRvbi51cGdUeXBlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJob21lSGVhbHRoXCI6XHJcbiAgICAgICAgICAgICAgICBtYWduaXR1ZGUgPSB0aGlzLmhvbWUucG93ZXI7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcImRtZ1wiOlxyXG4gICAgICAgICAgICAgICAgbWFnbml0dWRlID0gdGhpcy5ob21lLnVuaXREbWc7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcImFybW9yXCI6XHJcbiAgICAgICAgICAgICAgICBtYWduaXR1ZGUgPSB0aGlzLmhvbWUudW5pdEFybW9yO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJzcGVlZFwiOlxyXG4gICAgICAgICAgICAgICAgbWFnbml0dWRlID0gdGhpcy5ob21lLnVuaXRTcGVlZDtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICB9XHJcbiAgICAgICAgY3R4LmZpbGxSZWN0KDAsIDAsIG1hZ25pdHVkZSAqIDEwLCAyMDApO1xyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG4gICAgdmFyIG5ld0J1dHRvbiA9IGJ1dHRvbi5jbG9uZU5vZGUodHJ1ZSk7XHJcbiAgICBuZXdCdXR0b24udXBnVHlwZSA9IGJ1dHRvbi51cGdUeXBlO1xyXG5cclxuICAgIGJ1dHRvbi5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdCdXR0b24sIGJ1dHRvbik7XHJcbiAgICBidXR0b24gPSBuZXdCdXR0b247XHJcbiAgICBidXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjYWxsYmFjayk7XHJcbiAgICBpZiAoYnV0dG9uLnVwZ1R5cGUpIHtcclxuICAgICAgICBzZXRTa2lsbE1ldGVyKGJ1dHRvbik7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gYnV0dG9uO1xyXG59O1xyXG5cclxuSG9tZVVJLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSG9tZVVJO1xyXG4iLCJmdW5jdGlvbiBMaXN0VUkobGlzdCwgaG9tZVVJLCBwYXJlbnQpIHtcclxuICAgIHRoaXMubGlzdCA9IGxpc3Q7XHJcbiAgICB0aGlzLmhvbWVVSSA9IGhvbWVVSTtcclxuICAgIHRoaXMuY2xpZW50ID0gaG9tZVVJLmNsaWVudDtcclxuICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xyXG5cclxuICAgIHRoaXMubGlzdC5hZGRFdmVudExpc3RlbmVyKCdzY3JvbGwnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICB0aGlzLmhvbWVVSS5MSVNUX1NDUk9MTCA9IHRydWU7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG59XHJcblxyXG5MaXN0VUkucHJvdG90eXBlLmFkZFF1ZXVlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGhvbWUgPSB0aGlzLmhvbWVVSS5ob21lO1xyXG4gICAgdGhpcy5saXN0LmlubmVySFRNTCA9IFwiXCI7XHJcbiAgICBpZiAoIWhvbWUucXVldWUpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGhvbWUucXVldWUubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgYnVpbGRJbmZvID0gaG9tZS5xdWV1ZVtpXTtcclxuICAgICAgICB2YXIgZW50cnkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xyXG4gICAgICAgIGVudHJ5LmlkID0gTWF0aC5yYW5kb20oKTtcclxuXHJcbiAgICAgICAgKGZ1bmN0aW9uIChfaWQpIHtcclxuICAgICAgICAgICAgZW50cnkuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5jbGlja2VkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGlja2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0eWxlLmJhY2tncm91bmQgPSBcIiNmZmZiMjJcIjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2xpY2tlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3R5bGUuYmFja2dyb3VuZCA9IFwiIzU0MmZjZVwiO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KShlbnRyeS5pZCk7XHJcblxyXG4gICAgICAgIGVudHJ5LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKFxyXG4gICAgICAgICAgICBidWlsZEluZm8uc2hhcmROYW1lICsgXCIgLS0gXCIgKyBNYXRoLmZsb29yKGJ1aWxkSW5mby50aW1lciAvIDEwMDApICtcclxuICAgICAgICAgICAgXCI6XCIgKyBNYXRoLmZsb29yKGJ1aWxkSW5mby50aW1lciAlIDEwMDApKSk7XHJcbiAgICAgICAgdGhpcy5saXN0LmFwcGVuZENoaWxkKGVudHJ5KTtcclxuICAgIH1cclxufTtcclxuXHJcbkxpc3RVSS5wcm90b3R5cGUuYWRkQm90cyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBob21lID0gdGhpcy5ob21lVUkuaG9tZTtcclxuICAgIHRoaXMubGlzdC5pbm5lckhUTUwgPSBcIlwiO1xyXG4gICAgaWYgKCFob21lLnF1ZXVlKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBob21lLmJvdHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgYm90SW5mbyA9IGhvbWUuYm90c1tpXTtcclxuICAgICAgICB2YXIgZW50cnkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xyXG4gICAgICAgIGVudHJ5LmlkID0gTWF0aC5yYW5kb20oKTtcclxuXHJcbiAgICAgICAgKGZ1bmN0aW9uIChfaWQpIHtcclxuICAgICAgICAgICAgZW50cnkuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5jbGlja2VkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGlja2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0eWxlLmJhY2tncm91bmQgPSBcIiNmZmZiMjJcIjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2xpY2tlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3R5bGUuYmFja2dyb3VuZCA9IFwiIzU0MmZjZVwiO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KShlbnRyeS5pZCk7XHJcblxyXG4gICAgICAgIGVudHJ5LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKFxyXG4gICAgICAgICAgICBib3RJbmZvLm5hbWUgKyBcIiAtLSBcIiArIFwiTGV2ZWw6XCIgKyBib3RJbmZvLmxldmVsKSk7XHJcbiAgICAgICAgdGhpcy5saXN0LmFwcGVuZENoaWxkKGVudHJ5KTtcclxuICAgIH1cclxufTtcclxuXHJcbkxpc3RVSS5wcm90b3R5cGUuYWRkU2hhcmRzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGhvbWUgPSB0aGlzLmhvbWVVSS5ob21lO1xyXG4gICAgdmFyIFNFTEVDVEVEX1NIQVJEUyA9IHRoaXMucGFyZW50LlNFTEVDVEVEX1NIQVJEUztcclxuICAgIHRoaXMubGlzdC5pbm5lckhUTUwgPSBcIlwiO1xyXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCBob21lLnNoYXJkcy5sZW5ndGg7IGorKykge1xyXG4gICAgICAgIHZhciBlbnRyeSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XHJcbiAgICAgICAgdmFyIHNoYXJkID0gdGhpcy5jbGllbnQuU0hBUkRfTElTVFtob21lLnNoYXJkc1tqXV07XHJcblxyXG4gICAgICAgIHZhciBjaGVja1NlbGVjdGlvbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdGhpcy5wYXJlbnQuY2hlY2tTZWxlY3Rpb24oT2JqZWN0LnNpemUoU0VMRUNURURfU0hBUkRTKSk7XHJcbiAgICAgICAgfS5iaW5kKHRoaXMpO1xyXG5cclxuXHJcbiAgICAgICAgZW50cnkuaWQgPSBzaGFyZC5pZDtcclxuXHJcbiAgICAgICAgKGZ1bmN0aW9uIChfaWQpIHtcclxuICAgICAgICAgICAgZW50cnkuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5jbGlja2VkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGlja2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0eWxlLmJhY2tncm91bmQgPSBcIiNmZmZiMjJcIjtcclxuICAgICAgICAgICAgICAgICAgICBTRUxFQ1RFRF9TSEFSRFNbX2lkXSA9IF9pZDtcclxuICAgICAgICAgICAgICAgICAgICBjaGVja1NlbGVjdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGlja2VkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdHlsZS5iYWNrZ3JvdW5kID0gXCIjNTQyZmNlXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIFNFTEVDVEVEX1NIQVJEU1tlbnRyeS5pZF07XHJcbiAgICAgICAgICAgICAgICAgICAgY2hlY2tTZWxlY3Rpb24oKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSkoZW50cnkuaWQpO1xyXG5cclxuICAgICAgICBlbnRyeS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzaGFyZC5uYW1lKSk7XHJcbiAgICAgICAgdGhpcy5saXN0LmFwcGVuZENoaWxkKGVudHJ5KTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IExpc3RVSTtcclxuXHJcbk9iamVjdC5zaXplID0gZnVuY3Rpb24ob2JqKSB7XHJcbiAgICB2YXIgc2l6ZSA9IDAsIGtleTtcclxuICAgIGZvciAoa2V5IGluIG9iaikge1xyXG4gICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5KSkgc2l6ZSsrO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHNpemU7XHJcbn07IiwidmFyIExpc3RVSSA9IHJlcXVpcmUoJy4vTGlzdFVJJyk7XHJcblxyXG5mdW5jdGlvbiBVcGdyYWRlc1BhZ2UoaG9tZVVJKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ1cGdyYWRlc19wYWdlXCIpO1xyXG4gICAgdGhpcy51bml0VXBncmFkZXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInVuaXRfdXBncmFkZXNcIik7XHJcbiAgICB0aGlzLmJsZEJhc2VIZWFsdGhCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmxkX2hvbWVfYnRuJyk7XHJcbiAgICB0aGlzLmJsZEFybW9yQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JsZF9hcm1vcicpO1xyXG4gICAgdGhpcy5ibGRTcGVlZEJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdibGRfc3BlZWQnKTtcclxuICAgIHRoaXMuYmxkRG1nQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JsZF9kYW1hZ2UnKTtcclxuXHJcbiAgICB0aGlzLlNFTEVDVEVEX1NIQVJEUyA9IHt9O1xyXG5cclxuICAgIHRoaXMuc2hhcmRzVUkgPSBuZXcgTGlzdFVJKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidXBncmFkZXNfc2hhcmRzX2xpc3RcIiksIGhvbWVVSSwgdGhpcyk7XHJcbiAgICB0aGlzLmhvbWVVSSA9IGhvbWVVSTtcclxuICAgIHRoaXMuc29ja2V0ID0gdGhpcy5ob21lVUkuc29ja2V0O1xyXG59XHJcblxyXG5VcGdyYWRlc1BhZ2UucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcbiAgICB0aGlzLmJsZEJhc2VIZWFsdGhCdG4udXBnVHlwZSA9IFwiaG9tZUhlYWx0aFwiO1xyXG4gICAgdGhpcy5ibGRBcm1vckJ0bi51cGdUeXBlID0gXCJhcm1vclwiO1xyXG4gICAgdGhpcy5ibGRTcGVlZEJ0bi51cGdUeXBlID0gXCJzcGVlZFwiO1xyXG4gICAgdGhpcy5ibGREbWdCdG4udXBnVHlwZSA9IFwiZG1nXCI7XHJcblxyXG4gICAgdGhpcy5zaGFyZHNVSS5hZGRTaGFyZHMoKTtcclxuXHJcbiAgICB2YXIgYmxkSG9tZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLnNvY2tldC5lbWl0KCdidWlsZEhvbWUnLCB7XHJcbiAgICAgICAgICAgIGhvbWU6IHRoaXMuaG9tZVVJLmhvbWUuaWQsXHJcbiAgICAgICAgICAgIHNoYXJkczogdGhpcy5TRUxFQ1RFRF9TSEFSRFNcclxuICAgICAgICB9KVxyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG4gICAgdmFyIHVwZ1VuaXQgPSBmdW5jdGlvbiAoKSB7IC8vVE9ETzogZml4IHVwZ3JhZGluZyB1bml0c1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoJ3VwZ3JhZGVVbml0Jywge1xyXG4gICAgICAgICAgICBob21lOiB0aGlzLmhvbWVVSS5ob21lLmlkLFxyXG4gICAgICAgICAgICB0eXBlOiB0aGlzLnVwZ1R5cGUsXHJcbiAgICAgICAgICAgIHNoYXJkczogdGhpcy5TRUxFQ1RFRF9TSEFSRFNcclxuICAgICAgICB9KTtcclxuICAgIH0uYmluZCh0aGlzKTtcclxuXHJcbiAgICBjb25zb2xlLmxvZyhcIlJFU0VUVElORyBCVVRUT05cIik7XHJcbiAgICB0aGlzLmJsZEJhc2VIZWFsdGhCdG4gPSB0aGlzLmhvbWVVSS5yZXNldEJ1dHRvbih0aGlzLmJsZEJhc2VIZWFsdGhCdG4sIGJsZEhvbWUpO1xyXG5cclxuICAgIGlmICh0aGlzLmhvbWVVSS5ob21lLnR5cGUgPT09IFwiQmFycmFja3NcIikge1xyXG4gICAgICAgIHRoaXMudW5pdFVwZ3JhZGVzLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcbiAgICAgICAgdGhpcy5ibGRBcm1vckJ0biA9IHRoaXMuaG9tZVVJLnJlc2V0QnV0dG9uKHRoaXMuYmxkQXJtb3JCdG4sIHVwZ1VuaXQpO1xyXG4gICAgICAgIHRoaXMuYmxkU3BlZWRCdG4gPSB0aGlzLmhvbWVVSS5yZXNldEJ1dHRvbih0aGlzLmJsZFNwZWVkQnRuLCB1cGdVbml0KTtcclxuICAgICAgICB0aGlzLmJsZERtZ0J0biA9IHRoaXMuaG9tZVVJLnJlc2V0QnV0dG9uKHRoaXMuYmxkRG1nQnRuLCB1cGdVbml0KTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIHRoaXMudW5pdFVwZ3JhZGVzLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5VcGdyYWRlc1BhZ2UucHJvdG90eXBlLmNoZWNrU2VsZWN0aW9uID0gZnVuY3Rpb24gKGlucHV0KSB7XHJcbiAgICB2YXIgYmxkQmFzZUhlYWx0aEJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdibGRfaG9tZV9idG4nKTtcclxuICAgIHZhciBibGRBcm1vckJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdibGRfYXJtb3InKTtcclxuICAgIHZhciBibGRTcGVlZEJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdibGRfc3BlZWQnKTtcclxuICAgIHZhciBibGREbWdCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmxkX2RhbWFnZScpO1xyXG5cclxuICAgIGlmIChpbnB1dCA+IDApIHtcclxuICAgICAgICBibGRCYXNlSGVhbHRoQnRuLmRpc2FibGVkID0gZmFsc2U7XHJcbiAgICAgICAgYmxkQXJtb3JCdG4uZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICBibGRTcGVlZEJ0bi5kaXNhYmxlZCA9IGZhbHNlO1xyXG4gICAgICAgIGJsZERtZ0J0bi5kaXNhYmxlZCA9IGZhbHNlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBibGRCYXNlSGVhbHRoQnRuLmRpc2FibGVkID0gXCJkaXNhYmxlZFwiO1xyXG4gICAgICAgIGJsZEFybW9yQnRuLmRpc2FibGVkID0gXCJkaXNhYmxlZFwiO1xyXG4gICAgICAgIGJsZFNwZWVkQnRuLmRpc2FibGVkID0gXCJkaXNhYmxlZFwiO1xyXG4gICAgICAgIGJsZERtZ0J0bi5kaXNhYmxlZCA9IFwiZGlzYWJsZWRcIjtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5VcGdyYWRlc1BhZ2UucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy50ZW1wbGF0ZS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcbn07XHJcblxyXG5VcGdyYWRlc1BhZ2UucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuc2hhcmRzVUkuYWRkU2hhcmRzKClcclxufTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFVwZ3JhZGVzUGFnZTsiXX0=
