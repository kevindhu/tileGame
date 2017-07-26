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
};

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
            //this.drawLeaderBoard();
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
        if (array && findWithAttr(array, "id", packet.id) === -1) {
            array.push(list[packet.id]);
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
            //this.drawLeaderBoard();
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

Client.prototype.updateFactionsList = function () {
    var factionSort = function (a, b) {
        return a.size - b.size;
    };

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
};

Controller.prototype.show = function () {
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
    } else { //bot
        var x, y, theta, startX, startY;
        var smallRadius = 12;
        var bigRadius = 20;

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


    //FACTION_ARRAY.sort(factionSort);
    //drawLeaderBoard(); //change this
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

    console.log(this.socket);


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
        home = this.client.HOME_LIST[info.homeId];
        addQueueInfo(buildQueue, home);
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


module.exports = BotsPage;


},{"./ListUI":21}],19:[function(require,module,exports){
var ListUI = require('./ListUI');


function BuildPage(homeUI) {
    this.template = document.getElementById("create_page");
    this.createBot = document.getElementById("create_bot_container");
    this.makeBotsBtn = document.getElementById('make_bots_btn');
    this.socket = homeUI.socket;

    this.SELECTED_SHARDS = {};

    this.buildQueueUI = new ListUI(document.getElementById('build_queue'), homeUI);
    this.shardsUI = new ListUI(document.getElementById('build_shards_list'), homeUI, this);
    this.homeUI = homeUI;
}


BuildPage.prototype.open = function () {
    this.template.style.display = "block";

    this.SELECTED_SHARDS = {};

    var makeBots = function () {
        this.socket.emit('makeBots', {
            home: this.home.id,
            shards: this.SELECTED_SHARDS
        });
    }.bind(this);

    if (this.homeUI.home.type === "Barracks") {
        this.homeUI.resetButton(this.makeBotsBtn, makeBots);
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

        console.log(this.botsPage);
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
    };
    var newButton = button.cloneNode(true);
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
    var checkSelection = function () {
        var bldBaseHealthBtn = document.getElementById('bld_home_btn');
        var makeBotsBtn = document.getElementById('make_bots_btn');
        var bldArmorBtn = document.getElementById('bld_armor');
        var bldSpeedBtn = document.getElementById('bld_speed');
        var bldDmgBtn = document.getElementById('bld_damage');

        if (Object.size(this.parent.SELECTED_SHARDS) > 0) {
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
    }.bind(this);
    checkSelection();
    this.list.innerHTML = "";
    for (var j = 0; j < home.shards.length; j++) {
        var entry = document.createElement('li');
        var shard = this.client.SHARD_LIST[home.shards[j]];
        entry.id = shard.id;

        entry.addEventListener("click", function () {
            if (!entry.clicked) {
                entry.clicked = true;
                entry.style.background = "#fffb22";
                this.parent.SELECTED_SHARDS[entry.id] = entry.id;
                checkSelection();
            }
            else {
                entry.clicked = false;
                entry.style.background = "#542fce";
                delete this.parent.SELECTED_SHARDS[entry.id];
                checkSelection();
            }
        }.bind(this));


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

    this.shardsUI = new ListUI(document.getElementById("upgrades_shards_list"),homeUI, this);
    this.homeUI = homeUI;

    this.shardsUI.addShards();
}

UpgradesPage.prototype.open = function () {
    this.template.style.display = "block";
    this.bldBaseHealthBtn.upgType = "homeHealth";
    this.bldArmorBtn.upgType = "armor";
    this.bldSpeedBtn.upgType = "speed";
    this.bldDmgBtn.upgType = "dmg";

    var bldHome = function () {
        this.socket.emit('buildHome', {
            home: this.homeUI.home.id,
            shards: this.SELECTED_SHARDS
        })
    }.bind(this);
    var upgUnit = function () {
        this.socket.emit('upgradeUnit', {
            home: this.homeUI.home.id,
            type: this.upgType,
            shards: SELECTED_SHARDS
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


UpgradesPage.prototype.close = function () {
    this.template.style.display = "none";
};


module.exports = UpgradesPage;
},{"./ListUI":21}]},{},[13])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY2xpZW50L2pzL0NsaWVudC5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L0FuaW1hdGlvbi5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L0Fycm93LmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvQnJhY2tldC5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L0NvbnRyb2xsZXIuanMiLCJzcmMvY2xpZW50L2pzL2VudGl0eS9GYWN0aW9uLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvSG9tZS5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L0xhc2VyLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvTWluaU1hcC5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L1NoYXJkLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvVGlsZS5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L2luZGV4LmpzIiwic3JjL2NsaWVudC9qcy9pbmRleC5qcyIsInNyYy9jbGllbnQvanMvdWkvTWFpblVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9QbGF5ZXJOYW1lclVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9TaGFyZE5hbWVyVUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL2dhbWUvR2FtZVVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9ob21lL0JvdHNQYWdlLmpzIiwic3JjL2NsaWVudC9qcy91aS9ob21lL0J1aWxkUGFnZS5qcyIsInNyYy9jbGllbnQvanMvdWkvaG9tZS9Ib21lVUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL2hvbWUvTGlzdFVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9ob21lL1VwZ3JhZGVzUGFnZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDallBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgRW50aXR5ID0gcmVxdWlyZSgnLi9lbnRpdHknKTtcclxudmFyIE1haW5VSSA9IHJlcXVpcmUoJy4vdWkvTWFpblVJJyk7XHJcblxyXG5mdW5jdGlvbiBDbGllbnQoKSB7XHJcbiAgICB0aGlzLlNFTEZJRCA9IG51bGw7XHJcbiAgICB0aGlzLkFSUk9XID0gbnVsbDtcclxuICAgIHRoaXMuQlJBQ0tFVCA9IG51bGw7XHJcbiAgICB0aGlzLnJpZ2h0Q2xpY2sgPSBmYWxzZTtcclxuICAgIHRoaXMuaW5pdCgpO1xyXG59XHJcblxyXG5DbGllbnQucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLmluaXRTb2NrZXQoKTtcclxuICAgIHRoaXMuaW5pdENhbnZhc2VzKCk7XHJcbiAgICB0aGlzLmluaXRMaXN0cygpO1xyXG4gICAgdGhpcy5pbml0Vmlld2VycygpO1xyXG59O1xyXG5cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdENhbnZhc2VzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5tYWluQ2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtYWluX2NhbnZhc1wiKTtcclxuICAgIHRoaXMuZHJhZnRDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpO1xyXG4gICAgdGhpcy5tTWFwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTtcclxuICAgIHRoaXMubU1hcFJvdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7XHJcblxyXG4gICAgdGhpcy5tYWluQ2FudmFzLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG4gICAgdGhpcy5kcmFmdENhbnZhcy5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcbiAgICB0aGlzLm1NYXAuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG4gICAgdGhpcy5tTWFwUm90LnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuXHJcbiAgICB0aGlzLmRyYWZ0Q2FudmFzLmhlaWdodCA9IHRoaXMubWFpbkNhbnZhcy5oZWlnaHQ7XHJcbiAgICB0aGlzLmRyYWZ0Q2FudmFzLndpZHRoID0gdGhpcy5tYWluQ2FudmFzLndpZHRoO1xyXG4gICAgdGhpcy5tTWFwLmhlaWdodCA9IDUwMDtcclxuICAgIHRoaXMubU1hcC53aWR0aCA9IDUwMDtcclxuICAgIHRoaXMubU1hcFJvdC5oZWlnaHQgPSA1MDA7XHJcbiAgICB0aGlzLm1NYXBSb3Qud2lkdGggPSA1MDA7XHJcblxyXG4gICAgdGhpcy5tYWluQ3R4ID0gdGhpcy5tYWluQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuICAgIHRoaXMuZHJhZnRDdHggPSB0aGlzLmRyYWZ0Q2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuICAgIHRoaXMubU1hcEN0eCA9IHRoaXMubU1hcC5nZXRDb250ZXh0KFwiMmRcIik7XHJcbiAgICB0aGlzLm1NYXBDdHhSb3QgPSB0aGlzLm1NYXBSb3QuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG5cclxuICAgIHRoaXMubWFpbkNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGlmIChldmVudC5idXR0b24gPT09IDIpIHtcclxuICAgICAgICAgICAgdGhpcy5yaWdodENsaWNrID0gdHJ1ZTtcclxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuQ09OVFJPTExFUl9MSVNUW3RoaXMuU0VMRklEXSkge1xyXG4gICAgICAgICAgICB0aGlzLkFSUk9XID0gbmV3IEVudGl0eS5BcnJvdyhldmVudC54IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldFdpZHRoICogMTAwMCxcclxuICAgICAgICAgICAgICAgIGV2ZW50LnkgLyB0aGlzLm1haW5DYW52YXMub2Zmc2V0SGVpZ2h0ICogNTAwLCB0aGlzKTtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMubWFpbkNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBpZiAoIXRoaXMucmlnaHRDbGljaykge1xyXG4gICAgICAgICAgICB0aGlzLkFSUk9XLnBvc3RYID0gZXZlbnQueCAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRXaWR0aCAqIDEwMDA7XHJcbiAgICAgICAgICAgIHRoaXMuQVJST1cucG9zdFkgPSBldmVudC55IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldEhlaWdodCAqIDUwMDtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJzZWxlY3RCb3RzXCIsIHtcclxuICAgICAgICAgICAgICAgIG1pblg6ICh0aGlzLkFSUk9XLnByZVggLSB0aGlzLmRyYWZ0Q2FudmFzLndpZHRoIC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yLFxyXG4gICAgICAgICAgICAgICAgbWluWTogKHRoaXMuQVJST1cucHJlWSAtIHRoaXMuZHJhZnRDYW52YXMuaGVpZ2h0IC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yLFxyXG4gICAgICAgICAgICAgICAgbWF4WDogKHRoaXMuQVJST1cucG9zdFggLSB0aGlzLmRyYWZ0Q2FudmFzLndpZHRoIC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yLFxyXG4gICAgICAgICAgICAgICAgbWF4WTogKHRoaXMuQVJST1cucG9zdFkgLSB0aGlzLmRyYWZ0Q2FudmFzLmhlaWdodCAvIDIpIC8gdGhpcy5zY2FsZUZhY3RvclxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHZhciB4ID0gZXZlbnQueCAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRXaWR0aCAqIDEwMDA7XHJcbiAgICAgICAgICAgIHZhciB5ID0gZXZlbnQueSAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRIZWlnaHQgKiA1MDA7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNvY2tldC5lbWl0KFwiYm90Q29tbWFuZFwiLCB7XHJcbiAgICAgICAgICAgICAgICB4OiAoeCAtIHRoaXMuZHJhZnRDYW52YXMud2lkdGggLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3IsXHJcbiAgICAgICAgICAgICAgICB5OiAoeSAtIHRoaXMuZHJhZnRDYW52YXMuaGVpZ2h0IC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5yaWdodENsaWNrID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5BUlJPVyA9IG51bGw7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMubWFpbkNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGlmICh0aGlzLkFSUk9XKSB7XHJcbiAgICAgICAgICAgIHRoaXMuQVJST1cucG9zdFggPSBldmVudC54IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldFdpZHRoICogMTAwMDtcclxuICAgICAgICAgICAgdGhpcy5BUlJPVy5wb3N0WSA9IGV2ZW50LnkgLyB0aGlzLm1haW5DYW52YXMub2Zmc2V0SGVpZ2h0ICogNTAwO1xyXG4gICAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5pbml0TGlzdHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLkZBQ1RJT05fTElTVCA9IHt9O1xyXG4gICAgdGhpcy5GQUNUSU9OX0FSUkFZID0gW107XHJcblxyXG4gICAgdGhpcy5DT05UUk9MTEVSX0xJU1QgPSB7fTtcclxuICAgIHRoaXMuVElMRV9MSVNUID0ge307XHJcbiAgICB0aGlzLlNIQVJEX0xJU1QgPSB7fTtcclxuICAgIHRoaXMuTEFTRVJfTElTVCA9IHt9O1xyXG4gICAgdGhpcy5IT01FX0xJU1QgPSB7fTtcclxuICAgIHRoaXMuQU5JTUFUSU9OX0xJU1QgPSB7fTtcclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdFNvY2tldCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuc29ja2V0ID0gaW8oKTtcclxuICAgIHRoaXMuc29ja2V0LnZlcmlmaWVkID0gZmFsc2U7XHJcblxyXG4gICAgdGhpcy5zb2NrZXQub24oJ2FkZEZhY3Rpb25zVUknLCB0aGlzLmFkZEZhY3Rpb25zdG9VSS5iaW5kKHRoaXMpKTtcclxuICAgIHRoaXMuc29ja2V0Lm9uKCd1cGRhdGVFbnRpdGllcycsIHRoaXMuaGFuZGxlUGFja2V0LmJpbmQodGhpcykpO1xyXG4gICAgdGhpcy5zb2NrZXQub24oJ2RyYXdTY2VuZScsIHRoaXMuZHJhd1NjZW5lLmJpbmQodGhpcykpO1xyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5pbml0Vmlld2VycyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMua2V5cyA9IFtdO1xyXG4gICAgdGhpcy5zY2FsZUZhY3RvciA9IDE7XHJcbiAgICB0aGlzLm1haW5TY2FsZUZhY3RvciA9IDE7XHJcbiAgICBjb25zb2xlLmxvZyhcIk1BS0lORyBORVcgVklFV0VSXCIpO1xyXG4gICAgdGhpcy5tYWluVUkgPSBuZXcgTWFpblVJKHRoaXMsIHRoaXMuc29ja2V0KTtcclxuXHJcbiAgICB0aGlzLm1haW5VSS5wbGF5ZXJOYW1lclVJLm9wZW4oKTtcclxuICAgIHRoaXMubWFpblVJLmdhbWVVSS5vcGVuKCk7XHJcbn07XHJcblxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5hZGRGYWN0aW9uc3RvVUkgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgaWYgKCF0aGlzLnNvY2tldC52ZXJpZmllZCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiVkVSSUZJRURcIik7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQuZW1pdChcInZlcmlmeVwiLCB7fSk7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQudmVyaWZpZWQgPSB0cnVlO1xyXG4gICAgfVxyXG4gICAgdmFyIGZhY3Rpb25zID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZhY3Rpb25zJyk7XHJcbiAgICB2YXIgcGFja2V0ID0gZGF0YS5mYWN0aW9ucztcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhY2tldC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciBuYW1lID0gcGFja2V0W2ldO1xyXG4gICAgICAgIHZhciBvcHRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdvcHRpb24nKTtcclxuICAgICAgICBvcHRpb24udmFsdWUgPSBuYW1lO1xyXG4gICAgICAgIGZhY3Rpb25zLmFwcGVuZENoaWxkKG9wdGlvbik7XHJcbiAgICB9XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLmhhbmRsZVBhY2tldCA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICB2YXIgcGFja2V0LCBpO1xyXG4gICAgZm9yIChpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBwYWNrZXQgPSBkYXRhW2ldO1xyXG4gICAgICAgIHN3aXRjaCAocGFja2V0Lm1hc3Rlcikge1xyXG4gICAgICAgICAgICBjYXNlIFwiYWRkXCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFkZEVudGl0aWVzKHBhY2tldCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcImRlbGV0ZVwiOlxyXG4gICAgICAgICAgICAgICAgdGhpcy5kZWxldGVFbnRpdGllcyhwYWNrZXQpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJ1cGRhdGVcIjpcclxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlRW50aXRpZXMocGFja2V0KTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUudXBkYXRlRW50aXRpZXMgPSBmdW5jdGlvbiAocGFja2V0KSB7XHJcbiAgICBmdW5jdGlvbiB1cGRhdGVFbnRpdHkocGFja2V0LCBsaXN0KSB7XHJcbiAgICAgICAgaWYgKCFwYWNrZXQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgZW50aXR5ID0gbGlzdFtwYWNrZXQuaWRdO1xyXG4gICAgICAgIGlmICghZW50aXR5KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgZW50aXR5LnVwZGF0ZShwYWNrZXQpO1xyXG4gICAgfVxyXG5cclxuICAgIHN3aXRjaCAocGFja2V0LmNsYXNzKSB7XHJcbiAgICAgICAgY2FzZSBcImNvbnRyb2xsZXJJbmZvXCI6XHJcbiAgICAgICAgICAgIHVwZGF0ZUVudGl0eShwYWNrZXQsIHRoaXMuQ09OVFJPTExFUl9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcInRpbGVJbmZvXCI6XHJcbiAgICAgICAgICAgIHVwZGF0ZUVudGl0eShwYWNrZXQsIHRoaXMuVElMRV9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcInNoYXJkSW5mb1wiOlxyXG4gICAgICAgICAgICB1cGRhdGVFbnRpdHkocGFja2V0LCB0aGlzLlNIQVJEX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiaG9tZUluZm9cIjpcclxuICAgICAgICAgICAgdXBkYXRlRW50aXR5KHBhY2tldCwgdGhpcy5IT01FX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiZmFjdGlvbkluZm9cIjpcclxuICAgICAgICAgICAgdXBkYXRlRW50aXR5KHBhY2tldCwgdGhpcy5GQUNUSU9OX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiVUlJbmZvXCI6XHJcbiAgICAgICAgICAgIGlmICh0aGlzLlNFTEZJRCA9PT0gcGFja2V0LnBsYXllcklkKSB7XHJcbiAgICAgICAgICAgICAgICB1cGRhdGVVSShwYWNrZXQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5kZWxldGVFbnRpdGllcyA9IGZ1bmN0aW9uIChwYWNrZXQpIHtcclxuICAgIHZhciBkZWxldGVFbnRpdHkgPSBmdW5jdGlvbiAocGFja2V0LCBsaXN0LCBhcnJheSkge1xyXG4gICAgICAgIGlmICghcGFja2V0KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGFycmF5KSB7XHJcbiAgICAgICAgICAgIHZhciBpbmRleCA9IGZpbmRXaXRoQXR0cihhcnJheSwgXCJpZFwiLCBwYWNrZXQuaWQpO1xyXG4gICAgICAgICAgICBhcnJheS5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBkZWxldGUgbGlzdFtwYWNrZXQuaWRdO1xyXG4gICAgfTtcclxuXHJcbiAgICBzd2l0Y2ggKHBhY2tldC5jbGFzcykge1xyXG4gICAgICAgIGNhc2UgXCJ0aWxlSW5mb1wiOlxyXG4gICAgICAgICAgICBkZWxldGVFbnRpdHkocGFja2V0LCB0aGlzLlRJTEVfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJjb250cm9sbGVySW5mb1wiOlxyXG4gICAgICAgICAgICBkZWxldGVFbnRpdHkocGFja2V0LCB0aGlzLkNPTlRST0xMRVJfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJzaGFyZEluZm9cIjpcclxuICAgICAgICAgICAgZGVsZXRlRW50aXR5KHBhY2tldCwgdGhpcy5TSEFSRF9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImhvbWVJbmZvXCI6XHJcbiAgICAgICAgICAgIGRlbGV0ZUVudGl0eShwYWNrZXQsIHRoaXMuSE9NRV9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImZhY3Rpb25JbmZvXCI6XHJcbiAgICAgICAgICAgIGRlbGV0ZUVudGl0eShwYWNrZXQsIHRoaXMuRkFDVElPTl9MSVNULCB0aGlzLkZBQ1RJT05fQVJSQVkpO1xyXG4gICAgICAgICAgICAvL3RoaXMuZHJhd0xlYWRlckJvYXJkKCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJhbmltYXRpb25JbmZvXCI6XHJcbiAgICAgICAgICAgIGRlbGV0ZUVudGl0eShwYWNrZXQsIHRoaXMuQU5JTUFUSU9OX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwibGFzZXJJbmZvXCI6XHJcbiAgICAgICAgICAgIGRlbGV0ZUVudGl0eShwYWNrZXQsIHRoaXMuTEFTRVJfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJicmFja2V0SW5mb1wiOlxyXG4gICAgICAgICAgICBpZiAodGhpcy5TRUxGSUQgPT09IHBhY2tldC5pZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5CUkFDS0VUID0gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiVUlJbmZvXCI6XHJcbiAgICAgICAgICAgIGlmICh0aGlzLlNFTEZJRCA9PT0gcGFja2V0LmlkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1haW5VSS5jbG9zZShwYWNrZXQuYWN0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgIH1cclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUuYWRkRW50aXRpZXMgPSBmdW5jdGlvbiAocGFja2V0KSB7XHJcbiAgICB2YXIgYWRkRW50aXR5ID0gZnVuY3Rpb24gKHBhY2tldCwgbGlzdCwgZW50aXR5LCBhcnJheSkge1xyXG4gICAgICAgIGlmICghcGFja2V0KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgbGlzdFtwYWNrZXQuaWRdID0gbmV3IGVudGl0eShwYWNrZXQsIHRoaXMpO1xyXG4gICAgICAgIGlmIChhcnJheSAmJiBmaW5kV2l0aEF0dHIoYXJyYXksIFwiaWRcIiwgcGFja2V0LmlkKSA9PT0gLTEpIHtcclxuICAgICAgICAgICAgYXJyYXkucHVzaChsaXN0W3BhY2tldC5pZF0pO1xyXG4gICAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKTtcclxuXHJcbiAgICBzd2l0Y2ggKHBhY2tldC5jbGFzcykge1xyXG4gICAgICAgIGNhc2UgXCJ0aWxlSW5mb1wiOlxyXG4gICAgICAgICAgICBhZGRFbnRpdHkocGFja2V0LCB0aGlzLlRJTEVfTElTVCwgRW50aXR5LlRpbGUpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiY29udHJvbGxlckluZm9cIjpcclxuICAgICAgICAgICAgYWRkRW50aXR5KHBhY2tldCwgdGhpcy5DT05UUk9MTEVSX0xJU1QsIEVudGl0eS5Db250cm9sbGVyKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcInNoYXJkSW5mb1wiOlxyXG4gICAgICAgICAgICBhZGRFbnRpdHkocGFja2V0LCB0aGlzLlNIQVJEX0xJU1QsIEVudGl0eS5TaGFyZCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJsYXNlckluZm9cIjpcclxuICAgICAgICAgICAgYWRkRW50aXR5KHBhY2tldCwgdGhpcy5MQVNFUl9MSVNULCBFbnRpdHkuTGFzZXIpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiaG9tZUluZm9cIjpcclxuICAgICAgICAgICAgYWRkRW50aXR5KHBhY2tldCwgdGhpcy5IT01FX0xJU1QsIEVudGl0eS5Ib21lKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImZhY3Rpb25JbmZvXCI6XHJcbiAgICAgICAgICAgIGFkZEVudGl0eShwYWNrZXQsIHRoaXMuRkFDVElPTl9MSVNULCBFbnRpdHkuRmFjdGlvbiwgdGhpcy5GQUNUSU9OX0FSUkFZKTtcclxuICAgICAgICAgICAgLy90aGlzLmRyYXdMZWFkZXJCb2FyZCgpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiYW5pbWF0aW9uSW5mb1wiOlxyXG4gICAgICAgICAgICBhZGRFbnRpdHkocGFja2V0LCB0aGlzLkFOSU1BVElPTl9MSVNULCBFbnRpdHkuQW5pbWF0aW9uKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImJyYWNrZXRJbmZvXCI6XHJcbiAgICAgICAgICAgIGlmICh0aGlzLlNFTEZJRCA9PT0gcGFja2V0LnBsYXllcklkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLkJSQUNLRVQgPSBuZXcgRW50aXR5LkJyYWNrZXQocGFja2V0LCB0aGlzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiVUlJbmZvXCI6XHJcbiAgICAgICAgICAgIGlmICh0aGlzLlNFTEZJRCA9PT0gcGFja2V0LnBsYXllcklkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1haW5VSS5vcGVuKHBhY2tldCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcInNlbGZJZFwiOlxyXG4gICAgICAgICAgICB0aGlzLlNFTEZJRCA9IHBhY2tldC5zZWxmSWQ7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS51cGRhdGVGYWN0aW9uc0xpc3QgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgZmFjdGlvblNvcnQgPSBmdW5jdGlvbiAoYSwgYikge1xyXG4gICAgICAgIHJldHVybiBhLnNpemUgLSBiLnNpemU7XHJcbiAgICB9O1xyXG5cclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUuZHJhd1NjZW5lID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgIHZhciBpZDtcclxuICAgIHZhciBzZWxmUGxheWVyID0gdGhpcy5DT05UUk9MTEVSX0xJU1RbdGhpcy5TRUxGSURdO1xyXG4gICAgaWYgKCFzZWxmUGxheWVyKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMubWFpbkN0eC5jbGVhclJlY3QoMCwgMCwgMTEwMDAsIDExMDAwKTtcclxuICAgIHRoaXMuZHJhZnRDdHguY2xlYXJSZWN0KDAsIDAsIDExMDAwLCAxMTAwMCk7XHJcbiAgICB0aGlzLm1NYXBDdHguY2xlYXJSZWN0KDAsIDAsIDUwMCwgNTAwKTtcclxuXHJcbiAgICB2YXIgZW50aXR5TGlzdCA9IFt0aGlzLlRJTEVfTElTVCwgdGhpcy5DT05UUk9MTEVSX0xJU1QsXHJcbiAgICAgICAgdGhpcy5TSEFSRF9MSVNULCB0aGlzLkxBU0VSX0xJU1QsIHRoaXMuSE9NRV9MSVNULFxyXG4gICAgICAgIHRoaXMuRkFDVElPTl9MSVNULCB0aGlzLkFOSU1BVElPTl9MSVNUXTtcclxuXHJcbiAgICB2YXIgaW5Cb3VuZHMgPSBmdW5jdGlvbiAocGxheWVyLCB4LCB5KSB7XHJcbiAgICAgICAgdmFyIHJhbmdlID0gdGhpcy5tYWluQ2FudmFzLndpZHRoIC8gKDEuMiAqIHRoaXMuc2NhbGVGYWN0b3IpO1xyXG4gICAgICAgIHJldHVybiB4IDwgKHBsYXllci54ICsgcmFuZ2UpICYmIHggPiAocGxheWVyLnggLSA1IC8gNCAqIHJhbmdlKVxyXG4gICAgICAgICAgICAmJiB5IDwgKHBsYXllci55ICsgcmFuZ2UpICYmIHkgPiAocGxheWVyLnkgLSA1IC8gNCAqIHJhbmdlKTtcclxuICAgIH0uYmluZCh0aGlzKTtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVudGl0eUxpc3QubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgbGlzdCA9IGVudGl0eUxpc3RbaV07XHJcbiAgICAgICAgZm9yIChpZCBpbiBsaXN0KSB7XHJcbiAgICAgICAgICAgIHZhciBlbnRpdHkgPSBsaXN0W2lkXTtcclxuICAgICAgICAgICAgaWYgKGluQm91bmRzKHNlbGZQbGF5ZXIsIGVudGl0eS54LCBlbnRpdHkueSkpIHtcclxuICAgICAgICAgICAgICAgIGVudGl0eS5zaG93KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGlmICh0aGlzLkJSQUNLRVQpIHtcclxuICAgICAgICB0aGlzLkJSQUNLRVQuc2hvdygpO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMuQVJST1cpIHtcclxuICAgICAgICB0aGlzLkFSUk9XLnNob3coKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgZHJhd0Nvbm5lY3RvcnMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgZm9yICh2YXIgaWQgaW4gdGhpcy5IT01FX0xJU1QpIHtcclxuICAgICAgICAgICAgdmFyIGhvbWUgPSB0aGlzLkhPTUVfTElTVFtpZF07XHJcbiAgICAgICAgICAgIGlmIChob21lLm5laWdoYm9ycykge1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBob21lLm5laWdoYm9ycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBuZWlnaGJvciA9IHRoaXMuSE9NRV9MSVNUW2hvbWUubmVpZ2hib3JzW2ldXTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRyYWZ0Q3R4Lm1vdmVUbyhob21lLngsIGhvbWUueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kcmFmdEN0eC5zdHJva2VTdHlsZSA9IFwiIzkxMjM4MVwiO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRyYWZ0Q3R4LmxpbmVXaWR0aCA9IDEwO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZHJhZnRDdHgubGluZVRvKG5laWdoYm9yLngsIG5laWdoYm9yLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZHJhZnRDdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcblxyXG5cclxuICAgIHZhciB0cmFuc2xhdGVTY2VuZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLmRyYWZ0Q3R4LnNldFRyYW5zZm9ybSgxLCAwLCAwLCAxLCAwLCAwKTtcclxuICAgICAgICB0aGlzLnNjYWxlRmFjdG9yID0gbGVycCh0aGlzLnNjYWxlRmFjdG9yLCB0aGlzLm1haW5TY2FsZUZhY3RvciwgMC4zKTtcclxuXHJcbiAgICAgICAgdGhpcy5kcmFmdEN0eC50cmFuc2xhdGUodGhpcy5tYWluQ2FudmFzLndpZHRoIC8gMiwgdGhpcy5tYWluQ2FudmFzLmhlaWdodCAvIDIpO1xyXG4gICAgICAgIHRoaXMuZHJhZnRDdHguc2NhbGUodGhpcy5zY2FsZUZhY3RvciwgdGhpcy5zY2FsZUZhY3Rvcik7XHJcbiAgICAgICAgdGhpcy5kcmFmdEN0eC50cmFuc2xhdGUoLXNlbGZQbGF5ZXIueCwgLXNlbGZQbGF5ZXIueSk7XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcblxyXG4gICAgZHJhd0Nvbm5lY3RvcnMoKTtcclxuICAgIHRyYW5zbGF0ZVNjZW5lKCk7XHJcbiAgICB0aGlzLm1haW5DdHguZHJhd0ltYWdlKHRoaXMuZHJhZnRDYW52YXMsIDAsIDApO1xyXG59O1xyXG5cclxuXHJcbmZ1bmN0aW9uIGxlcnAoYSwgYiwgcmF0aW8pIHtcclxuICAgIHJldHVybiBhICsgcmF0aW8gKiAoYiAtIGEpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmaW5kV2l0aEF0dHIoYXJyYXksIGF0dHIsIHZhbHVlKSB7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSArPSAxKSB7XHJcbiAgICAgICAgaWYgKGFycmF5W2ldW2F0dHJdID09PSB2YWx1ZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gaTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gLTE7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFJhbmRvbShtaW4sIG1heCkge1xyXG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pbjtcclxufVxyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ2xpZW50OyIsImZ1bmN0aW9uIEFuaW1hdGlvbihhbmltYXRpb25JbmZvLCBjbGllbnQpIHtcclxuICAgIHRoaXMudHlwZSA9IGFuaW1hdGlvbkluZm8udHlwZTtcclxuICAgIHRoaXMuaWQgPSBhbmltYXRpb25JbmZvLmlkO1xyXG4gICAgdGhpcy5uYW1lID0gYW5pbWF0aW9uSW5mby5uYW1lO1xyXG4gICAgdGhpcy54ID0gYW5pbWF0aW9uSW5mby54O1xyXG4gICAgdGhpcy55ID0gYW5pbWF0aW9uSW5mby55O1xyXG4gICAgdGhpcy50aGV0YSA9IDE1O1xyXG4gICAgdGhpcy50aW1lciA9IGdldFJhbmRvbSgxMCwgMTQpO1xyXG5cclxuICAgIGlmICh0aGlzLngpIHtcclxuICAgICAgICB0aGlzLmVuZFggPSB0aGlzLnggKyBnZXRSYW5kb20oLTEwMCwgMTAwKTtcclxuICAgICAgICB0aGlzLmVuZFkgPSB0aGlzLnkgKyBnZXRSYW5kb20oLTEwMCwgMTAwKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxufVxyXG5cclxuXHJcbkFuaW1hdGlvbi5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBob21lO1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50LmRyYWZ0Q3R4O1xyXG4gICAgaWYgKHRoaXMudHlwZSA9PT0gXCJhZGRTaGFyZFwiKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJEUkFXSU5HIEFERCBTSEFSRCBBTklNQVRJT05cIik7XHJcbiAgICAgICAgaG9tZSA9IHRoaXMuY2xpZW50LkhPTUVfTElTVFt0aGlzLmlkXTtcclxuICAgICAgICBpZiAoIWhvbWUpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDMgKiB0aGlzLnRpbWVyO1xyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiIzAxMkNDQ1wiO1xyXG4gICAgICAgIGN0eC5hcmMoaG9tZS54LCBob21lLnksIGhvbWUucmFkaXVzLCAwLCB0aGlzLnRpbWVyIC8gMS4yLCB0cnVlKTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLnR5cGUgPT09IFwicmVtb3ZlU2hhcmRcIikge1xyXG4gICAgICAgIGhvbWUgPSB0aGlzLmNsaWVudC5IT01FX0xJU1RbdGhpcy5pZF07XHJcbiAgICAgICAgaWYgKCFob21lKSB7XHJcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmNsaWVudC5BTklNQVRJT05fTElTVFtpZF07XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSAxNSAtIHRoaXMudGltZXI7XHJcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCJyZ2JhKDI1NSwgMCwgMCwgXCIgKyB0aGlzLnRpbWVyICogMTAgLyAxMDAgKyBcIilcIjtcclxuICAgICAgICBjdHguYXJjKGhvbWUueCwgaG9tZS55LCBob21lLnJhZGl1cywgMCwgMiAqIE1hdGguUEksIGZhbHNlKTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLnR5cGUgPT09IFwic2hhcmREZWF0aFwiKSB7XHJcbiAgICAgICAgY3R4LmZvbnQgPSA2MCAtIHRoaXMudGltZXIgKyBcInB4IEFyaWFsXCI7XHJcbiAgICAgICAgY3R4LnNhdmUoKTtcclxuICAgICAgICBjdHgudHJhbnNsYXRlKHRoaXMueCwgdGhpcy55KTtcclxuICAgICAgICBjdHgucm90YXRlKC1NYXRoLlBJIC8gNTAgKiB0aGlzLnRoZXRhKTtcclxuICAgICAgICBjdHgudGV4dEFsaWduID0gXCJjZW50ZXJcIjtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2JhKDI1NSwgMTY4LCA4NiwgXCIgKyB0aGlzLnRpbWVyICogMTAgLyAxMDAgKyBcIilcIjtcclxuICAgICAgICBjdHguZmlsbFRleHQodGhpcy5uYW1lLCAwLCAxNSk7XHJcbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcclxuXHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiIzAwMDAwMFwiO1xyXG4gICAgICAgIHRoaXMudGhldGEgPSBsZXJwKHRoaXMudGhldGEsIDAsIDAuMDgpO1xyXG4gICAgICAgIHRoaXMueCA9IGxlcnAodGhpcy54LCB0aGlzLmVuZFgsIDAuMSk7XHJcbiAgICAgICAgdGhpcy55ID0gbGVycCh0aGlzLnksIHRoaXMuZW5kWSwgMC4xKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnRpbWVyLS07XHJcbiAgICBpZiAodGhpcy50aW1lciA8PSAwKSB7XHJcbiAgICAgICAgZGVsZXRlIHRoaXMuY2xpZW50LkFOSU1BVElPTl9MSVNUW3RoaXMuaWRdO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbmZ1bmN0aW9uIGdldFJhbmRvbShtaW4sIG1heCkge1xyXG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pbjtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBBbmltYXRpb247IiwiZnVuY3Rpb24gQXJyb3coeCwgeSwgY2xpZW50KSB7XHJcbiAgICB0aGlzLnByZVggPSB4O1xyXG4gICAgdGhpcy5wcmVZID0geTtcclxuICAgIHRoaXMucG9zdFggPSB4O1xyXG4gICAgdGhpcy5wb3N0WSA9IHk7XHJcbiAgICB0aGlzLmRlbHRhWCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5wb3N0WCAtIG1haW5DYW52YXMud2lkdGggLyAyO1xyXG4gICAgfTtcclxuICAgIHRoaXMuZGVsdGFZID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnBvc3RZIC0gbWFpbkNhbnZhcy5oZWlnaHQgLyAyO1xyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxufVxyXG5cclxuQXJyb3cucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgY2FudmFzID0gdGhpcy5jbGllbnQuZHJhZnRDYW52YXM7XHJcbiAgICB2YXIgY3R4ID0gdGhpcy5jbGllbnQuZHJhZnRDdHg7XHJcbiAgICB2YXIgc2VsZlBsYXllciA9IHRoaXMuY2xpZW50LkNPTlRST0xMRVJfTElTVFt0aGlzLmNsaWVudC5TRUxGSURdO1xyXG4gICAgdmFyIHNjYWxlRmFjdG9yID0gdGhpcy5jbGllbnQuc2NhbGVGYWN0b3I7XHJcblxyXG4gICAgaWYgKHRoaXMucG9zdFgpIHtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCIjNTIxNTIyXCI7XHJcblxyXG4gICAgICAgIHZhciBwcmVYID0gc2VsZlBsYXllci54ICsgKHRoaXMucHJlWCAtIGNhbnZhcy53aWR0aCAvIDIpIC8gc2NhbGVGYWN0b3I7XHJcbiAgICAgICAgdmFyIHByZVkgPSBzZWxmUGxheWVyLnkgKyAodGhpcy5wcmVZIC0gY2FudmFzLmhlaWdodCAvIDIpIC8gc2NhbGVGYWN0b3I7XHJcblxyXG4gICAgICAgIHZhciBwb3N0WCA9IHNlbGZQbGF5ZXIueCArICh0aGlzLnBvc3RYIC0gY2FudmFzLndpZHRoIC8gMikgLyBzY2FsZUZhY3RvcjtcclxuICAgICAgICB2YXIgcG9zdFkgPSBzZWxmUGxheWVyLnkgKyAodGhpcy5wb3N0WSAtIGNhbnZhcy5oZWlnaHQgLyAyKSAvIHNjYWxlRmFjdG9yO1xyXG5cclxuICAgICAgICBjdHguZmlsbFJlY3QocHJlWCwgcHJlWSwgcG9zdFggLSBwcmVYLCBwb3N0WSAtIHByZVkpO1xyXG5cclxuICAgICAgICBjdHguYXJjKHBvc3RYLCBwb3N0WSwgMywgMCwgMiAqIE1hdGguUEksIHRydWUpO1xyXG4gICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgIH1cclxuXHJcbn07XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBBcnJvdzsiLCJmdW5jdGlvbiBCcmFja2V0KGJyYWNrZXRJbmZvLCBjbGllbnQpIHtcclxuICAgIHZhciB0aWxlID0gY2xpZW50LlRJTEVfTElTVFticmFja2V0SW5mby50aWxlSWRdO1xyXG5cclxuICAgIHRoaXMueCA9IHRpbGUueDtcclxuICAgIHRoaXMueSA9IHRpbGUueTtcclxuICAgIHRoaXMubGVuZ3RoID0gdGlsZS5sZW5ndGg7XHJcblxyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbn1cclxuXHJcbkJyYWNrZXQucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgc2VsZlBsYXllciA9IHRoaXMuY2xpZW50LkNPTlRST0xMRVJfTElTVFt0aGlzLmNsaWVudC5TRUxGSURdO1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50LmRyYWZ0Q3R4O1xyXG5cclxuICAgIGN0eC5maWxsU3R5bGUgPSBcInJnYmEoMTAwLDIxMSwyMTEsMC42KVwiO1xyXG4gICAgY3R4LmZpbGxSZWN0KHRoaXMueCwgdGhpcy55LCB0aGlzLmxlbmd0aCwgdGhpcy5sZW5ndGgpO1xyXG4gICAgY3R4LmZvbnQgPSBcIjIwcHggQXJpYWxcIjtcclxuXHJcbiAgICBjdHguZmlsbFRleHQoXCJQcmVzcyBaIHRvIFBsYWNlIFNlbnRpbmVsXCIsIHNlbGZQbGF5ZXIueCwgc2VsZlBsYXllci55ICsgMTAwKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQnJhY2tldDsiLCJmdW5jdGlvbiBDb250cm9sbGVyKGNvbnRyb2xsZXJJbmZvLCBjbGllbnQpIHtcclxuICAgIHRoaXMuaWQgPSBjb250cm9sbGVySW5mby5pZDtcclxuICAgIHRoaXMubmFtZSA9IGNvbnRyb2xsZXJJbmZvLm5hbWU7XHJcbiAgICB0aGlzLnggPSBjb250cm9sbGVySW5mby54O1xyXG4gICAgdGhpcy55ID0gY29udHJvbGxlckluZm8ueTtcclxuICAgIHRoaXMuaGVhbHRoID0gY29udHJvbGxlckluZm8uaGVhbHRoO1xyXG4gICAgdGhpcy5tYXhIZWFsdGggPSBjb250cm9sbGVySW5mby5tYXhIZWFsdGg7XHJcbiAgICB0aGlzLnNlbGVjdGVkID0gY29udHJvbGxlckluZm8uc2VsZWN0ZWQ7XHJcbiAgICB0aGlzLm93bmVyID0gY29udHJvbGxlckluZm8ub3duZXI7XHJcbiAgICB0aGlzLnRoZXRhID0gY29udHJvbGxlckluZm8udGhldGE7XHJcbiAgICB0aGlzLnR5cGUgPSBjb250cm9sbGVySW5mby50eXBlO1xyXG4gICAgdGhpcy5sZXZlbCA9IGNvbnRyb2xsZXJJbmZvLmxldmVsO1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5Db250cm9sbGVyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoY29udHJvbGxlckluZm8pIHtcclxuICAgIHRoaXMueCA9IGNvbnRyb2xsZXJJbmZvLng7XHJcbiAgICB0aGlzLnkgPSBjb250cm9sbGVySW5mby55O1xyXG4gICAgdGhpcy5oZWFsdGggPSBjb250cm9sbGVySW5mby5oZWFsdGg7XHJcbiAgICB0aGlzLm1heEhlYWx0aCA9IGNvbnRyb2xsZXJJbmZvLm1heEhlYWx0aDtcclxuICAgIHRoaXMuc2VsZWN0ZWQgPSBjb250cm9sbGVySW5mby5zZWxlY3RlZDtcclxuICAgIHRoaXMudGhldGEgPSBjb250cm9sbGVySW5mby50aGV0YTtcclxuICAgIHRoaXMubGV2ZWwgPSBjb250cm9sbGVySW5mby5sZXZlbDtcclxufTtcclxuXHJcbkNvbnRyb2xsZXIucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5mb250ID0gXCIyMHB4IEFyaWFsXCI7XHJcbiAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5zdHJva2VTdHlsZSA9IFwiI2ZmOWQ2MFwiO1xyXG5cclxuICAgIHRoaXMuY2xpZW50LmRyYWZ0Q3R4LmZpbGxTdHlsZSA9IFwicmdiYSgxMjMsMCwwLFwiICsgdGhpcy5oZWFsdGggLyAoNCAqIHRoaXMubWF4SGVhbHRoKSArIFwiKVwiO1xyXG4gICAgdGhpcy5jbGllbnQuZHJhZnRDdHgubGluZVdpZHRoID0gMTA7XHJcbiAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5iZWdpblBhdGgoKTtcclxuXHJcbiAgICAvL2RyYXcgcGxheWVyIG9iamVjdFxyXG4gICAgaWYgKHRoaXMudHlwZSA9PT0gXCJQbGF5ZXJcIikge1xyXG4gICAgICAgIHZhciByYWRpdXMgPSAzMDtcclxuICAgICAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5tb3ZlVG8odGhpcy54ICsgcmFkaXVzLCB0aGlzLnkpO1xyXG4gICAgICAgIGZvciAoaSA9IE1hdGguUEkgLyA0OyBpIDw9IDIgKiBNYXRoLlBJIC0gTWF0aC5QSSAvIDQ7IGkgKz0gTWF0aC5QSSAvIDQpIHtcclxuICAgICAgICAgICAgdGhldGEgPSBpICsgZ2V0UmFuZG9tKC0odGhpcy5tYXhIZWFsdGggLyB0aGlzLmhlYWx0aCkgLyA3LCAodGhpcy5tYXhIZWFsdGggLyB0aGlzLmhlYWx0aCkgLyA3KTtcclxuICAgICAgICAgICAgeCA9IHJhZGl1cyAqIE1hdGguY29zKHRoZXRhKTtcclxuICAgICAgICAgICAgeSA9IHJhZGl1cyAqIE1hdGguc2luKHRoZXRhKTtcclxuICAgICAgICAgICAgdGhpcy5jbGllbnQuZHJhZnRDdHgubGluZVRvKHRoaXMueCArIHgsIHRoaXMueSArIHkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5saW5lVG8odGhpcy54ICsgcmFkaXVzLCB0aGlzLnkgKyAzKTtcclxuICAgICAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5zdHJva2UoKTtcclxuICAgICAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5maWxsKCk7XHJcbiAgICB9IGVsc2UgeyAvL2JvdFxyXG4gICAgICAgIHZhciB4LCB5LCB0aGV0YSwgc3RhcnRYLCBzdGFydFk7XHJcbiAgICAgICAgdmFyIHNtYWxsUmFkaXVzID0gMTI7XHJcbiAgICAgICAgdmFyIGJpZ1JhZGl1cyA9IDIwO1xyXG5cclxuICAgICAgICB0aGV0YSA9IHRoaXMudGhldGE7XHJcbiAgICAgICAgc3RhcnRYID0gYmlnUmFkaXVzICogTWF0aC5jb3ModGhldGEpO1xyXG4gICAgICAgIHN0YXJ0WSA9IGJpZ1JhZGl1cyAqIE1hdGguc2luKHRoZXRhKTtcclxuICAgICAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5tb3ZlVG8odGhpcy54ICsgc3RhcnRYLCB0aGlzLnkgKyBzdGFydFkpO1xyXG4gICAgICAgIGZvciAoaSA9IDE7IGkgPD0gMjsgaSsrKSB7XHJcbiAgICAgICAgICAgIHRoZXRhID0gdGhpcy50aGV0YSArIDIgKiBNYXRoLlBJIC8gMyAqIGkgK1xyXG4gICAgICAgICAgICAgICAgZ2V0UmFuZG9tKC10aGlzLm1heEhlYWx0aCAvIHRoaXMuaGVhbHRoIC8gNywgdGhpcy5tYXhIZWFsdGggLyB0aGlzLmhlYWx0aCAvIDcpO1xyXG4gICAgICAgICAgICB4ID0gc21hbGxSYWRpdXMgKiBNYXRoLmNvcyh0aGV0YSk7XHJcbiAgICAgICAgICAgIHkgPSBzbWFsbFJhZGl1cyAqIE1hdGguc2luKHRoZXRhKTtcclxuICAgICAgICAgICAgdGhpcy5jbGllbnQuZHJhZnRDdHgubGluZVRvKHRoaXMueCArIHgsIHRoaXMueSArIHkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5saW5lVG8odGhpcy54ICsgc3RhcnRYLCB0aGlzLnkgKyBzdGFydFkpO1xyXG4gICAgICAgIHRoaXMuY2xpZW50LmRyYWZ0Q3R4LmZpbGwoKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5maWxsU3R5bGUgPSBcIiNmZjlkNjBcIjtcclxuICAgIHRoaXMuY2xpZW50LmRyYWZ0Q3R4LmZpbGxUZXh0KHRoaXMubmFtZSwgdGhpcy54LCB0aGlzLnkgKyA3MCk7XHJcbiAgICBpZiAodGhpcy5zZWxlY3RlZCAmJiB0aGlzLm93bmVyID09PSB0aGlzLmNsaWVudC5TRUxGSUQpIHtcclxuICAgICAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5saW5lV2lkdGggPSA1O1xyXG4gICAgICAgIHRoaXMuY2xpZW50LmRyYWZ0Q3R4LnN0cm9rZVN0eWxlID0gXCIjMWQ1NWFmXCI7XHJcbiAgICAgICAgdGhpcy5jbGllbnQuZHJhZnRDdHguc3Ryb2tlKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0UmFuZG9tKG1pbiwgbWF4KSB7XHJcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pICsgbWluO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRyb2xsZXI7IiwiZnVuY3Rpb24gRmFjdGlvbihmYWN0aW9uSW5mbywgY2xpZW50KSB7XHJcbiAgICB0aGlzLmlkID0gZmFjdGlvbkluZm8uaWQ7XHJcbiAgICB0aGlzLm5hbWUgPSBmYWN0aW9uSW5mby5uYW1lO1xyXG4gICAgdGhpcy54ID0gZmFjdGlvbkluZm8ueDtcclxuICAgIHRoaXMueSA9IGZhY3Rpb25JbmZvLnk7XHJcbiAgICB0aGlzLnNpemUgPSBmYWN0aW9uSW5mby5zaXplO1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5GYWN0aW9uLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoZmFjdGlvbkluZm8pIHtcclxuICAgIHRoaXMueCA9IGZhY3Rpb25JbmZvLng7XHJcbiAgICB0aGlzLnkgPSBmYWN0aW9uSW5mby55O1xyXG4gICAgdGhpcy5zaXplID0gZmFjdGlvbkluZm8uc2l6ZTtcclxuXHJcblxyXG4gICAgLy9GQUNUSU9OX0FSUkFZLnNvcnQoZmFjdGlvblNvcnQpO1xyXG4gICAgLy9kcmF3TGVhZGVyQm9hcmQoKTsgLy9jaGFuZ2UgdGhpc1xyXG59O1xyXG5cclxuRmFjdGlvbi5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5kcmFmdEN0eDtcclxuICAgIGN0eC5mb250ID0gdGhpcy5zaXplICogMzAgKyBcInB4IEFyaWFsXCI7XHJcbiAgICBjdHgudGV4dEFsaWduID0gXCJjZW50ZXJcIjtcclxuICAgIGN0eC5maWxsVGV4dCh0aGlzLm5hbWUsIHRoaXMueCwgdGhpcy55KTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRmFjdGlvbjsiLCJmdW5jdGlvbiBIb21lKGhvbWVJbmZvLCBjbGllbnQpIHtcclxuICAgIHRoaXMuaWQgPSBob21lSW5mby5pZDtcclxuICAgIHRoaXMueCA9IGhvbWVJbmZvLng7XHJcbiAgICB0aGlzLnkgPSBob21lSW5mby55O1xyXG4gICAgdGhpcy5uYW1lID0gaG9tZUluZm8ub3duZXI7XHJcbiAgICB0aGlzLnR5cGUgPSBob21lSW5mby50eXBlO1xyXG4gICAgdGhpcy5yYWRpdXMgPSBob21lSW5mby5yYWRpdXM7XHJcbiAgICB0aGlzLnNoYXJkcyA9IGhvbWVJbmZvLnNoYXJkcztcclxuICAgIHRoaXMucG93ZXIgPSBob21lSW5mby5wb3dlcjtcclxuICAgIHRoaXMubGV2ZWwgPSBob21lSW5mby5sZXZlbDtcclxuICAgIHRoaXMuaGFzQ29sb3IgPSBob21lSW5mby5oYXNDb2xvcjtcclxuICAgIHRoaXMuaGVhbHRoID0gaG9tZUluZm8uaGVhbHRoO1xyXG4gICAgdGhpcy5uZWlnaGJvcnMgPSBob21lSW5mby5uZWlnaGJvcnM7XHJcblxyXG4gICAgdGhpcy51bml0RG1nID0gaG9tZUluZm8udW5pdERtZztcclxuICAgIHRoaXMudW5pdFNwZWVkID0gaG9tZUluZm8udW5pdFNwZWVkO1xyXG4gICAgdGhpcy51bml0QXJtb3IgPSBob21lSW5mby51bml0QXJtb3I7XHJcbiAgICB0aGlzLnF1ZXVlID0gaG9tZUluZm8ucXVldWU7XHJcbiAgICB0aGlzLmJvdHMgPSBob21lSW5mby5ib3RzO1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5cclxuSG9tZS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKGhvbWVJbmZvKSB7XHJcbiAgICB0aGlzLnNoYXJkcyA9IGhvbWVJbmZvLnNoYXJkcztcclxuICAgIHRoaXMubGV2ZWwgPSBob21lSW5mby5sZXZlbDtcclxuICAgIHRoaXMucmFkaXVzID0gaG9tZUluZm8ucmFkaXVzO1xyXG4gICAgdGhpcy5wb3dlciA9IGhvbWVJbmZvLnBvd2VyO1xyXG4gICAgdGhpcy5oZWFsdGggPSBob21lSW5mby5oZWFsdGg7XHJcbiAgICB0aGlzLmhhc0NvbG9yID0gaG9tZUluZm8uaGFzQ29sb3I7XHJcbiAgICB0aGlzLm5laWdoYm9ycyA9IGhvbWVJbmZvLm5laWdoYm9ycztcclxuICAgIHRoaXMudW5pdERtZyA9IGhvbWVJbmZvLnVuaXREbWc7XHJcbiAgICB0aGlzLnVuaXRTcGVlZCA9IGhvbWVJbmZvLnVuaXRTcGVlZDtcclxuICAgIHRoaXMudW5pdEFybW9yID0gaG9tZUluZm8udW5pdEFybW9yO1xyXG4gICAgdGhpcy5xdWV1ZSA9IGhvbWVJbmZvLnF1ZXVlO1xyXG4gICAgdGhpcy5ib3RzID0gaG9tZUluZm8uYm90cztcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSG9tZTtcclxuXHJcblxyXG5Ib21lLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50LmRyYWZ0Q3R4O1xyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgaWYgKHRoaXMubmVpZ2hib3JzLmxlbmd0aCA+PSA0KSB7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiIzQxNjllMVwiO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCIjMzk2YTZkXCI7XHJcbiAgICB9XHJcblxyXG4gICAgY3R4LmFyYyh0aGlzLngsIHRoaXMueSwgdGhpcy5yYWRpdXMsIDAsIDIgKiBNYXRoLlBJLCBmYWxzZSk7XHJcbiAgICBjdHguZmlsbCgpO1xyXG5cclxuICAgIHZhciBzZWxmUGxheWVyID0gdGhpcy5jbGllbnQuQ09OVFJPTExFUl9MSVNUW3RoaXMuY2xpZW50LlNFTEZJRF07XHJcblxyXG4gICAgaWYgKGluQm91bmRzQ2xvc2Uoc2VsZlBsYXllciwgdGhpcy54LCB0aGlzLnkpKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuZmFjdGlvbilcclxuICAgICAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCJyZ2JhKDEyLCAyNTUsIDIxOCwgMC43KVwiO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSAxMDtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMub3duZXIgIT09IG51bGwpIHtcclxuICAgICAgICBjdHguZmlsbFRleHQodGhpcy5zaGFyZHMubGVuZ3RoLCB0aGlzLngsIHRoaXMueSArIDQwKTtcclxuICAgIH1cclxuICAgIGN0eC5jbG9zZVBhdGgoKTtcclxufTtcclxuXHJcblxyXG5mdW5jdGlvbiBpbkJvdW5kc0Nsb3NlKHBsYXllciwgeCwgeSkge1xyXG4gICAgdmFyIHJhbmdlID0gMTUwO1xyXG4gICAgcmV0dXJuIHggPCAocGxheWVyLnggKyByYW5nZSkgJiYgeCA+IChwbGF5ZXIueCAtIDUgLyA0ICogcmFuZ2UpXHJcbiAgICAgICAgJiYgeSA8IChwbGF5ZXIueSArIHJhbmdlKSAmJiB5ID4gKHBsYXllci55IC0gNSAvIDQgKiByYW5nZSk7XHJcbn1cclxuIiwiZnVuY3Rpb24gTGFzZXIobGFzZXJJbmZvLCBjbGllbnQpIHtcclxuICAgIHRoaXMuaWQgPSBsYXNlckluZm8uaWQ7XHJcbiAgICB0aGlzLm93bmVyID0gbGFzZXJJbmZvLm93bmVyO1xyXG4gICAgdGhpcy50YXJnZXQgPSBsYXNlckluZm8udGFyZ2V0O1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5MYXNlci5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5kcmFmdEN0eDtcclxuICAgIHZhciB0YXJnZXQgPSB0aGlzLmNsaWVudC5DT05UUk9MTEVSX0xJU1RbdGhpcy50YXJnZXRdO1xyXG4gICAgdmFyIG93bmVyID0gdGhpcy5jbGllbnQuQ09OVFJPTExFUl9MSVNUW3RoaXMub3duZXJdO1xyXG5cclxuICAgIGlmICh0YXJnZXQgJiYgb3duZXIpIHtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4Lm1vdmVUbyhvd25lci54LCBvd25lci55KTtcclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcIiM5MTIyMjJcIjtcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gMTA7XHJcbiAgICAgICAgY3R4LmxpbmVUbyh0YXJnZXQueCwgdGFyZ2V0LnkpO1xyXG4gICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTGFzZXI7IiwiZnVuY3Rpb24gTWluaU1hcCgpIHtcclxufVxyXG5cclxuTWluaU1hcC5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGlmIChtYXBUaW1lciA8PSAwIHx8IHNlcnZlck1hcCA9PT0gbnVsbCkge1xyXG4gICAgICAgIHZhciB0aWxlTGVuZ3RoID0gTWF0aC5zcXJ0KE9iamVjdC5zaXplKFRJTEVfTElTVCkpO1xyXG4gICAgICAgIGlmICh0aWxlTGVuZ3RoID09PSAwIHx8ICFzZWxmUGxheWVyKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGltZ0RhdGEgPSBtYWluQ3R4LmNyZWF0ZUltYWdlRGF0YSh0aWxlTGVuZ3RoLCB0aWxlTGVuZ3RoKTtcclxuICAgICAgICB2YXIgdGlsZTtcclxuICAgICAgICB2YXIgdGlsZVJHQjtcclxuICAgICAgICB2YXIgaSA9IDA7XHJcblxyXG5cclxuICAgICAgICBmb3IgKHZhciBpZCBpbiBUSUxFX0xJU1QpIHtcclxuICAgICAgICAgICAgdGlsZVJHQiA9IHt9O1xyXG4gICAgICAgICAgICB0aWxlID0gVElMRV9MSVNUW2lkXTtcclxuICAgICAgICAgICAgaWYgKHRpbGUuY29sb3IgJiYgdGlsZS5hbGVydCB8fCBpbkJvdW5kcyhzZWxmUGxheWVyLCB0aWxlLngsIHRpbGUueSkpIHtcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuciA9IHRpbGUuY29sb3IucjtcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuZyA9IHRpbGUuY29sb3IuZztcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuYiA9IHRpbGUuY29sb3IuYjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuciA9IDA7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLmcgPSAwO1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5iID0gMDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2ldID0gdGlsZVJHQi5yO1xyXG4gICAgICAgICAgICBpbWdEYXRhLmRhdGFbaSArIDFdID0gdGlsZVJHQi5nO1xyXG4gICAgICAgICAgICBpbWdEYXRhLmRhdGFbaSArIDJdID0gdGlsZVJHQi5iO1xyXG4gICAgICAgICAgICBpbWdEYXRhLmRhdGFbaSArIDNdID0gMjU1O1xyXG4gICAgICAgICAgICBpICs9IDQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnNvbGUubG9nKDQwMCAvIE9iamVjdC5zaXplKFRJTEVfTElTVCkpO1xyXG4gICAgICAgIGltZ0RhdGEgPSBzY2FsZUltYWdlRGF0YShpbWdEYXRhLCBNYXRoLmZsb29yKDQwMCAvIE9iamVjdC5zaXplKFRJTEVfTElTVCkpLCBtYWluQ3R4KTtcclxuXHJcbiAgICAgICAgbU1hcEN0eC5wdXRJbWFnZURhdGEoaW1nRGF0YSwgMCwgMCk7XHJcblxyXG4gICAgICAgIG1NYXBDdHhSb3Qucm90YXRlKDkwICogTWF0aC5QSSAvIDE4MCk7XHJcbiAgICAgICAgbU1hcEN0eFJvdC5zY2FsZSgxLCAtMSk7XHJcbiAgICAgICAgbU1hcEN0eFJvdC5kcmF3SW1hZ2UobU1hcCwgMCwgMCk7XHJcbiAgICAgICAgbU1hcEN0eFJvdC5zY2FsZSgxLCAtMSk7XHJcbiAgICAgICAgbU1hcEN0eFJvdC5yb3RhdGUoMjcwICogTWF0aC5QSSAvIDE4MCk7XHJcblxyXG4gICAgICAgIHNlcnZlck1hcCA9IG1NYXBSb3Q7XHJcbiAgICAgICAgbWFwVGltZXIgPSAyNTtcclxuICAgIH1cclxuXHJcbiAgICBlbHNlIHtcclxuICAgICAgICBtYXBUaW1lciAtPSAxO1xyXG4gICAgfVxyXG5cclxuICAgIG1haW5DdHguZHJhd0ltYWdlKHNlcnZlck1hcCwgODAwLCA0MDApO1xyXG59OyAvL2RlcHJlY2F0ZWRcclxuXHJcbk1pbmlNYXAucHJvdG90eXBlLnNjYWxlSW1hZ2VEYXRhID0gZnVuY3Rpb24gKGltYWdlRGF0YSwgc2NhbGUsIG1haW5DdHgpIHtcclxuICAgIHZhciBzY2FsZWQgPSBtYWluQ3R4LmNyZWF0ZUltYWdlRGF0YShpbWFnZURhdGEud2lkdGggKiBzY2FsZSwgaW1hZ2VEYXRhLmhlaWdodCAqIHNjYWxlKTtcclxuICAgIHZhciBzdWJMaW5lID0gbWFpbkN0eC5jcmVhdGVJbWFnZURhdGEoc2NhbGUsIDEpLmRhdGE7XHJcbiAgICBmb3IgKHZhciByb3cgPSAwOyByb3cgPCBpbWFnZURhdGEuaGVpZ2h0OyByb3crKykge1xyXG4gICAgICAgIGZvciAodmFyIGNvbCA9IDA7IGNvbCA8IGltYWdlRGF0YS53aWR0aDsgY29sKyspIHtcclxuICAgICAgICAgICAgdmFyIHNvdXJjZVBpeGVsID0gaW1hZ2VEYXRhLmRhdGEuc3ViYXJyYXkoXHJcbiAgICAgICAgICAgICAgICAocm93ICogaW1hZ2VEYXRhLndpZHRoICsgY29sKSAqIDQsXHJcbiAgICAgICAgICAgICAgICAocm93ICogaW1hZ2VEYXRhLndpZHRoICsgY29sKSAqIDQgKyA0XHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIGZvciAodmFyIHggPSAwOyB4IDwgc2NhbGU7IHgrKykgc3ViTGluZS5zZXQoc291cmNlUGl4ZWwsIHggKiA0KVxyXG4gICAgICAgICAgICBmb3IgKHZhciB5ID0gMDsgeSA8IHNjYWxlOyB5KyspIHtcclxuICAgICAgICAgICAgICAgIHZhciBkZXN0Um93ID0gcm93ICogc2NhbGUgKyB5O1xyXG4gICAgICAgICAgICAgICAgdmFyIGRlc3RDb2wgPSBjb2wgKiBzY2FsZTtcclxuICAgICAgICAgICAgICAgIHNjYWxlZC5kYXRhLnNldChzdWJMaW5lLCAoZGVzdFJvdyAqIHNjYWxlZC53aWR0aCArIGRlc3RDb2wpICogNClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gc2NhbGVkO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNaW5pTWFwOyIsImZ1bmN0aW9uIFNoYXJkKHRoaXNJbmZvLCBjbGllbnQpIHtcclxuICAgIHRoaXMuaWQgPSB0aGlzSW5mby5pZDtcclxuICAgIHRoaXMueCA9IHRoaXNJbmZvLng7XHJcbiAgICB0aGlzLnkgPSB0aGlzSW5mby55O1xyXG4gICAgdGhpcy5uYW1lID0gdGhpc0luZm8ubmFtZTtcclxuICAgIHRoaXMudmlzaWJsZSA9IHRoaXNJbmZvLnZpc2libGU7XHJcblxyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbn1cclxuXHJcblNoYXJkLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAodGhpc0luZm8pIHtcclxuICAgIHRoaXMueCA9IHRoaXNJbmZvLng7XHJcbiAgICB0aGlzLnkgPSB0aGlzSW5mby55O1xyXG4gICAgdGhpcy52aXNpYmxlID0gdGhpc0luZm8udmlzaWJsZTtcclxuICAgIHRoaXMubmFtZSA9IHRoaXNJbmZvLm5hbWU7XHJcbn07XHJcblxyXG5cclxuU2hhcmQucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgY3R4ID0gdGhpcy5jbGllbnQuZHJhZnRDdHg7XHJcbiAgICBjdHgubGluZVdpZHRoID0gMjtcclxuXHJcbiAgICBpZiAodGhpcy52aXNpYmxlKSB7XHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGlmICh0aGlzLm5hbWUgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgY3R4LmZvbnQgPSBcIjMwcHggQXJpYWxcIjtcclxuICAgICAgICAgICAgY3R4LmZpbGxUZXh0KHRoaXMubmFtZSwgdGhpcy54LCB0aGlzLnkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2JhKDEwMCwgMjU1LCAyMjcsIDAuMSlcIjtcclxuICAgICAgICBjdHguYXJjKHRoaXMueCwgdGhpcy55LCAyMCwgMCwgMiAqIE1hdGguUEksIGZhbHNlKTtcclxuICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuXHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcIiNkZmZmNDJcIjtcclxuXHJcbiAgICAgICAgdmFyIHJhZGl1cyA9IDEwLCBpO1xyXG4gICAgICAgIHZhciBzdGFydFRoZXRhID0gZ2V0UmFuZG9tKDAsIDAuMik7XHJcbiAgICAgICAgdmFyIHRoZXRhID0gMDtcclxuICAgICAgICB2YXIgc3RhcnRYID0gcmFkaXVzICogTWF0aC5jb3Moc3RhcnRUaGV0YSk7XHJcbiAgICAgICAgdmFyIHN0YXJ0WSA9IHJhZGl1cyAqIE1hdGguc2luKHN0YXJ0VGhldGEpO1xyXG4gICAgICAgIGN0eC5tb3ZlVG8odGhpcy54ICsgc3RhcnRYLCB0aGlzLnkgKyBzdGFydFkpO1xyXG4gICAgICAgIGZvciAoaSA9IE1hdGguUEkgLyAyOyBpIDw9IDIgKiBNYXRoLlBJIC0gTWF0aC5QSSAvIDI7IGkgKz0gTWF0aC5QSSAvIDIpIHtcclxuICAgICAgICAgICAgdGhldGEgPSBzdGFydFRoZXRhICsgaSArIGdldFJhbmRvbSgtMSAvIDI0LCAxIC8gMjQpO1xyXG4gICAgICAgICAgICB2YXIgeCA9IHJhZGl1cyAqIE1hdGguY29zKHRoZXRhKTtcclxuICAgICAgICAgICAgdmFyIHkgPSByYWRpdXMgKiBNYXRoLnNpbih0aGV0YSk7XHJcbiAgICAgICAgICAgIGN0eC5saW5lVG8odGhpcy54ICsgeCwgdGhpcy55ICsgeSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGN0eC5saW5lVG8odGhpcy54ICsgc3RhcnRYLCB0aGlzLnkgKyBzdGFydFkpO1xyXG4gICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5mdW5jdGlvbiBnZXRSYW5kb20obWluLCBtYXgpIHtcclxuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikgKyBtaW47XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU2hhcmQ7IiwiZnVuY3Rpb24gVGlsZSh0aGlzSW5mbywgY2xpZW50KSB7XHJcbiAgICB0aGlzLmlkID0gdGhpc0luZm8uaWQ7XHJcbiAgICB0aGlzLnggPSB0aGlzSW5mby54O1xyXG4gICAgdGhpcy55ID0gdGhpc0luZm8ueTtcclxuICAgIHRoaXMubGVuZ3RoID0gdGhpc0luZm8ubGVuZ3RoO1xyXG4gICAgdGhpcy5jb2xvciA9IHRoaXNJbmZvLmNvbG9yO1xyXG4gICAgdGhpcy5hbGVydCA9IHRoaXNJbmZvLmFsZXJ0O1xyXG4gICAgdGhpcy5yYW5kb20gPSBNYXRoLmZsb29yKGdldFJhbmRvbSgwLCAzKSk7XHJcblxyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbn1cclxuXHJcblRpbGUucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICh0aGlzSW5mbykge1xyXG4gICAgdGhpcy5jb2xvciA9IHRoaXNJbmZvLmNvbG9yO1xyXG4gICAgdGhpcy5hbGVydCA9IHRoaXNJbmZvLmFsZXJ0O1xyXG59O1xyXG5cclxuVGlsZS5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5kcmFmdEN0eDtcclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgIGN0eC5maWxsU3R5bGUgPSBcInJnYihcIiArXHJcbiAgICAgICAgdGhpcy5jb2xvci5yICsgXCIsXCIgK1xyXG4gICAgICAgIHRoaXMuY29sb3IuZyArIFwiLFwiICtcclxuICAgICAgICB0aGlzLmNvbG9yLmIgK1xyXG4gICAgICAgIFwiKVwiO1xyXG5cclxuICAgIGN0eC5saW5lV2lkdGggPSAxNTtcclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiIzFlMmEyYlwiO1xyXG5cclxuICAgIGN0eC5yZWN0KHRoaXMueCwgdGhpcy55LCB0aGlzLmxlbmd0aCwgdGhpcy5sZW5ndGgpO1xyXG4gICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgY3R4LmZpbGwoKTtcclxufTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFRpbGU7XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0UmFuZG9tKG1pbiwgbWF4KSB7XHJcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pICsgbWluO1xyXG59IiwibW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgICBBbmltYXRpb246IHJlcXVpcmUoJy4vQW5pbWF0aW9uJyksXHJcbiAgICBBcnJvdzogcmVxdWlyZSgnLi9BcnJvdycpLFxyXG4gICAgQnJhY2tldDogcmVxdWlyZSgnLi9CcmFja2V0JyksXHJcbiAgICBDb250cm9sbGVyOiByZXF1aXJlKCcuL0NvbnRyb2xsZXInKSxcclxuICAgIEZhY3Rpb246IHJlcXVpcmUoJy4vRmFjdGlvbicpLFxyXG4gICAgSG9tZTogcmVxdWlyZSgnLi9Ib21lJyksXHJcbiAgICBMYXNlcjogcmVxdWlyZSgnLi9MYXNlcicpLFxyXG4gICAgTWluaU1hcDogcmVxdWlyZSgnLi9NaW5pTWFwJyksXHJcbiAgICBTaGFyZDogcmVxdWlyZSgnLi9TaGFyZCcpLFxyXG4gICAgVGlsZTogcmVxdWlyZSgnLi9UaWxlJylcclxufTsiLCJ2YXIgQ2xpZW50ID0gcmVxdWlyZSgnLi9DbGllbnQuanMnKTtcclxudmFyIE1haW5VSSA9IHJlcXVpcmUoJy4vdWkvTWFpblVJJyk7XHJcblxyXG52YXIgY2xpZW50ID0gbmV3IENsaWVudCgpO1xyXG5cclxuXHJcblxyXG5cclxuXHJcbmRvY3VtZW50Lm9ua2V5ZG93biA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgY2xpZW50LmtleXNbZXZlbnQua2V5Q29kZV0gPSB0cnVlO1xyXG4gICAgY2xpZW50LnNvY2tldC5lbWl0KCdrZXlFdmVudCcsIHtpZDogZXZlbnQua2V5Q29kZSwgc3RhdGU6IHRydWV9KTtcclxufTtcclxuXHJcbmRvY3VtZW50Lm9ua2V5dXAgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGNsaWVudC5rZXlzW2V2ZW50LmtleUNvZGVdID0gZmFsc2U7XHJcbiAgICBjbGllbnQuc29ja2V0LmVtaXQoJ2tleUV2ZW50Jywge2lkOiBldmVudC5rZXlDb2RlLCBzdGF0ZTogZmFsc2V9KTtcclxufTtcclxuXHJcbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NvbnRleHRtZW51JywgZnVuY3Rpb24gKGUpIHsgLy9wcmV2ZW50IHJpZ2h0LWNsaWNrIGNvbnRleHQgbWVudVxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG59LCBmYWxzZSk7IiwiZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLm92ZXJmbG93ID0gJ2hpZGRlbic7ICAvLyBmaXJlZm94LCBjaHJvbWVcclxuZG9jdW1lbnQuYm9keS5zY3JvbGwgPSBcIm5vXCI7XHJcbnZhciBQbGF5ZXJOYW1lclVJID0gcmVxdWlyZSgnLi9QbGF5ZXJOYW1lclVJJyk7XHJcbnZhciBTaGFyZE5hbWVyVUkgPSByZXF1aXJlKCcuL1NoYXJkTmFtZXJVSScpO1xyXG52YXIgR2FtZVVJID0gcmVxdWlyZSgnLi9nYW1lL0dhbWVVSScpO1xyXG52YXIgSG9tZVVJID0gcmVxdWlyZShcIi4vaG9tZS9Ib21lVUlcIik7XHJcblxyXG5mdW5jdGlvbiBNYWluVUkoY2xpZW50LCBzb2NrZXQpIHtcclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XHJcblxyXG4gICAgY29uc29sZS5sb2codGhpcy5zb2NrZXQpO1xyXG5cclxuXHJcbiAgICB0aGlzLnBsYXllck5hbWVyVUkgPSBuZXcgUGxheWVyTmFtZXJVSSh0aGlzLmNsaWVudCwgdGhpcy5zb2NrZXQpO1xyXG4gICAgdGhpcy5nYW1lVUkgPSBuZXcgR2FtZVVJKHRoaXMuY2xpZW50LCB0aGlzLnNvY2tldCk7XHJcbiAgICB0aGlzLnNoYXJkTmFtZXJVSSA9IG5ldyBTaGFyZE5hbWVyVUkodGhpcy5jbGllbnQsIHRoaXMuc29ja2V0KTtcclxuICAgIHRoaXMuaG9tZVVJID0gbmV3IEhvbWVVSSh0aGlzLmNsaWVudCwgdGhpcy5zb2NrZXQpO1xyXG59XHJcblxyXG5NYWluVUkucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoaW5mbykge1xyXG4gICAgdmFyIGFjdGlvbiA9IGluZm8uYWN0aW9uO1xyXG4gICAgdmFyIGhvbWU7XHJcblxyXG4gICAgaWYgKGFjdGlvbiA9PT0gXCJuYW1lIHNoYXJkXCIpIHtcclxuICAgICAgICB0aGlzLnNoYXJkTmFtZXJVSS5vcGVuKCk7XHJcbiAgICB9XHJcbiAgICBpZiAoYWN0aW9uID09PSBcImhvbWUgaW5mb1wiKSB7XHJcbiAgICAgICAgaG9tZSA9IHRoaXMuY2xpZW50LkhPTUVfTElTVFtpbmZvLmhvbWVJZF07XHJcbiAgICAgICAgdGhpcy5ob21lVUkub3Blbihob21lKTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5NYWluVUkucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKGFjdGlvbikge1xyXG4gICAgaWYgKGFjdGlvbiA9PT0gXCJuYW1lIHNoYXJkXCIpIHtcclxuICAgICAgICB0aGlzLnNoYXJkTmFtZXJVSS5jbG9zZSgpO1xyXG4gICAgfVxyXG4gICAgaWYgKGFjdGlvbiA9PT0gXCJob21lIGluZm9cIikge1xyXG4gICAgICAgIHRoaXMuTElTVF9TQ1JPTEwgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLmhvbWVVSS5jbG9zZSgpO1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJyZW1vdmVWaWV3ZXJcIiwge30pO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbk1haW5VSS5wcm90b3R5cGUudXBkYXRlTGVhZGVyQm9hcmQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgbGVhZGVyYm9hcmQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImxlYWRlcmJvYXJkXCIpO1xyXG4gICAgbGVhZGVyYm9hcmQuaW5uZXJIVE1MID0gXCJcIjtcclxuICAgIGZvciAodmFyIGkgPSBGQUNUSU9OX0FSUkFZLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcbiAgICAgICAgdmFyIGZhY3Rpb24gPSBGQUNUSU9OX0FSUkFZW2ldO1xyXG5cclxuICAgICAgICB2YXIgZW50cnkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xyXG4gICAgICAgIGVudHJ5LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGZhY3Rpb24ubmFtZSkpO1xyXG4gICAgICAgIGxlYWRlcmJvYXJkLmFwcGVuZENoaWxkKGVudHJ5KTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5cclxuXHJcbi8qKiBERVBSRUNBVEVEIE1FVEhPRFMgKiovXHJcbk1haW5VSS5wcm90b3R5cGUudXBkYXRlVUkgPSBmdW5jdGlvbiAoaW5mbykge1xyXG4gICAgdmFyIGFjdGlvbiA9IGluZm8uYWN0aW9uO1xyXG4gICAgdmFyIGhvbWU7XHJcbiAgICBpZiAoYWN0aW9uID09PSBcInVwZGF0ZSBxdWV1ZVwiKSB7XHJcbiAgICAgICAgdmFyIGJ1aWxkUXVldWUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnVpbGRfcXVldWUnKTtcclxuICAgICAgICBob21lID0gdGhpcy5jbGllbnQuSE9NRV9MSVNUW2luZm8uaG9tZUlkXTtcclxuICAgICAgICBhZGRRdWV1ZUluZm8oYnVpbGRRdWV1ZSwgaG9tZSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTWFpblVJOyIsImZ1bmN0aW9uIFBsYXllck5hbWVyVUkgKGNsaWVudCwgc29ja2V0KSB7XHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxuICAgIHRoaXMuc29ja2V0ID0gc29ja2V0O1xyXG5cclxuICAgIHRoaXMubGVhZGVyYm9hcmQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImxlYWRlcmJvYXJkX2NvbnRhaW5lclwiKTtcclxuICAgIHRoaXMubmFtZUJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibmFtZVN1Ym1pdFwiKTtcclxuICAgIHRoaXMucGxheWVyTmFtZUlucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwbGF5ZXJOYW1lSW5wdXRcIik7XHJcbiAgICB0aGlzLmZhY3Rpb25OYW1lSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImZhY3Rpb25OYW1lSW5wdXRcIik7XHJcbiAgICB0aGlzLnBsYXllck5hbWVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwbGF5ZXJfbmFtZXJcIik7XHJcbn1cclxuXHJcblBsYXllck5hbWVyVUkucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgdGhpcy5wbGF5ZXJOYW1lSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDEzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZmFjdGlvbk5hbWVJbnB1dC5mb2N1cygpO1xyXG4gICAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG4gICAgdGhpcy5mYWN0aW9uTmFtZUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSAxMykge1xyXG4gICAgICAgICAgICB0aGlzLm5hbWVCdG4uY2xpY2soKTtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMubmFtZUJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuY2xpZW50Lm1haW5DYW52YXMuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgICAgIHRoaXMubGVhZGVyYm9hcmQuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJuZXdQbGF5ZXJcIixcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogdGhpcy5wbGF5ZXJOYW1lSW5wdXQudmFsdWUsXHJcbiAgICAgICAgICAgICAgICBmYWN0aW9uOiB0aGlzLmZhY3Rpb25OYW1lSW5wdXQudmFsdWVcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5wbGF5ZXJOYW1lci5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICB0aGlzLnBsYXllck5hbWVyLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgIHRoaXMucGxheWVyTmFtZUlucHV0LmZvY3VzKCk7XHJcbiAgICB0aGlzLmxlYWRlcmJvYXJkLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBQbGF5ZXJOYW1lclVJOyIsInZhciB1aSA9IHJlcXVpcmUoJy4vU2hhcmROYW1lclVJJyk7XHJcblxyXG5mdW5jdGlvbiBTaGFyZE5hbWVyVUkoY2xpZW50LCBzb2NrZXQpIHtcclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XHJcblxyXG4gICAgdGhpcy5zaGFyZE5hbWVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NoYXJkX25hbWVyX3VpJyk7XHJcbiAgICB0aGlzLnRleHRJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidGV4dElucHV0XCIpO1xyXG4gICAgdGhpcy5uYW1lU2hhcmRCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm5hbWVTaGFyZEJ0blwiKTtcclxufVxyXG5cclxuU2hhcmROYW1lclVJLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHNoYXJkTmFtZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2hhcmRfbmFtZXJfdWknKTtcclxuICAgIHZhciB0ZXh0SW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInRleHRJbnB1dFwiKTtcclxuICAgIHZhciBuYW1lU2hhcmRCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm5hbWVTaGFyZEJ0blwiKTtcclxuXHJcbiAgICBzaGFyZE5hbWVyLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xyXG5cclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCB0aGlzLmZvY3VzVGV4dElucHV0KTtcclxuXHJcbiAgICB0ZXh0SW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDEzKSB7XHJcbiAgICAgICAgICAgIHZhciB0ZXh0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0ZXh0SW5wdXRcIikudmFsdWU7XHJcbiAgICAgICAgICAgIGlmICh0ZXh0ICE9PSBudWxsICYmIHRleHQgIT09IFwiXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc29ja2V0LmVtaXQoJ3RleHRJbnB1dCcsXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogc2VsZklkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3b3JkOiB0ZXh0XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHVpLmNsb3NlVUkoXCJuYW1lIHNoYXJkXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59O1xyXG5cclxuU2hhcmROYW1lclVJLnByb3RvdHlwZS5mb2N1c1RleHRJbnB1dCA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgIGlmIChldmVudC5rZXlDb2RlID09PSAxMykge1xyXG4gICAgICAgIHRleHRJbnB1dC5mb2N1cygpO1xyXG4gICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCBmb2N1c1RleHRJbnB1dCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5TaGFyZE5hbWVyVUkucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy50ZXh0SW5wdXQudmFsdWUgPSBcIlwiO1xyXG4gICAgdGhpcy50ZW1wbGF0ZS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTaGFyZE5hbWVyVUk7XHJcbiIsImZ1bmN0aW9uIEdhbWVVSSgpIHtcclxuXHJcbn1cclxuXHJcbkdhbWVVSS5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBzaGFyZE5hbWVyUHJvbXB0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NoYXJkX25hbWVyX3Byb21wdCcpO1xyXG4gICAgc2hhcmROYW1lclByb21wdC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIG9wZW5TaGFyZE5hbWVyVUkoKTtcclxuICAgIH0pO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSAgR2FtZVVJOyIsInZhciBMaXN0VUkgPSByZXF1aXJlKCcuL0xpc3RVSScpO1xyXG5cclxuZnVuY3Rpb24gQm90c1BhZ2UoaG9tZVVJKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJib3RzX3BhZ2VcIik7XHJcbiAgICB0aGlzLmJvdHNMaXN0VUkgPSBuZXcgTGlzdFVJKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdib3RzX2xpc3QnKSwgaG9tZVVJKTtcclxuICAgIHRoaXMuaG9tZVVJID0gaG9tZVVJO1xyXG59XHJcblxyXG5Cb3RzUGFnZS5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcclxuICAgIGlmICh0aGlzLmhvbWVVSS5ob21lLnR5cGUgPT09IFwiQmFycmFja3NcIikge1xyXG4gICAgICAgIHRoaXMuYm90c0xpc3RVSS5hZGRCb3RzKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5Cb3RzUGFnZS5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxufTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEJvdHNQYWdlO1xyXG5cclxuIiwidmFyIExpc3RVSSA9IHJlcXVpcmUoJy4vTGlzdFVJJyk7XHJcblxyXG5cclxuZnVuY3Rpb24gQnVpbGRQYWdlKGhvbWVVSSkge1xyXG4gICAgdGhpcy50ZW1wbGF0ZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY3JlYXRlX3BhZ2VcIik7XHJcbiAgICB0aGlzLmNyZWF0ZUJvdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY3JlYXRlX2JvdF9jb250YWluZXJcIik7XHJcbiAgICB0aGlzLm1ha2VCb3RzQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21ha2VfYm90c19idG4nKTtcclxuICAgIHRoaXMuc29ja2V0ID0gaG9tZVVJLnNvY2tldDtcclxuXHJcbiAgICB0aGlzLlNFTEVDVEVEX1NIQVJEUyA9IHt9O1xyXG5cclxuICAgIHRoaXMuYnVpbGRRdWV1ZVVJID0gbmV3IExpc3RVSShkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnVpbGRfcXVldWUnKSwgaG9tZVVJKTtcclxuICAgIHRoaXMuc2hhcmRzVUkgPSBuZXcgTGlzdFVJKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdidWlsZF9zaGFyZHNfbGlzdCcpLCBob21lVUksIHRoaXMpO1xyXG4gICAgdGhpcy5ob21lVUkgPSBob21lVUk7XHJcbn1cclxuXHJcblxyXG5CdWlsZFBhZ2UucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcblxyXG4gICAgdGhpcy5TRUxFQ1RFRF9TSEFSRFMgPSB7fTtcclxuXHJcbiAgICB2YXIgbWFrZUJvdHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQuZW1pdCgnbWFrZUJvdHMnLCB7XHJcbiAgICAgICAgICAgIGhvbWU6IHRoaXMuaG9tZS5pZCxcclxuICAgICAgICAgICAgc2hhcmRzOiB0aGlzLlNFTEVDVEVEX1NIQVJEU1xyXG4gICAgICAgIH0pO1xyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG5cclxuICAgIGlmICh0aGlzLmhvbWVVSS5ob21lLnR5cGUgPT09IFwiQmFycmFja3NcIikge1xyXG4gICAgICAgIHRoaXMuaG9tZVVJLnJlc2V0QnV0dG9uKHRoaXMubWFrZUJvdHNCdG4sIG1ha2VCb3RzKTtcclxuICAgICAgICB0aGlzLmNyZWF0ZUJvdC5zdHlsZS5kaXNwbGF5ID0gXCJmbGV4XCI7XHJcbiAgICAgICAgdGhpcy5idWlsZFF1ZXVlVUkuYWRkUXVldWUodGhpcy5ob21lVUkuaG9tZSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMuY3JlYXRlQm90LnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuICAgIH1cclxuICAgIHRoaXMuc2hhcmRzVUkuYWRkU2hhcmRzKCk7XHJcbn07XHJcblxyXG5CdWlsZFBhZ2UucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy50ZW1wbGF0ZS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcbn07XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBCdWlsZFBhZ2U7XHJcblxyXG4iLCJ2YXIgVXBncmFkZXNQYWdlID0gcmVxdWlyZSgnLi9VcGdyYWRlc1BhZ2UnKTtcclxudmFyIEJvdHNQYWdlID0gcmVxdWlyZSgnLi9Cb3RzUGFnZScpO1xyXG52YXIgQnVpbGRQYWdlID0gcmVxdWlyZSgnLi9CdWlsZFBhZ2UnKTtcclxuXHJcbmZ1bmN0aW9uIEhvbWVVSShjbGllbnQsIHNvY2tldCkge1xyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbiAgICB0aGlzLnNvY2tldCA9IHNvY2tldDtcclxuICAgIHRoaXMudGVtcGxhdGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaG9tZV91aScpO1xyXG4gICAgdGhpcy5ob21lID0gbnVsbDtcclxufVxyXG5cclxuSG9tZVVJLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKGhvbWUpIHtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XHJcbiAgICB0aGlzLmhvbWUgPSBob21lO1xyXG5cclxuICAgIGlmICghdGhpcy51cGdyYWRlc1BhZ2UpIHtcclxuICAgICAgICB0aGlzLnVwZ3JhZGVzUGFnZSA9IG5ldyBVcGdyYWRlc1BhZ2UodGhpcyk7XHJcbiAgICAgICAgdGhpcy5ib3RzUGFnZSA9IG5ldyBCb3RzUGFnZSh0aGlzKTtcclxuICAgICAgICB0aGlzLmJ1aWxkUGFnZSA9IG5ldyBCdWlsZFBhZ2UodGhpcyk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkVGFiTGlzdGVuZXJzKCk7XHJcbiAgICAgICAgdGhpcy5hZGRDbG9zZUxpc3RlbmVyKCk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5vcGVuSG9tZUluZm8oKTtcclxuICAgIHRoaXMudXBncmFkZXNQYWdlLm9wZW4oKTtcclxuICAgIC8vdGhpcy5vcGVuQ29sb3JQaWNrZXIoaG9tZSk7XHJcbn07XHJcblxyXG5Ib21lVUkucHJvdG90eXBlLm9wZW5Ib21lSW5mbyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdob21lX3R5cGUnKS5pbm5lckhUTUwgPSB0aGlzLmhvbWUudHlwZTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdob21lX2xldmVsJykuaW5uZXJIVE1MID0gdGhpcy5ob21lLmxldmVsO1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2hvbWVfaGVhbHRoJykuaW5uZXJIVE1MID0gdGhpcy5ob21lLmhlYWx0aDtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdob21lX3Bvd2VyJykuaW5uZXJIVE1MID0gdGhpcy5ob21lLnBvd2VyO1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2hvbWVfZmFjdGlvbl9uYW1lJykuaW5uZXJIVE1MID0gdGhpcy5ob21lLmZhY3Rpb247XHJcbn07XHJcblxyXG5Ib21lVUkucHJvdG90eXBlLm9wZW5Db2xvclBpY2tlciA9IGZ1bmN0aW9uIChob21lKSB7XHJcbiAgICB2YXIgY29sb3JQaWNrZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNvbG9yX3BpY2tlclwiKTtcclxuICAgIHZhciBjb2xvckNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY29sb3JfY2FudmFzXCIpO1xyXG4gICAgdmFyIGNvbG9yQ3R4ID0gY29sb3JDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG5cclxuICAgIGNvbG9yQ2FudmFzLndpZHRoID0gMTAwO1xyXG4gICAgY29sb3JDYW52YXMuaGVpZ2h0ID0gMTAwO1xyXG5cclxuICAgIGlmICghaG9tZS5oYXNDb2xvciAmJiBob21lLmxldmVsID4gMSkge1xyXG4gICAgICAgIGNvbG9yUGlja2VyLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBjb2xvclBpY2tlci5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdmFyIGNvbG9ycyA9IG5ldyBJbWFnZSgpO1xyXG4gICAgY29sb3JzLnNyYyA9ICdjb2xvcnMuanBnJztcclxuICAgIGNvbG9ycy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgY29sb3JDdHguZmlsbFN0eWxlID0gXCIjMzMzZWVlXCI7XHJcbiAgICAgICAgY29sb3JDdHguZmlsbFJlY3QoMCwgMCwgY29sb3JDYW52YXMud2lkdGggLyAyLCBjb2xvckNhbnZhcy5oZWlnaHQgLyAyKTtcclxuICAgICAgICBjb2xvckN0eC5maWxsU3R5bGUgPSBcIiM2MjNlZWVcIjtcclxuICAgICAgICBjb2xvckN0eC5maWxsUmVjdChjb2xvckNhbnZhcy53aWR0aCAvIDIsIGNvbG9yQ2FudmFzLmhlaWdodCAvIDIsIGNvbG9yQ2FudmFzLndpZHRoLCBjb2xvckNhbnZhcy5oZWlnaHQpO1xyXG4gICAgfTtcclxuXHJcbiAgICBjb2xvckNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgdmFyIHJlY3QgPSBjb2xvckNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICB2YXIgeCA9IGV2ZW50LmNsaWVudFggLSByZWN0LmxlZnQ7XHJcbiAgICAgICAgdmFyIHkgPSBldmVudC5jbGllbnRZIC0gcmVjdC50b3A7XHJcbiAgICAgICAgdmFyIGltZ19kYXRhID0gY29sb3JDdHguZ2V0SW1hZ2VEYXRhKHgsIHksIDEwMCwgMTAwKS5kYXRhO1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJuZXdDb2xvclwiLCB7XHJcbiAgICAgICAgICAgIGhvbWU6IGhvbWUuaWQsXHJcbiAgICAgICAgICAgIGNvbG9yOiB7XHJcbiAgICAgICAgICAgICAgICByOiBpbWdfZGF0YVswXSxcclxuICAgICAgICAgICAgICAgIGc6IGltZ19kYXRhWzFdLFxyXG4gICAgICAgICAgICAgICAgYjogaW1nX2RhdGFbMl1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxufTtcclxuXHJcbkhvbWVVSS5wcm90b3R5cGUuYWRkVGFiTGlzdGVuZXJzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHVwZ3JhZGVzVGFiID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3VwZ3JhZGVzX3RhYicpO1xyXG4gICAgdmFyIGNyZWF0ZVRhYiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjcmVhdGVfdGFiJyk7XHJcbiAgICB2YXIgYm90c1RhYiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdib3RzX3RhYicpO1xyXG5cclxuICAgIHVwZ3JhZGVzVGFiLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGV2dCkge1xyXG4gICAgICAgIHRoaXMudXBncmFkZXNQYWdlLm9wZW4oKTtcclxuICAgICAgICB0aGlzLmJ1aWxkUGFnZS5jbG9zZSgpO1xyXG4gICAgICAgIHRoaXMuYm90c1BhZ2UuY2xvc2UoKTtcclxuXHJcbiAgICAgICAgY29uc29sZS5sb2codGhpcy5ib3RzUGFnZSk7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIGNyZWF0ZVRhYi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChldnQpIHtcclxuICAgICAgICB0aGlzLnVwZ3JhZGVzUGFnZS5jbG9zZSgpO1xyXG4gICAgICAgIHRoaXMuYnVpbGRQYWdlLm9wZW4oKTtcclxuICAgICAgICB0aGlzLmJvdHNQYWdlLmNsb3NlKCk7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIGJvdHNUYWIuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZXZ0KSB7XHJcbiAgICAgICAgdGhpcy51cGdyYWRlc1BhZ2UuY2xvc2UoKTtcclxuICAgICAgICB0aGlzLmJ1aWxkUGFnZS5jbG9zZSgpO1xyXG4gICAgICAgIHRoaXMuYm90c1BhZ2Uub3BlbigpO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxufTtcclxuXHJcbkhvbWVVSS5wcm90b3R5cGUuYWRkQ2xvc2VMaXN0ZW5lciA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjbG9zZUJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY2xvc2VfaG9tZV91aVwiKTtcclxuICAgIGNsb3NlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5jbGllbnQubWFpblVJLmNsb3NlKFwiaG9tZSBpbmZvXCIpO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxufTtcclxuXHJcbkhvbWVVSS5wcm90b3R5cGUucmVzZXRCdXR0b24gPSBmdW5jdGlvbiAoYnV0dG9uLCBjYWxsYmFjaykge1xyXG4gICAgdmFyIHNldFNraWxsTWV0ZXIgPSBmdW5jdGlvbiAoYnV0dG9uKSB7XHJcbiAgICAgICAgdmFyIGZpbmRDaGlsZENhbnZhcyA9IGZ1bmN0aW9uIChza2lsbERpdikge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNraWxsRGl2LmNoaWxkTm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGlmIChza2lsbERpdi5jaGlsZE5vZGVzW2ldLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09IFwiY2FudmFzXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2tpbGxEaXYuY2hpbGROb2Rlc1tpXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgY2FudmFzID0gZmluZENoaWxkQ2FudmFzKGJ1dHRvbi5wYXJlbnROb2RlKTtcclxuICAgICAgICBjYW52YXMud2lkdGggPSAyNjA7XHJcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IDEwMDtcclxuICAgICAgICB2YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuICAgICAgICBjdHguY2xlYXJSZWN0KDAsIDAsIDEwMDAsIDIwMCk7XHJcbiAgICAgICAgdmFyIG1hZ25pdHVkZSA9IDA7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiI0ZGRkZGRlwiO1xyXG4gICAgICAgIHN3aXRjaCAoYnV0dG9uLnVwZ1R5cGUpIHtcclxuICAgICAgICAgICAgY2FzZSBcImhvbWVIZWFsdGhcIjpcclxuICAgICAgICAgICAgICAgIG1hZ25pdHVkZSA9IHRoaXMuaG9tZS5wb3dlcjtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwiZG1nXCI6XHJcbiAgICAgICAgICAgICAgICBtYWduaXR1ZGUgPSB0aGlzLmhvbWUudW5pdERtZztcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwiYXJtb3JcIjpcclxuICAgICAgICAgICAgICAgIG1hZ25pdHVkZSA9IHRoaXMuaG9tZS51bml0QXJtb3I7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcInNwZWVkXCI6XHJcbiAgICAgICAgICAgICAgICBtYWduaXR1ZGUgPSB0aGlzLmhvbWUudW5pdFNwZWVkO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgIH1cclxuICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgbWFnbml0dWRlICogMTAsIDIwMCk7XHJcbiAgICB9O1xyXG4gICAgdmFyIG5ld0J1dHRvbiA9IGJ1dHRvbi5jbG9uZU5vZGUodHJ1ZSk7XHJcbiAgICBidXR0b24ucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQobmV3QnV0dG9uLCBidXR0b24pO1xyXG4gICAgYnV0dG9uID0gbmV3QnV0dG9uO1xyXG4gICAgYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgY2FsbGJhY2spO1xyXG4gICAgaWYgKGJ1dHRvbi51cGdUeXBlKSB7XHJcbiAgICAgICAgc2V0U2tpbGxNZXRlcihidXR0b24pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGJ1dHRvbjtcclxufTtcclxuXHJcbkhvbWVVSS5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEhvbWVVSTtcclxuIiwiZnVuY3Rpb24gTGlzdFVJKGxpc3QsIGhvbWVVSSwgcGFyZW50KSB7XHJcbiAgICB0aGlzLmxpc3QgPSBsaXN0O1xyXG4gICAgdGhpcy5ob21lVUkgPSBob21lVUk7XHJcbiAgICB0aGlzLmNsaWVudCA9IGhvbWVVSS5jbGllbnQ7XHJcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcclxuXHJcbiAgICB0aGlzLmxpc3QuYWRkRXZlbnRMaXN0ZW5lcignc2Nyb2xsJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgdGhpcy5ob21lVUkuTElTVF9TQ1JPTEwgPSB0cnVlO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxufVxyXG5cclxuTGlzdFVJLnByb3RvdHlwZS5hZGRRdWV1ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBob21lID0gdGhpcy5ob21lVUkuaG9tZTtcclxuICAgIHRoaXMubGlzdC5pbm5lckhUTUwgPSBcIlwiO1xyXG4gICAgaWYgKCFob21lLnF1ZXVlKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBob21lLnF1ZXVlLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFyIGJ1aWxkSW5mbyA9IGhvbWUucXVldWVbaV07XHJcbiAgICAgICAgdmFyIGVudHJ5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcclxuICAgICAgICBlbnRyeS5pZCA9IE1hdGgucmFuZG9tKCk7XHJcblxyXG4gICAgICAgIChmdW5jdGlvbiAoX2lkKSB7XHJcbiAgICAgICAgICAgIGVudHJ5LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuY2xpY2tlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2xpY2tlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdHlsZS5iYWNrZ3JvdW5kID0gXCIjZmZmYjIyXCI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNsaWNrZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0eWxlLmJhY2tncm91bmQgPSBcIiM1NDJmY2VcIjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSkoZW50cnkuaWQpO1xyXG5cclxuICAgICAgICBlbnRyeS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShcclxuICAgICAgICAgICAgYnVpbGRJbmZvLnNoYXJkTmFtZSArIFwiIC0tIFwiICsgTWF0aC5mbG9vcihidWlsZEluZm8udGltZXIgLyAxMDAwKSArXHJcbiAgICAgICAgICAgIFwiOlwiICsgTWF0aC5mbG9vcihidWlsZEluZm8udGltZXIgJSAxMDAwKSkpO1xyXG4gICAgICAgIHRoaXMubGlzdC5hcHBlbmRDaGlsZChlbnRyeSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5MaXN0VUkucHJvdG90eXBlLmFkZEJvdHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgaG9tZSA9IHRoaXMuaG9tZVVJLmhvbWU7XHJcbiAgICB0aGlzLmxpc3QuaW5uZXJIVE1MID0gXCJcIjtcclxuICAgIGlmICghaG9tZS5xdWV1ZSkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaG9tZS5ib3RzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFyIGJvdEluZm8gPSBob21lLmJvdHNbaV07XHJcbiAgICAgICAgdmFyIGVudHJ5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcclxuICAgICAgICBlbnRyeS5pZCA9IE1hdGgucmFuZG9tKCk7XHJcblxyXG4gICAgICAgIChmdW5jdGlvbiAoX2lkKSB7XHJcbiAgICAgICAgICAgIGVudHJ5LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuY2xpY2tlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2xpY2tlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdHlsZS5iYWNrZ3JvdW5kID0gXCIjZmZmYjIyXCI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNsaWNrZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0eWxlLmJhY2tncm91bmQgPSBcIiM1NDJmY2VcIjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSkoZW50cnkuaWQpO1xyXG5cclxuICAgICAgICBlbnRyeS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShcclxuICAgICAgICAgICAgYm90SW5mby5uYW1lICsgXCIgLS0gXCIgKyBcIkxldmVsOlwiICsgYm90SW5mby5sZXZlbCkpO1xyXG4gICAgICAgIHRoaXMubGlzdC5hcHBlbmRDaGlsZChlbnRyeSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5MaXN0VUkucHJvdG90eXBlLmFkZFNoYXJkcyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBob21lID0gdGhpcy5ob21lVUkuaG9tZTtcclxuICAgIHZhciBjaGVja1NlbGVjdGlvbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgYmxkQmFzZUhlYWx0aEJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdibGRfaG9tZV9idG4nKTtcclxuICAgICAgICB2YXIgbWFrZUJvdHNCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFrZV9ib3RzX2J0bicpO1xyXG4gICAgICAgIHZhciBibGRBcm1vckJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdibGRfYXJtb3InKTtcclxuICAgICAgICB2YXIgYmxkU3BlZWRCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmxkX3NwZWVkJyk7XHJcbiAgICAgICAgdmFyIGJsZERtZ0J0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdibGRfZGFtYWdlJyk7XHJcblxyXG4gICAgICAgIGlmIChPYmplY3Quc2l6ZSh0aGlzLnBhcmVudC5TRUxFQ1RFRF9TSEFSRFMpID4gMCkge1xyXG4gICAgICAgICAgICBibGRCYXNlSGVhbHRoQnRuLmRpc2FibGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGJsZEFybW9yQnRuLmRpc2FibGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGJsZFNwZWVkQnRuLmRpc2FibGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGJsZERtZ0J0bi5kaXNhYmxlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICBtYWtlQm90c0J0bi5kaXNhYmxlZCA9IGZhbHNlO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGJsZEJhc2VIZWFsdGhCdG4uZGlzYWJsZWQgPSBcImRpc2FibGVkXCI7XHJcbiAgICAgICAgICAgIGJsZEFybW9yQnRuLmRpc2FibGVkID0gXCJkaXNhYmxlZFwiO1xyXG4gICAgICAgICAgICBibGRTcGVlZEJ0bi5kaXNhYmxlZCA9IFwiZGlzYWJsZWRcIjtcclxuICAgICAgICAgICAgYmxkRG1nQnRuLmRpc2FibGVkID0gXCJkaXNhYmxlZFwiO1xyXG4gICAgICAgICAgICBtYWtlQm90c0J0bi5kaXNhYmxlZCA9IFwiZGlzYWJsZWRcIjtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcbiAgICBjaGVja1NlbGVjdGlvbigpO1xyXG4gICAgdGhpcy5saXN0LmlubmVySFRNTCA9IFwiXCI7XHJcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IGhvbWUuc2hhcmRzLmxlbmd0aDsgaisrKSB7XHJcbiAgICAgICAgdmFyIGVudHJ5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcclxuICAgICAgICB2YXIgc2hhcmQgPSB0aGlzLmNsaWVudC5TSEFSRF9MSVNUW2hvbWUuc2hhcmRzW2pdXTtcclxuICAgICAgICBlbnRyeS5pZCA9IHNoYXJkLmlkO1xyXG5cclxuICAgICAgICBlbnRyeS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBpZiAoIWVudHJ5LmNsaWNrZWQpIHtcclxuICAgICAgICAgICAgICAgIGVudHJ5LmNsaWNrZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgZW50cnkuc3R5bGUuYmFja2dyb3VuZCA9IFwiI2ZmZmIyMlwiO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wYXJlbnQuU0VMRUNURURfU0hBUkRTW2VudHJ5LmlkXSA9IGVudHJ5LmlkO1xyXG4gICAgICAgICAgICAgICAgY2hlY2tTZWxlY3Rpb24oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGVudHJ5LmNsaWNrZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIGVudHJ5LnN0eWxlLmJhY2tncm91bmQgPSBcIiM1NDJmY2VcIjtcclxuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnBhcmVudC5TRUxFQ1RFRF9TSEFSRFNbZW50cnkuaWRdO1xyXG4gICAgICAgICAgICAgICAgY2hlY2tTZWxlY3Rpb24oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG5cclxuICAgICAgICBlbnRyeS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzaGFyZC5uYW1lKSk7XHJcbiAgICAgICAgdGhpcy5saXN0LmFwcGVuZENoaWxkKGVudHJ5KTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IExpc3RVSTtcclxuXHJcbk9iamVjdC5zaXplID0gZnVuY3Rpb24ob2JqKSB7XHJcbiAgICB2YXIgc2l6ZSA9IDAsIGtleTtcclxuICAgIGZvciAoa2V5IGluIG9iaikge1xyXG4gICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5KSkgc2l6ZSsrO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHNpemU7XHJcbn07IiwidmFyIExpc3RVSSA9IHJlcXVpcmUoJy4vTGlzdFVJJyk7XHJcblxyXG5mdW5jdGlvbiBVcGdyYWRlc1BhZ2UoaG9tZVVJKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ1cGdyYWRlc19wYWdlXCIpO1xyXG4gICAgdGhpcy51bml0VXBncmFkZXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInVuaXRfdXBncmFkZXNcIik7XHJcbiAgICB0aGlzLmJsZEJhc2VIZWFsdGhCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmxkX2hvbWVfYnRuJyk7XHJcbiAgICB0aGlzLmJsZEFybW9yQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JsZF9hcm1vcicpO1xyXG4gICAgdGhpcy5ibGRTcGVlZEJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdibGRfc3BlZWQnKTtcclxuICAgIHRoaXMuYmxkRG1nQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JsZF9kYW1hZ2UnKTtcclxuXHJcbiAgICB0aGlzLlNFTEVDVEVEX1NIQVJEUyA9IHt9O1xyXG5cclxuICAgIHRoaXMuc2hhcmRzVUkgPSBuZXcgTGlzdFVJKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidXBncmFkZXNfc2hhcmRzX2xpc3RcIiksaG9tZVVJLCB0aGlzKTtcclxuICAgIHRoaXMuaG9tZVVJID0gaG9tZVVJO1xyXG5cclxuICAgIHRoaXMuc2hhcmRzVUkuYWRkU2hhcmRzKCk7XHJcbn1cclxuXHJcblVwZ3JhZGVzUGFnZS5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcclxuICAgIHRoaXMuYmxkQmFzZUhlYWx0aEJ0bi51cGdUeXBlID0gXCJob21lSGVhbHRoXCI7XHJcbiAgICB0aGlzLmJsZEFybW9yQnRuLnVwZ1R5cGUgPSBcImFybW9yXCI7XHJcbiAgICB0aGlzLmJsZFNwZWVkQnRuLnVwZ1R5cGUgPSBcInNwZWVkXCI7XHJcbiAgICB0aGlzLmJsZERtZ0J0bi51cGdUeXBlID0gXCJkbWdcIjtcclxuXHJcbiAgICB2YXIgYmxkSG9tZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLnNvY2tldC5lbWl0KCdidWlsZEhvbWUnLCB7XHJcbiAgICAgICAgICAgIGhvbWU6IHRoaXMuaG9tZVVJLmhvbWUuaWQsXHJcbiAgICAgICAgICAgIHNoYXJkczogdGhpcy5TRUxFQ1RFRF9TSEFSRFNcclxuICAgICAgICB9KVxyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG4gICAgdmFyIHVwZ1VuaXQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQuZW1pdCgndXBncmFkZVVuaXQnLCB7XHJcbiAgICAgICAgICAgIGhvbWU6IHRoaXMuaG9tZVVJLmhvbWUuaWQsXHJcbiAgICAgICAgICAgIHR5cGU6IHRoaXMudXBnVHlwZSxcclxuICAgICAgICAgICAgc2hhcmRzOiBTRUxFQ1RFRF9TSEFSRFNcclxuICAgICAgICB9KTtcclxuICAgIH0uYmluZCh0aGlzKTtcclxuXHJcblxyXG4gICAgdGhpcy5ibGRCYXNlSGVhbHRoQnRuID0gdGhpcy5ob21lVUkucmVzZXRCdXR0b24odGhpcy5ibGRCYXNlSGVhbHRoQnRuLCBibGRIb21lKTtcclxuXHJcbiAgICBpZiAodGhpcy5ob21lVUkuaG9tZS50eXBlID09PSBcIkJhcnJhY2tzXCIpIHtcclxuICAgICAgICB0aGlzLnVuaXRVcGdyYWRlcy5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xyXG4gICAgICAgIHRoaXMuYmxkQXJtb3JCdG4gPSB0aGlzLmhvbWVVSS5yZXNldEJ1dHRvbih0aGlzLmJsZEFybW9yQnRuLCB1cGdVbml0KTtcclxuICAgICAgICB0aGlzLmJsZFNwZWVkQnRuID0gdGhpcy5ob21lVUkucmVzZXRCdXR0b24odGhpcy5ibGRTcGVlZEJ0biwgdXBnVW5pdCk7XHJcbiAgICAgICAgdGhpcy5ibGREbWdCdG4gPSB0aGlzLmhvbWVVSS5yZXNldEJ1dHRvbih0aGlzLmJsZERtZ0J0biwgdXBnVW5pdCk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICB0aGlzLnVuaXRVcGdyYWRlcy5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuVXBncmFkZXNQYWdlLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG59O1xyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVXBncmFkZXNQYWdlOyJdfQ==
