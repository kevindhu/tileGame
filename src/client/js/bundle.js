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
            updateEntity(packet, this.FACTION_LIST);
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
    leaderboard.innerHTML = "";
    for (var i = FACTION_ARRAY.length - 1; i >= 0; i--) {
        var faction = FACTION_ARRAY[i];

        var entry = document.createElement('li');
        entry.appendChild(document.createTextNode(faction.name));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY2xpZW50L2pzL0NsaWVudC5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L0FuaW1hdGlvbi5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L0Fycm93LmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvQnJhY2tldC5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L0NvbnRyb2xsZXIuanMiLCJzcmMvY2xpZW50L2pzL2VudGl0eS9GYWN0aW9uLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvSG9tZS5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L0xhc2VyLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvTWluaU1hcC5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L1NoYXJkLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvVGlsZS5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L2luZGV4LmpzIiwic3JjL2NsaWVudC9qcy9pbmRleC5qcyIsInNyYy9jbGllbnQvanMvdWkvTWFpblVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9QbGF5ZXJOYW1lclVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9TaGFyZE5hbWVyVUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL2dhbWUvR2FtZVVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9ob21lL0JvdHNQYWdlLmpzIiwic3JjL2NsaWVudC9qcy91aS9ob21lL0J1aWxkUGFnZS5qcyIsInNyYy9jbGllbnQvanMvdWkvaG9tZS9Ib21lVUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL2hvbWUvTGlzdFVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9ob21lL1VwZ3JhZGVzUGFnZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIEVudGl0eSA9IHJlcXVpcmUoJy4vZW50aXR5Jyk7XHJcbnZhciBNYWluVUkgPSByZXF1aXJlKCcuL3VpL01haW5VSScpO1xyXG5cclxuZnVuY3Rpb24gQ2xpZW50KCkge1xyXG4gICAgdGhpcy5TRUxGSUQgPSBudWxsO1xyXG4gICAgdGhpcy5BUlJPVyA9IG51bGw7XHJcbiAgICB0aGlzLkJSQUNLRVQgPSBudWxsO1xyXG4gICAgdGhpcy5yaWdodENsaWNrID0gZmFsc2U7XHJcbiAgICB0aGlzLmluaXQoKTtcclxufVxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5pbml0U29ja2V0KCk7XHJcbiAgICB0aGlzLmluaXRDYW52YXNlcygpO1xyXG4gICAgdGhpcy5pbml0TGlzdHMoKTtcclxuICAgIHRoaXMuaW5pdFZpZXdlcnMoKTtcclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdENhbnZhc2VzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5tYWluQ2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtYWluX2NhbnZhc1wiKTtcclxuICAgIHRoaXMuZHJhZnRDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpO1xyXG4gICAgdGhpcy5tTWFwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTtcclxuICAgIHRoaXMubU1hcFJvdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7XHJcblxyXG4gICAgdGhpcy5tYWluQ2FudmFzLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG4gICAgdGhpcy5kcmFmdENhbnZhcy5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcbiAgICB0aGlzLm1NYXAuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG4gICAgdGhpcy5tTWFwUm90LnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuXHJcbiAgICB0aGlzLmRyYWZ0Q2FudmFzLmhlaWdodCA9IHRoaXMubWFpbkNhbnZhcy5oZWlnaHQ7XHJcbiAgICB0aGlzLmRyYWZ0Q2FudmFzLndpZHRoID0gdGhpcy5tYWluQ2FudmFzLndpZHRoO1xyXG4gICAgdGhpcy5tTWFwLmhlaWdodCA9IDUwMDtcclxuICAgIHRoaXMubU1hcC53aWR0aCA9IDUwMDtcclxuICAgIHRoaXMubU1hcFJvdC5oZWlnaHQgPSA1MDA7XHJcbiAgICB0aGlzLm1NYXBSb3Qud2lkdGggPSA1MDA7XHJcblxyXG4gICAgdGhpcy5tYWluQ3R4ID0gdGhpcy5tYWluQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuICAgIHRoaXMuZHJhZnRDdHggPSB0aGlzLmRyYWZ0Q2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuICAgIHRoaXMubU1hcEN0eCA9IHRoaXMubU1hcC5nZXRDb250ZXh0KFwiMmRcIik7XHJcbiAgICB0aGlzLm1NYXBDdHhSb3QgPSB0aGlzLm1NYXBSb3QuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG5cclxuICAgIHRoaXMubWFpbkNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGlmIChldmVudC5idXR0b24gPT09IDIpIHtcclxuICAgICAgICAgICAgdGhpcy5yaWdodENsaWNrID0gdHJ1ZTtcclxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuQ09OVFJPTExFUl9MSVNUW3RoaXMuU0VMRklEXSkge1xyXG4gICAgICAgICAgICB0aGlzLkFSUk9XID0gbmV3IEVudGl0eS5BcnJvdyhldmVudC54IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldFdpZHRoICogMTAwMCxcclxuICAgICAgICAgICAgICAgIGV2ZW50LnkgLyB0aGlzLm1haW5DYW52YXMub2Zmc2V0SGVpZ2h0ICogNTAwLCB0aGlzKTtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMubWFpbkNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBpZiAoIXRoaXMucmlnaHRDbGljaykge1xyXG4gICAgICAgICAgICB0aGlzLkFSUk9XLnBvc3RYID0gZXZlbnQueCAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRXaWR0aCAqIDEwMDA7XHJcbiAgICAgICAgICAgIHRoaXMuQVJST1cucG9zdFkgPSBldmVudC55IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldEhlaWdodCAqIDUwMDtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJzZWxlY3RCb3RzXCIsIHtcclxuICAgICAgICAgICAgICAgIG1pblg6ICh0aGlzLkFSUk9XLnByZVggLSB0aGlzLmRyYWZ0Q2FudmFzLndpZHRoIC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yLFxyXG4gICAgICAgICAgICAgICAgbWluWTogKHRoaXMuQVJST1cucHJlWSAtIHRoaXMuZHJhZnRDYW52YXMuaGVpZ2h0IC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yLFxyXG4gICAgICAgICAgICAgICAgbWF4WDogKHRoaXMuQVJST1cucG9zdFggLSB0aGlzLmRyYWZ0Q2FudmFzLndpZHRoIC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yLFxyXG4gICAgICAgICAgICAgICAgbWF4WTogKHRoaXMuQVJST1cucG9zdFkgLSB0aGlzLmRyYWZ0Q2FudmFzLmhlaWdodCAvIDIpIC8gdGhpcy5zY2FsZUZhY3RvclxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHZhciB4ID0gZXZlbnQueCAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRXaWR0aCAqIDEwMDA7XHJcbiAgICAgICAgICAgIHZhciB5ID0gZXZlbnQueSAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRIZWlnaHQgKiA1MDA7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNvY2tldC5lbWl0KFwiYm90Q29tbWFuZFwiLCB7XHJcbiAgICAgICAgICAgICAgICB4OiAoeCAtIHRoaXMuZHJhZnRDYW52YXMud2lkdGggLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3IsXHJcbiAgICAgICAgICAgICAgICB5OiAoeSAtIHRoaXMuZHJhZnRDYW52YXMuaGVpZ2h0IC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5yaWdodENsaWNrID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5BUlJPVyA9IG51bGw7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMubWFpbkNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGlmICh0aGlzLkFSUk9XKSB7XHJcbiAgICAgICAgICAgIHRoaXMuQVJST1cucG9zdFggPSBldmVudC54IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldFdpZHRoICogMTAwMDtcclxuICAgICAgICAgICAgdGhpcy5BUlJPVy5wb3N0WSA9IGV2ZW50LnkgLyB0aGlzLm1haW5DYW52YXMub2Zmc2V0SGVpZ2h0ICogNTAwO1xyXG4gICAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKSk7XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLmluaXRMaXN0cyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuRkFDVElPTl9MSVNUID0ge307XHJcbiAgICB0aGlzLkZBQ1RJT05fQVJSQVkgPSBbXTtcclxuXHJcbiAgICB0aGlzLkNPTlRST0xMRVJfTElTVCA9IHt9O1xyXG4gICAgdGhpcy5USUxFX0xJU1QgPSB7fTtcclxuICAgIHRoaXMuU0hBUkRfTElTVCA9IHt9O1xyXG4gICAgdGhpcy5MQVNFUl9MSVNUID0ge307XHJcbiAgICB0aGlzLkhPTUVfTElTVCA9IHt9O1xyXG4gICAgdGhpcy5BTklNQVRJT05fTElTVCA9IHt9O1xyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5pbml0U29ja2V0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5zb2NrZXQgPSBpbygpO1xyXG4gICAgdGhpcy5zb2NrZXQudmVyaWZpZWQgPSBmYWxzZTtcclxuXHJcbiAgICB0aGlzLnNvY2tldC5vbignYWRkRmFjdGlvbnNVSScsIHRoaXMuYWRkRmFjdGlvbnN0b1VJLmJpbmQodGhpcykpO1xyXG4gICAgdGhpcy5zb2NrZXQub24oJ3VwZGF0ZUVudGl0aWVzJywgdGhpcy5oYW5kbGVQYWNrZXQuYmluZCh0aGlzKSk7XHJcbiAgICB0aGlzLnNvY2tldC5vbignZHJhd1NjZW5lJywgdGhpcy5kcmF3U2NlbmUuYmluZCh0aGlzKSk7XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLmluaXRWaWV3ZXJzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5rZXlzID0gW107XHJcbiAgICB0aGlzLnNjYWxlRmFjdG9yID0gMTtcclxuICAgIHRoaXMubWFpblNjYWxlRmFjdG9yID0gMTtcclxuICAgIGNvbnNvbGUubG9nKFwiTUFLSU5HIE5FVyBWSUVXRVJcIik7XHJcbiAgICB0aGlzLm1haW5VSSA9IG5ldyBNYWluVUkodGhpcywgdGhpcy5zb2NrZXQpO1xyXG5cclxuICAgIHRoaXMubWFpblVJLnBsYXllck5hbWVyVUkub3BlbigpO1xyXG4gICAgdGhpcy5tYWluVUkuZ2FtZVVJLm9wZW4oKTtcclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUuYWRkRmFjdGlvbnN0b1VJID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgIGlmICghdGhpcy5zb2NrZXQudmVyaWZpZWQpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlZFUklGSUVEXCIpO1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJ2ZXJpZnlcIiwge30pO1xyXG4gICAgICAgIHRoaXMuc29ja2V0LnZlcmlmaWVkID0gdHJ1ZTtcclxuICAgIH1cclxuICAgIHZhciBmYWN0aW9ucyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmYWN0aW9ucycpO1xyXG4gICAgdmFyIHBhY2tldCA9IGRhdGEuZmFjdGlvbnM7XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYWNrZXQubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgbmFtZSA9IHBhY2tldFtpXTtcclxuICAgICAgICB2YXIgb3B0aW9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnb3B0aW9uJyk7XHJcbiAgICAgICAgb3B0aW9uLnZhbHVlID0gbmFtZTtcclxuICAgICAgICBmYWN0aW9ucy5hcHBlbmRDaGlsZChvcHRpb24pO1xyXG4gICAgfVxyXG59OyAvL2NoYW5nZSBtZXRob2QgbmFtZSBhbmQgbG9jYXRpb25cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaGFuZGxlUGFja2V0ID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgIHZhciBwYWNrZXQsIGk7XHJcbiAgICBmb3IgKGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHBhY2tldCA9IGRhdGFbaV07XHJcbiAgICAgICAgc3dpdGNoIChwYWNrZXQubWFzdGVyKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJhZGRcIjpcclxuICAgICAgICAgICAgICAgIHRoaXMuYWRkRW50aXRpZXMocGFja2V0KTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwiZGVsZXRlXCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRlbGV0ZUVudGl0aWVzKHBhY2tldCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcInVwZGF0ZVwiOlxyXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVFbnRpdGllcyhwYWNrZXQpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS51cGRhdGVFbnRpdGllcyA9IGZ1bmN0aW9uIChwYWNrZXQpIHtcclxuICAgIGZ1bmN0aW9uIHVwZGF0ZUVudGl0eShwYWNrZXQsIGxpc3QpIHtcclxuICAgICAgICBpZiAoIXBhY2tldCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBlbnRpdHkgPSBsaXN0W3BhY2tldC5pZF07XHJcbiAgICAgICAgaWYgKCFlbnRpdHkpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbnRpdHkudXBkYXRlKHBhY2tldCk7XHJcbiAgICB9XHJcblxyXG4gICAgc3dpdGNoIChwYWNrZXQuY2xhc3MpIHtcclxuICAgICAgICBjYXNlIFwiY29udHJvbGxlckluZm9cIjpcclxuICAgICAgICAgICAgdXBkYXRlRW50aXR5KHBhY2tldCwgdGhpcy5DT05UUk9MTEVSX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwidGlsZUluZm9cIjpcclxuICAgICAgICAgICAgdXBkYXRlRW50aXR5KHBhY2tldCwgdGhpcy5USUxFX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwic2hhcmRJbmZvXCI6XHJcbiAgICAgICAgICAgIHVwZGF0ZUVudGl0eShwYWNrZXQsIHRoaXMuU0hBUkRfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJob21lSW5mb1wiOlxyXG4gICAgICAgICAgICB1cGRhdGVFbnRpdHkocGFja2V0LCB0aGlzLkhPTUVfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJmYWN0aW9uSW5mb1wiOlxyXG4gICAgICAgICAgICB1cGRhdGVFbnRpdHkocGFja2V0LCB0aGlzLkZBQ1RJT05fTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJVSUluZm9cIjpcclxuICAgICAgICAgICAgaWYgKHRoaXMuU0VMRklEID09PSBwYWNrZXQucGxheWVySWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWFpblVJLnVwZGF0ZShwYWNrZXQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5kZWxldGVFbnRpdGllcyA9IGZ1bmN0aW9uIChwYWNrZXQpIHtcclxuICAgIHZhciBkZWxldGVFbnRpdHkgPSBmdW5jdGlvbiAocGFja2V0LCBsaXN0LCBhcnJheSkge1xyXG4gICAgICAgIGlmICghcGFja2V0KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGFycmF5KSB7XHJcbiAgICAgICAgICAgIHZhciBpbmRleCA9IGZpbmRXaXRoQXR0cihhcnJheSwgXCJpZFwiLCBwYWNrZXQuaWQpO1xyXG4gICAgICAgICAgICBhcnJheS5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBkZWxldGUgbGlzdFtwYWNrZXQuaWRdO1xyXG4gICAgfTtcclxuXHJcbiAgICBzd2l0Y2ggKHBhY2tldC5jbGFzcykge1xyXG4gICAgICAgIGNhc2UgXCJ0aWxlSW5mb1wiOlxyXG4gICAgICAgICAgICBkZWxldGVFbnRpdHkocGFja2V0LCB0aGlzLlRJTEVfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJjb250cm9sbGVySW5mb1wiOlxyXG4gICAgICAgICAgICBkZWxldGVFbnRpdHkocGFja2V0LCB0aGlzLkNPTlRST0xMRVJfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJzaGFyZEluZm9cIjpcclxuICAgICAgICAgICAgZGVsZXRlRW50aXR5KHBhY2tldCwgdGhpcy5TSEFSRF9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImhvbWVJbmZvXCI6XHJcbiAgICAgICAgICAgIGRlbGV0ZUVudGl0eShwYWNrZXQsIHRoaXMuSE9NRV9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImZhY3Rpb25JbmZvXCI6XHJcbiAgICAgICAgICAgIGRlbGV0ZUVudGl0eShwYWNrZXQsIHRoaXMuRkFDVElPTl9MSVNULCB0aGlzLkZBQ1RJT05fQVJSQVkpO1xyXG4gICAgICAgICAgICAvL3RoaXMuZHJhd0xlYWRlckJvYXJkKCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJhbmltYXRpb25JbmZvXCI6XHJcbiAgICAgICAgICAgIGRlbGV0ZUVudGl0eShwYWNrZXQsIHRoaXMuQU5JTUFUSU9OX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwibGFzZXJJbmZvXCI6XHJcbiAgICAgICAgICAgIGRlbGV0ZUVudGl0eShwYWNrZXQsIHRoaXMuTEFTRVJfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJicmFja2V0SW5mb1wiOlxyXG4gICAgICAgICAgICBpZiAodGhpcy5TRUxGSUQgPT09IHBhY2tldC5pZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5CUkFDS0VUID0gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiVUlJbmZvXCI6XHJcbiAgICAgICAgICAgIGlmICh0aGlzLlNFTEZJRCA9PT0gcGFja2V0LmlkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1haW5VSS5jbG9zZShwYWNrZXQuYWN0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgIH1cclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUuYWRkRW50aXRpZXMgPSBmdW5jdGlvbiAocGFja2V0KSB7XHJcbiAgICB2YXIgYWRkRW50aXR5ID0gZnVuY3Rpb24gKHBhY2tldCwgbGlzdCwgZW50aXR5LCBhcnJheSkge1xyXG4gICAgICAgIGlmICghcGFja2V0KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgbGlzdFtwYWNrZXQuaWRdID0gbmV3IGVudGl0eShwYWNrZXQsIHRoaXMpO1xyXG4gICAgICAgIGlmIChhcnJheSAmJiBmaW5kV2l0aEF0dHIoYXJyYXksIFwiaWRcIiwgcGFja2V0LmlkKSA9PT0gLTEpIHtcclxuICAgICAgICAgICAgYXJyYXkucHVzaChsaXN0W3BhY2tldC5pZF0pO1xyXG4gICAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKTtcclxuXHJcbiAgICBzd2l0Y2ggKHBhY2tldC5jbGFzcykge1xyXG4gICAgICAgIGNhc2UgXCJ0aWxlSW5mb1wiOlxyXG4gICAgICAgICAgICBhZGRFbnRpdHkocGFja2V0LCB0aGlzLlRJTEVfTElTVCwgRW50aXR5LlRpbGUpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiY29udHJvbGxlckluZm9cIjpcclxuICAgICAgICAgICAgYWRkRW50aXR5KHBhY2tldCwgdGhpcy5DT05UUk9MTEVSX0xJU1QsIEVudGl0eS5Db250cm9sbGVyKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcInNoYXJkSW5mb1wiOlxyXG4gICAgICAgICAgICBhZGRFbnRpdHkocGFja2V0LCB0aGlzLlNIQVJEX0xJU1QsIEVudGl0eS5TaGFyZCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJsYXNlckluZm9cIjpcclxuICAgICAgICAgICAgYWRkRW50aXR5KHBhY2tldCwgdGhpcy5MQVNFUl9MSVNULCBFbnRpdHkuTGFzZXIpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiaG9tZUluZm9cIjpcclxuICAgICAgICAgICAgYWRkRW50aXR5KHBhY2tldCwgdGhpcy5IT01FX0xJU1QsIEVudGl0eS5Ib21lKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImZhY3Rpb25JbmZvXCI6XHJcbiAgICAgICAgICAgIGFkZEVudGl0eShwYWNrZXQsIHRoaXMuRkFDVElPTl9MSVNULCBFbnRpdHkuRmFjdGlvbiwgdGhpcy5GQUNUSU9OX0FSUkFZKTtcclxuICAgICAgICAgICAgLy90aGlzLmRyYXdMZWFkZXJCb2FyZCgpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiYW5pbWF0aW9uSW5mb1wiOlxyXG4gICAgICAgICAgICBhZGRFbnRpdHkocGFja2V0LCB0aGlzLkFOSU1BVElPTl9MSVNULCBFbnRpdHkuQW5pbWF0aW9uKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImJyYWNrZXRJbmZvXCI6XHJcbiAgICAgICAgICAgIGlmICh0aGlzLlNFTEZJRCA9PT0gcGFja2V0LnBsYXllcklkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLkJSQUNLRVQgPSBuZXcgRW50aXR5LkJyYWNrZXQocGFja2V0LCB0aGlzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiVUlJbmZvXCI6XHJcbiAgICAgICAgICAgIGlmICh0aGlzLlNFTEZJRCA9PT0gcGFja2V0LnBsYXllcklkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1haW5VSS5vcGVuKHBhY2tldCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcInNlbGZJZFwiOlxyXG4gICAgICAgICAgICB0aGlzLlNFTEZJRCA9IHBhY2tldC5zZWxmSWQ7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS51cGRhdGVGYWN0aW9uc0xpc3QgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgZmFjdGlvblNvcnQgPSBmdW5jdGlvbiAoYSwgYikge1xyXG4gICAgICAgIHJldHVybiBhLnNpemUgLSBiLnNpemU7XHJcbiAgICB9O1xyXG5cclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUuZHJhd1NjZW5lID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgIHZhciBpZDtcclxuICAgIHZhciBzZWxmUGxheWVyID0gdGhpcy5DT05UUk9MTEVSX0xJU1RbdGhpcy5TRUxGSURdO1xyXG4gICAgaWYgKCFzZWxmUGxheWVyKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMubWFpbkN0eC5jbGVhclJlY3QoMCwgMCwgMTEwMDAsIDExMDAwKTtcclxuICAgIHRoaXMuZHJhZnRDdHguY2xlYXJSZWN0KDAsIDAsIDExMDAwLCAxMTAwMCk7XHJcbiAgICB0aGlzLm1NYXBDdHguY2xlYXJSZWN0KDAsIDAsIDUwMCwgNTAwKTtcclxuXHJcbiAgICB2YXIgZW50aXR5TGlzdCA9IFt0aGlzLlRJTEVfTElTVCwgdGhpcy5DT05UUk9MTEVSX0xJU1QsXHJcbiAgICAgICAgdGhpcy5TSEFSRF9MSVNULCB0aGlzLkxBU0VSX0xJU1QsIHRoaXMuSE9NRV9MSVNULFxyXG4gICAgICAgIHRoaXMuRkFDVElPTl9MSVNULCB0aGlzLkFOSU1BVElPTl9MSVNUXTtcclxuXHJcbiAgICB2YXIgaW5Cb3VuZHMgPSBmdW5jdGlvbiAocGxheWVyLCB4LCB5KSB7XHJcbiAgICAgICAgdmFyIHJhbmdlID0gdGhpcy5tYWluQ2FudmFzLndpZHRoIC8gKDEuMiAqIHRoaXMuc2NhbGVGYWN0b3IpO1xyXG4gICAgICAgIHJldHVybiB4IDwgKHBsYXllci54ICsgcmFuZ2UpICYmIHggPiAocGxheWVyLnggLSA1IC8gNCAqIHJhbmdlKVxyXG4gICAgICAgICAgICAmJiB5IDwgKHBsYXllci55ICsgcmFuZ2UpICYmIHkgPiAocGxheWVyLnkgLSA1IC8gNCAqIHJhbmdlKTtcclxuICAgIH0uYmluZCh0aGlzKTtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVudGl0eUxpc3QubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgbGlzdCA9IGVudGl0eUxpc3RbaV07XHJcbiAgICAgICAgZm9yIChpZCBpbiBsaXN0KSB7XHJcbiAgICAgICAgICAgIHZhciBlbnRpdHkgPSBsaXN0W2lkXTtcclxuICAgICAgICAgICAgaWYgKGluQm91bmRzKHNlbGZQbGF5ZXIsIGVudGl0eS54LCBlbnRpdHkueSkpIHtcclxuICAgICAgICAgICAgICAgIGVudGl0eS5zaG93KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGlmICh0aGlzLkJSQUNLRVQpIHtcclxuICAgICAgICB0aGlzLkJSQUNLRVQuc2hvdygpO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMuQVJST1cpIHtcclxuICAgICAgICB0aGlzLkFSUk9XLnNob3coKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgZHJhd0Nvbm5lY3RvcnMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgZm9yICh2YXIgaWQgaW4gdGhpcy5IT01FX0xJU1QpIHtcclxuICAgICAgICAgICAgdmFyIGhvbWUgPSB0aGlzLkhPTUVfTElTVFtpZF07XHJcbiAgICAgICAgICAgIGlmIChob21lLm5laWdoYm9ycykge1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBob21lLm5laWdoYm9ycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBuZWlnaGJvciA9IHRoaXMuSE9NRV9MSVNUW2hvbWUubmVpZ2hib3JzW2ldXTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRyYWZ0Q3R4Lm1vdmVUbyhob21lLngsIGhvbWUueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kcmFmdEN0eC5zdHJva2VTdHlsZSA9IFwiIzkxMjM4MVwiO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRyYWZ0Q3R4LmxpbmVXaWR0aCA9IDEwO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZHJhZnRDdHgubGluZVRvKG5laWdoYm9yLngsIG5laWdoYm9yLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZHJhZnRDdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcblxyXG5cclxuICAgIHZhciB0cmFuc2xhdGVTY2VuZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLmRyYWZ0Q3R4LnNldFRyYW5zZm9ybSgxLCAwLCAwLCAxLCAwLCAwKTtcclxuICAgICAgICB0aGlzLnNjYWxlRmFjdG9yID0gbGVycCh0aGlzLnNjYWxlRmFjdG9yLCB0aGlzLm1haW5TY2FsZUZhY3RvciwgMC4zKTtcclxuXHJcbiAgICAgICAgdGhpcy5kcmFmdEN0eC50cmFuc2xhdGUodGhpcy5tYWluQ2FudmFzLndpZHRoIC8gMiwgdGhpcy5tYWluQ2FudmFzLmhlaWdodCAvIDIpO1xyXG4gICAgICAgIHRoaXMuZHJhZnRDdHguc2NhbGUodGhpcy5zY2FsZUZhY3RvciwgdGhpcy5zY2FsZUZhY3Rvcik7XHJcbiAgICAgICAgdGhpcy5kcmFmdEN0eC50cmFuc2xhdGUoLXNlbGZQbGF5ZXIueCwgLXNlbGZQbGF5ZXIueSk7XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcblxyXG4gICAgZHJhd0Nvbm5lY3RvcnMoKTtcclxuICAgIHRyYW5zbGF0ZVNjZW5lKCk7XHJcbiAgICB0aGlzLm1haW5DdHguZHJhd0ltYWdlKHRoaXMuZHJhZnRDYW52YXMsIDAsIDApO1xyXG59O1xyXG5cclxuXHJcbmZ1bmN0aW9uIGxlcnAoYSwgYiwgcmF0aW8pIHtcclxuICAgIHJldHVybiBhICsgcmF0aW8gKiAoYiAtIGEpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmaW5kV2l0aEF0dHIoYXJyYXksIGF0dHIsIHZhbHVlKSB7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSArPSAxKSB7XHJcbiAgICAgICAgaWYgKGFycmF5W2ldW2F0dHJdID09PSB2YWx1ZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gaTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gLTE7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFJhbmRvbShtaW4sIG1heCkge1xyXG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pbjtcclxufVxyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ2xpZW50OyIsImZ1bmN0aW9uIEFuaW1hdGlvbihhbmltYXRpb25JbmZvLCBjbGllbnQpIHtcclxuICAgIHRoaXMudHlwZSA9IGFuaW1hdGlvbkluZm8udHlwZTtcclxuICAgIHRoaXMuaWQgPSBhbmltYXRpb25JbmZvLmlkO1xyXG4gICAgdGhpcy5uYW1lID0gYW5pbWF0aW9uSW5mby5uYW1lO1xyXG4gICAgdGhpcy54ID0gYW5pbWF0aW9uSW5mby54O1xyXG4gICAgdGhpcy55ID0gYW5pbWF0aW9uSW5mby55O1xyXG4gICAgdGhpcy50aGV0YSA9IDE1O1xyXG4gICAgdGhpcy50aW1lciA9IGdldFJhbmRvbSgxMCwgMTQpO1xyXG5cclxuICAgIGlmICh0aGlzLngpIHtcclxuICAgICAgICB0aGlzLmVuZFggPSB0aGlzLnggKyBnZXRSYW5kb20oLTEwMCwgMTAwKTtcclxuICAgICAgICB0aGlzLmVuZFkgPSB0aGlzLnkgKyBnZXRSYW5kb20oLTEwMCwgMTAwKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxufVxyXG5cclxuXHJcbkFuaW1hdGlvbi5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBob21lO1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50LmRyYWZ0Q3R4O1xyXG4gICAgaWYgKHRoaXMudHlwZSA9PT0gXCJhZGRTaGFyZFwiKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJEUkFXSU5HIEFERCBTSEFSRCBBTklNQVRJT05cIik7XHJcbiAgICAgICAgaG9tZSA9IHRoaXMuY2xpZW50LkhPTUVfTElTVFt0aGlzLmlkXTtcclxuICAgICAgICBpZiAoIWhvbWUpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDMgKiB0aGlzLnRpbWVyO1xyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiIzAxMkNDQ1wiO1xyXG4gICAgICAgIGN0eC5hcmMoaG9tZS54LCBob21lLnksIGhvbWUucmFkaXVzLCAwLCB0aGlzLnRpbWVyIC8gMS4yLCB0cnVlKTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLnR5cGUgPT09IFwicmVtb3ZlU2hhcmRcIikge1xyXG4gICAgICAgIGhvbWUgPSB0aGlzLmNsaWVudC5IT01FX0xJU1RbdGhpcy5pZF07XHJcbiAgICAgICAgaWYgKCFob21lKSB7XHJcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmNsaWVudC5BTklNQVRJT05fTElTVFtpZF07XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSAxNSAtIHRoaXMudGltZXI7XHJcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCJyZ2JhKDI1NSwgMCwgMCwgXCIgKyB0aGlzLnRpbWVyICogMTAgLyAxMDAgKyBcIilcIjtcclxuICAgICAgICBjdHguYXJjKGhvbWUueCwgaG9tZS55LCBob21lLnJhZGl1cywgMCwgMiAqIE1hdGguUEksIGZhbHNlKTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLnR5cGUgPT09IFwic2hhcmREZWF0aFwiKSB7XHJcbiAgICAgICAgY3R4LmZvbnQgPSA2MCAtIHRoaXMudGltZXIgKyBcInB4IEFyaWFsXCI7XHJcbiAgICAgICAgY3R4LnNhdmUoKTtcclxuICAgICAgICBjdHgudHJhbnNsYXRlKHRoaXMueCwgdGhpcy55KTtcclxuICAgICAgICBjdHgucm90YXRlKC1NYXRoLlBJIC8gNTAgKiB0aGlzLnRoZXRhKTtcclxuICAgICAgICBjdHgudGV4dEFsaWduID0gXCJjZW50ZXJcIjtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2JhKDI1NSwgMTY4LCA4NiwgXCIgKyB0aGlzLnRpbWVyICogMTAgLyAxMDAgKyBcIilcIjtcclxuICAgICAgICBjdHguZmlsbFRleHQodGhpcy5uYW1lLCAwLCAxNSk7XHJcbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcclxuXHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiIzAwMDAwMFwiO1xyXG4gICAgICAgIHRoaXMudGhldGEgPSBsZXJwKHRoaXMudGhldGEsIDAsIDAuMDgpO1xyXG4gICAgICAgIHRoaXMueCA9IGxlcnAodGhpcy54LCB0aGlzLmVuZFgsIDAuMSk7XHJcbiAgICAgICAgdGhpcy55ID0gbGVycCh0aGlzLnksIHRoaXMuZW5kWSwgMC4xKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnRpbWVyLS07XHJcbiAgICBpZiAodGhpcy50aW1lciA8PSAwKSB7XHJcbiAgICAgICAgZGVsZXRlIHRoaXMuY2xpZW50LkFOSU1BVElPTl9MSVNUW3RoaXMuaWRdO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbmZ1bmN0aW9uIGdldFJhbmRvbShtaW4sIG1heCkge1xyXG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pbjtcclxufVxyXG5cclxuZnVuY3Rpb24gbGVycChhLCBiLCByYXRpbykge1xyXG4gICAgcmV0dXJuIGEgKyByYXRpbyAqIChiIC0gYSk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQW5pbWF0aW9uOyIsImZ1bmN0aW9uIEFycm93KHgsIHksIGNsaWVudCkge1xyXG4gICAgdGhpcy5wcmVYID0geDtcclxuICAgIHRoaXMucHJlWSA9IHk7XHJcbiAgICB0aGlzLnBvc3RYID0geDtcclxuICAgIHRoaXMucG9zdFkgPSB5O1xyXG4gICAgdGhpcy5kZWx0YVggPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMucG9zdFggLSBtYWluQ2FudmFzLndpZHRoIC8gMjtcclxuICAgIH07XHJcbiAgICB0aGlzLmRlbHRhWSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5wb3N0WSAtIG1haW5DYW52YXMuaGVpZ2h0IC8gMjtcclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbn1cclxuXHJcbkFycm93LnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGNhbnZhcyA9IHRoaXMuY2xpZW50LmRyYWZ0Q2FudmFzO1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50LmRyYWZ0Q3R4O1xyXG4gICAgdmFyIHNlbGZQbGF5ZXIgPSB0aGlzLmNsaWVudC5DT05UUk9MTEVSX0xJU1RbdGhpcy5jbGllbnQuU0VMRklEXTtcclxuICAgIHZhciBzY2FsZUZhY3RvciA9IHRoaXMuY2xpZW50LnNjYWxlRmFjdG9yO1xyXG5cclxuICAgIGlmICh0aGlzLnBvc3RYKSB7XHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiIzUyMTUyMlwiO1xyXG5cclxuICAgICAgICB2YXIgcHJlWCA9IHNlbGZQbGF5ZXIueCArICh0aGlzLnByZVggLSBjYW52YXMud2lkdGggLyAyKSAvIHNjYWxlRmFjdG9yO1xyXG4gICAgICAgIHZhciBwcmVZID0gc2VsZlBsYXllci55ICsgKHRoaXMucHJlWSAtIGNhbnZhcy5oZWlnaHQgLyAyKSAvIHNjYWxlRmFjdG9yO1xyXG5cclxuICAgICAgICB2YXIgcG9zdFggPSBzZWxmUGxheWVyLnggKyAodGhpcy5wb3N0WCAtIGNhbnZhcy53aWR0aCAvIDIpIC8gc2NhbGVGYWN0b3I7XHJcbiAgICAgICAgdmFyIHBvc3RZID0gc2VsZlBsYXllci55ICsgKHRoaXMucG9zdFkgLSBjYW52YXMuaGVpZ2h0IC8gMikgLyBzY2FsZUZhY3RvcjtcclxuXHJcbiAgICAgICAgY3R4LmZpbGxSZWN0KHByZVgsIHByZVksIHBvc3RYIC0gcHJlWCwgcG9zdFkgLSBwcmVZKTtcclxuXHJcbiAgICAgICAgY3R4LmFyYyhwb3N0WCwgcG9zdFksIDMsIDAsIDIgKiBNYXRoLlBJLCB0cnVlKTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICB9XHJcblxyXG59O1xyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQXJyb3c7IiwiZnVuY3Rpb24gQnJhY2tldChicmFja2V0SW5mbywgY2xpZW50KSB7XHJcbiAgICB2YXIgdGlsZSA9IGNsaWVudC5USUxFX0xJU1RbYnJhY2tldEluZm8udGlsZUlkXTtcclxuXHJcbiAgICB0aGlzLnggPSB0aWxlLng7XHJcbiAgICB0aGlzLnkgPSB0aWxlLnk7XHJcbiAgICB0aGlzLmxlbmd0aCA9IHRpbGUubGVuZ3RoO1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5CcmFja2V0LnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHNlbGZQbGF5ZXIgPSB0aGlzLmNsaWVudC5DT05UUk9MTEVSX0xJU1RbdGhpcy5jbGllbnQuU0VMRklEXTtcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5kcmFmdEN0eDtcclxuXHJcbiAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2JhKDEwMCwyMTEsMjExLDAuNilcIjtcclxuICAgIGN0eC5maWxsUmVjdCh0aGlzLngsIHRoaXMueSwgdGhpcy5sZW5ndGgsIHRoaXMubGVuZ3RoKTtcclxuICAgIGN0eC5mb250ID0gXCIyMHB4IEFyaWFsXCI7XHJcblxyXG4gICAgY3R4LmZpbGxUZXh0KFwiUHJlc3MgWiB0byBQbGFjZSBTZW50aW5lbFwiLCBzZWxmUGxheWVyLngsIHNlbGZQbGF5ZXIueSArIDEwMCk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEJyYWNrZXQ7IiwiZnVuY3Rpb24gQ29udHJvbGxlcihjb250cm9sbGVySW5mbywgY2xpZW50KSB7XHJcbiAgICB0aGlzLmlkID0gY29udHJvbGxlckluZm8uaWQ7XHJcbiAgICB0aGlzLm5hbWUgPSBjb250cm9sbGVySW5mby5uYW1lO1xyXG4gICAgdGhpcy54ID0gY29udHJvbGxlckluZm8ueDtcclxuICAgIHRoaXMueSA9IGNvbnRyb2xsZXJJbmZvLnk7XHJcbiAgICB0aGlzLmhlYWx0aCA9IGNvbnRyb2xsZXJJbmZvLmhlYWx0aDtcclxuICAgIHRoaXMubWF4SGVhbHRoID0gY29udHJvbGxlckluZm8ubWF4SGVhbHRoO1xyXG4gICAgdGhpcy5zZWxlY3RlZCA9IGNvbnRyb2xsZXJJbmZvLnNlbGVjdGVkO1xyXG4gICAgdGhpcy5vd25lciA9IGNvbnRyb2xsZXJJbmZvLm93bmVyO1xyXG4gICAgdGhpcy50aGV0YSA9IGNvbnRyb2xsZXJJbmZvLnRoZXRhO1xyXG4gICAgdGhpcy50eXBlID0gY29udHJvbGxlckluZm8udHlwZTtcclxuICAgIHRoaXMubGV2ZWwgPSBjb250cm9sbGVySW5mby5sZXZlbDtcclxuICAgIHRoaXMucmFkaXVzID0gY29udHJvbGxlckluZm8ucmFkaXVzO1xyXG4gICAgdGhpcy5zdGVhbHRoID0gY29udHJvbGxlckluZm8uc3RlYWx0aDtcclxuXHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxufVxyXG5cclxuQ29udHJvbGxlci5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKGNvbnRyb2xsZXJJbmZvKSB7XHJcbiAgICB0aGlzLnggPSBjb250cm9sbGVySW5mby54O1xyXG4gICAgdGhpcy55ID0gY29udHJvbGxlckluZm8ueTtcclxuICAgIHRoaXMuaGVhbHRoID0gY29udHJvbGxlckluZm8uaGVhbHRoO1xyXG4gICAgdGhpcy5tYXhIZWFsdGggPSBjb250cm9sbGVySW5mby5tYXhIZWFsdGg7XHJcbiAgICB0aGlzLnNlbGVjdGVkID0gY29udHJvbGxlckluZm8uc2VsZWN0ZWQ7XHJcbiAgICB0aGlzLnRoZXRhID0gY29udHJvbGxlckluZm8udGhldGE7XHJcbiAgICB0aGlzLmxldmVsID0gY29udHJvbGxlckluZm8ubGV2ZWw7XHJcbiAgICB0aGlzLnN0ZWFsdGggPSBjb250cm9sbGVySW5mby5zdGVhbHRoO1xyXG59O1xyXG5cclxuQ29udHJvbGxlci5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBzZWxmSWQgPSB0aGlzLmNsaWVudC5TRUxGSUQ7XHJcbiAgICBpZiAodGhpcy5zdGVhbHRoICYmIHRoaXMuaWQgIT09IHNlbGZJZCAmJiB0aGlzLm93bmVyICE9PSBzZWxmSWQpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5mb250ID0gXCIyMHB4IEFyaWFsXCI7XHJcbiAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5zdHJva2VTdHlsZSA9IFwiI2ZmOWQ2MFwiO1xyXG5cclxuICAgIHRoaXMuY2xpZW50LmRyYWZ0Q3R4LmZpbGxTdHlsZSA9IFwicmdiYSgxMjMsMCwwLFwiICsgdGhpcy5oZWFsdGggLyAoNCAqIHRoaXMubWF4SGVhbHRoKSArIFwiKVwiO1xyXG4gICAgdGhpcy5jbGllbnQuZHJhZnRDdHgubGluZVdpZHRoID0gMTA7XHJcbiAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5iZWdpblBhdGgoKTtcclxuXHJcbiAgICAvL2RyYXcgcGxheWVyIG9iamVjdFxyXG4gICAgaWYgKHRoaXMudHlwZSA9PT0gXCJQbGF5ZXJcIikge1xyXG4gICAgICAgIHZhciByYWRpdXMgPSAzMDtcclxuICAgICAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5tb3ZlVG8odGhpcy54ICsgcmFkaXVzLCB0aGlzLnkpO1xyXG4gICAgICAgIGZvciAoaSA9IE1hdGguUEkgLyA0OyBpIDw9IDIgKiBNYXRoLlBJIC0gTWF0aC5QSSAvIDQ7IGkgKz0gTWF0aC5QSSAvIDQpIHtcclxuICAgICAgICAgICAgdGhldGEgPSBpICsgZ2V0UmFuZG9tKC0odGhpcy5tYXhIZWFsdGggLyB0aGlzLmhlYWx0aCkgLyA3LCAodGhpcy5tYXhIZWFsdGggLyB0aGlzLmhlYWx0aCkgLyA3KTtcclxuICAgICAgICAgICAgeCA9IHJhZGl1cyAqIE1hdGguY29zKHRoZXRhKTtcclxuICAgICAgICAgICAgeSA9IHJhZGl1cyAqIE1hdGguc2luKHRoZXRhKTtcclxuICAgICAgICAgICAgdGhpcy5jbGllbnQuZHJhZnRDdHgubGluZVRvKHRoaXMueCArIHgsIHRoaXMueSArIHkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5saW5lVG8odGhpcy54ICsgcmFkaXVzLCB0aGlzLnkgKyAzKTtcclxuICAgICAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5zdHJva2UoKTtcclxuICAgICAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5maWxsKCk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHsgLy9ib3RcclxuICAgICAgICB2YXIgeCwgeSwgdGhldGEsIHN0YXJ0WCwgc3RhcnRZO1xyXG4gICAgICAgIHZhciBzbWFsbFJhZGl1cyA9IDEyO1xyXG4gICAgICAgIHZhciBiaWdSYWRpdXMgPSB0aGlzLnJhZGl1cztcclxuXHJcbiAgICAgICAgdGhldGEgPSB0aGlzLnRoZXRhO1xyXG4gICAgICAgIHN0YXJ0WCA9IGJpZ1JhZGl1cyAqIE1hdGguY29zKHRoZXRhKTtcclxuICAgICAgICBzdGFydFkgPSBiaWdSYWRpdXMgKiBNYXRoLnNpbih0aGV0YSk7XHJcbiAgICAgICAgdGhpcy5jbGllbnQuZHJhZnRDdHgubW92ZVRvKHRoaXMueCArIHN0YXJ0WCwgdGhpcy55ICsgc3RhcnRZKTtcclxuICAgICAgICBmb3IgKGkgPSAxOyBpIDw9IDI7IGkrKykge1xyXG4gICAgICAgICAgICB0aGV0YSA9IHRoaXMudGhldGEgKyAyICogTWF0aC5QSSAvIDMgKiBpICtcclxuICAgICAgICAgICAgICAgIGdldFJhbmRvbSgtdGhpcy5tYXhIZWFsdGggLyB0aGlzLmhlYWx0aCAvIDcsIHRoaXMubWF4SGVhbHRoIC8gdGhpcy5oZWFsdGggLyA3KTtcclxuICAgICAgICAgICAgeCA9IHNtYWxsUmFkaXVzICogTWF0aC5jb3ModGhldGEpO1xyXG4gICAgICAgICAgICB5ID0gc21hbGxSYWRpdXMgKiBNYXRoLnNpbih0aGV0YSk7XHJcbiAgICAgICAgICAgIHRoaXMuY2xpZW50LmRyYWZ0Q3R4LmxpbmVUbyh0aGlzLnggKyB4LCB0aGlzLnkgKyB5KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5jbGllbnQuZHJhZnRDdHgubGluZVRvKHRoaXMueCArIHN0YXJ0WCwgdGhpcy55ICsgc3RhcnRZKTtcclxuICAgICAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5maWxsKCk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5jbGllbnQuZHJhZnRDdHguZmlsbFN0eWxlID0gXCIjZmY5ZDYwXCI7XHJcbiAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5maWxsVGV4dCh0aGlzLm5hbWUsIHRoaXMueCwgdGhpcy55ICsgNzApO1xyXG4gICAgaWYgKHRoaXMuc2VsZWN0ZWQgJiYgdGhpcy5vd25lciA9PT0gdGhpcy5jbGllbnQuU0VMRklEKSB7XHJcbiAgICAgICAgdGhpcy5jbGllbnQuZHJhZnRDdHgubGluZVdpZHRoID0gNTtcclxuICAgICAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5zdHJva2VTdHlsZSA9IFwiIzFkNTVhZlwiO1xyXG4gICAgICAgIHRoaXMuY2xpZW50LmRyYWZ0Q3R4LnN0cm9rZSgpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbmZ1bmN0aW9uIGdldFJhbmRvbShtaW4sIG1heCkge1xyXG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pbjtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb250cm9sbGVyOyIsImZ1bmN0aW9uIEZhY3Rpb24oZmFjdGlvbkluZm8sIGNsaWVudCkge1xyXG4gICAgdGhpcy5pZCA9IGZhY3Rpb25JbmZvLmlkO1xyXG4gICAgdGhpcy5uYW1lID0gZmFjdGlvbkluZm8ubmFtZTtcclxuICAgIHRoaXMueCA9IGZhY3Rpb25JbmZvLng7XHJcbiAgICB0aGlzLnkgPSBmYWN0aW9uSW5mby55O1xyXG4gICAgdGhpcy5zaXplID0gZmFjdGlvbkluZm8uc2l6ZTtcclxuXHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxufVxyXG5cclxuRmFjdGlvbi5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKGZhY3Rpb25JbmZvKSB7XHJcbiAgICB0aGlzLnggPSBmYWN0aW9uSW5mby54O1xyXG4gICAgdGhpcy55ID0gZmFjdGlvbkluZm8ueTtcclxuICAgIHRoaXMuc2l6ZSA9IGZhY3Rpb25JbmZvLnNpemU7XHJcblxyXG5cclxuICAgIC8vRkFDVElPTl9BUlJBWS5zb3J0KGZhY3Rpb25Tb3J0KTtcclxuICAgIC8vZHJhd0xlYWRlckJvYXJkKCk7IC8vY2hhbmdlIHRoaXNcclxufTtcclxuXHJcbkZhY3Rpb24ucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgY3R4ID0gdGhpcy5jbGllbnQuZHJhZnRDdHg7XHJcbiAgICBjdHguZm9udCA9IHRoaXMuc2l6ZSAqIDMwICsgXCJweCBBcmlhbFwiO1xyXG4gICAgY3R4LnRleHRBbGlnbiA9IFwiY2VudGVyXCI7XHJcbiAgICBjdHguZmlsbFRleHQodGhpcy5uYW1lLCB0aGlzLngsIHRoaXMueSk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEZhY3Rpb247IiwiZnVuY3Rpb24gSG9tZShob21lSW5mbywgY2xpZW50KSB7XHJcbiAgICB0aGlzLmlkID0gaG9tZUluZm8uaWQ7XHJcbiAgICB0aGlzLnggPSBob21lSW5mby54O1xyXG4gICAgdGhpcy55ID0gaG9tZUluZm8ueTtcclxuICAgIHRoaXMubmFtZSA9IGhvbWVJbmZvLm93bmVyO1xyXG4gICAgdGhpcy50eXBlID0gaG9tZUluZm8udHlwZTtcclxuICAgIHRoaXMucmFkaXVzID0gaG9tZUluZm8ucmFkaXVzO1xyXG4gICAgdGhpcy5zaGFyZHMgPSBob21lSW5mby5zaGFyZHM7XHJcbiAgICB0aGlzLnBvd2VyID0gaG9tZUluZm8ucG93ZXI7XHJcbiAgICB0aGlzLmxldmVsID0gaG9tZUluZm8ubGV2ZWw7XHJcbiAgICB0aGlzLmhhc0NvbG9yID0gaG9tZUluZm8uaGFzQ29sb3I7XHJcbiAgICB0aGlzLmhlYWx0aCA9IGhvbWVJbmZvLmhlYWx0aDtcclxuICAgIHRoaXMubmVpZ2hib3JzID0gaG9tZUluZm8ubmVpZ2hib3JzO1xyXG5cclxuICAgIHRoaXMudW5pdERtZyA9IGhvbWVJbmZvLnVuaXREbWc7XHJcbiAgICB0aGlzLnVuaXRTcGVlZCA9IGhvbWVJbmZvLnVuaXRTcGVlZDtcclxuICAgIHRoaXMudW5pdEFybW9yID0gaG9tZUluZm8udW5pdEFybW9yO1xyXG4gICAgdGhpcy5xdWV1ZSA9IGhvbWVJbmZvLnF1ZXVlO1xyXG4gICAgdGhpcy5ib3RzID0gaG9tZUluZm8uYm90cztcclxuXHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxufVxyXG5cclxuXHJcbkhvbWUucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIChob21lSW5mbykge1xyXG4gICAgdGhpcy5zaGFyZHMgPSBob21lSW5mby5zaGFyZHM7XHJcbiAgICB0aGlzLmxldmVsID0gaG9tZUluZm8ubGV2ZWw7XHJcbiAgICB0aGlzLnJhZGl1cyA9IGhvbWVJbmZvLnJhZGl1cztcclxuICAgIHRoaXMucG93ZXIgPSBob21lSW5mby5wb3dlcjtcclxuICAgIHRoaXMuaGVhbHRoID0gaG9tZUluZm8uaGVhbHRoO1xyXG4gICAgdGhpcy5oYXNDb2xvciA9IGhvbWVJbmZvLmhhc0NvbG9yO1xyXG4gICAgdGhpcy5uZWlnaGJvcnMgPSBob21lSW5mby5uZWlnaGJvcnM7XHJcbiAgICB0aGlzLnVuaXREbWcgPSBob21lSW5mby51bml0RG1nO1xyXG4gICAgdGhpcy51bml0U3BlZWQgPSBob21lSW5mby51bml0U3BlZWQ7XHJcbiAgICB0aGlzLnVuaXRBcm1vciA9IGhvbWVJbmZvLnVuaXRBcm1vcjtcclxuICAgIHRoaXMucXVldWUgPSBob21lSW5mby5xdWV1ZTtcclxuICAgIHRoaXMuYm90cyA9IGhvbWVJbmZvLmJvdHM7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEhvbWU7XHJcblxyXG5cclxuSG9tZS5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5kcmFmdEN0eDtcclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgIGlmICh0aGlzLm5laWdoYm9ycy5sZW5ndGggPj0gNCkge1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcIiM0MTY5ZTFcIjtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiIzM5NmE2ZFwiO1xyXG4gICAgfVxyXG5cclxuICAgIGN0eC5hcmModGhpcy54LCB0aGlzLnksIHRoaXMucmFkaXVzLCAwLCAyICogTWF0aC5QSSwgZmFsc2UpO1xyXG4gICAgY3R4LmZpbGwoKTtcclxuXHJcbiAgICB2YXIgc2VsZlBsYXllciA9IHRoaXMuY2xpZW50LkNPTlRST0xMRVJfTElTVFt0aGlzLmNsaWVudC5TRUxGSURdO1xyXG5cclxuICAgIGlmIChpbkJvdW5kc0Nsb3NlKHNlbGZQbGF5ZXIsIHRoaXMueCwgdGhpcy55KSkge1xyXG4gICAgICAgIGlmICh0aGlzLmZhY3Rpb24pXHJcbiAgICAgICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwicmdiYSgxMiwgMjU1LCAyMTgsIDAuNylcIjtcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gMTA7XHJcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLm93bmVyICE9PSBudWxsKSB7XHJcbiAgICAgICAgY3R4LmZpbGxUZXh0KHRoaXMuc2hhcmRzLmxlbmd0aCwgdGhpcy54LCB0aGlzLnkgKyA0MCk7XHJcbiAgICB9XHJcbiAgICBjdHguY2xvc2VQYXRoKCk7XHJcbn07XHJcblxyXG5cclxuZnVuY3Rpb24gaW5Cb3VuZHNDbG9zZShwbGF5ZXIsIHgsIHkpIHtcclxuICAgIHZhciByYW5nZSA9IDE1MDtcclxuICAgIHJldHVybiB4IDwgKHBsYXllci54ICsgcmFuZ2UpICYmIHggPiAocGxheWVyLnggLSA1IC8gNCAqIHJhbmdlKVxyXG4gICAgICAgICYmIHkgPCAocGxheWVyLnkgKyByYW5nZSkgJiYgeSA+IChwbGF5ZXIueSAtIDUgLyA0ICogcmFuZ2UpO1xyXG59XHJcbiIsImZ1bmN0aW9uIExhc2VyKGxhc2VySW5mbywgY2xpZW50KSB7XHJcbiAgICB0aGlzLmlkID0gbGFzZXJJbmZvLmlkO1xyXG4gICAgdGhpcy5vd25lciA9IGxhc2VySW5mby5vd25lcjtcclxuICAgIHRoaXMudGFyZ2V0ID0gbGFzZXJJbmZvLnRhcmdldDtcclxuXHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxufVxyXG5cclxuTGFzZXIucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgY3R4ID0gdGhpcy5jbGllbnQuZHJhZnRDdHg7XHJcbiAgICB2YXIgdGFyZ2V0ID0gdGhpcy5jbGllbnQuQ09OVFJPTExFUl9MSVNUW3RoaXMudGFyZ2V0XTtcclxuICAgIHZhciBvd25lciA9IHRoaXMuY2xpZW50LkNPTlRST0xMRVJfTElTVFt0aGlzLm93bmVyXTtcclxuXHJcbiAgICBpZiAodGFyZ2V0ICYmIG93bmVyKSB7XHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5tb3ZlVG8ob3duZXIueCwgb3duZXIueSk7XHJcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCIjOTEyMjIyXCI7XHJcbiAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDEwO1xyXG4gICAgICAgIGN0eC5saW5lVG8odGFyZ2V0LngsIHRhcmdldC55KTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IExhc2VyOyIsImZ1bmN0aW9uIE1pbmlNYXAoKSB7XHJcbn1cclxuXHJcbk1pbmlNYXAucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBpZiAobWFwVGltZXIgPD0gMCB8fCBzZXJ2ZXJNYXAgPT09IG51bGwpIHtcclxuICAgICAgICB2YXIgdGlsZUxlbmd0aCA9IE1hdGguc3FydChPYmplY3Quc2l6ZShUSUxFX0xJU1QpKTtcclxuICAgICAgICBpZiAodGlsZUxlbmd0aCA9PT0gMCB8fCAhc2VsZlBsYXllcikge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBpbWdEYXRhID0gbWFpbkN0eC5jcmVhdGVJbWFnZURhdGEodGlsZUxlbmd0aCwgdGlsZUxlbmd0aCk7XHJcbiAgICAgICAgdmFyIHRpbGU7XHJcbiAgICAgICAgdmFyIHRpbGVSR0I7XHJcbiAgICAgICAgdmFyIGkgPSAwO1xyXG5cclxuXHJcbiAgICAgICAgZm9yICh2YXIgaWQgaW4gVElMRV9MSVNUKSB7XHJcbiAgICAgICAgICAgIHRpbGVSR0IgPSB7fTtcclxuICAgICAgICAgICAgdGlsZSA9IFRJTEVfTElTVFtpZF07XHJcbiAgICAgICAgICAgIGlmICh0aWxlLmNvbG9yICYmIHRpbGUuYWxlcnQgfHwgaW5Cb3VuZHMoc2VsZlBsYXllciwgdGlsZS54LCB0aWxlLnkpKSB7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLnIgPSB0aWxlLmNvbG9yLnI7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLmcgPSB0aWxlLmNvbG9yLmc7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLmIgPSB0aWxlLmNvbG9yLmI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLnIgPSAwO1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5nID0gMDtcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuYiA9IDA7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGltZ0RhdGEuZGF0YVtpXSA9IHRpbGVSR0IucjtcclxuICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2kgKyAxXSA9IHRpbGVSR0IuZztcclxuICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2kgKyAyXSA9IHRpbGVSR0IuYjtcclxuICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2kgKyAzXSA9IDI1NTtcclxuICAgICAgICAgICAgaSArPSA0O1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zb2xlLmxvZyg0MDAgLyBPYmplY3Quc2l6ZShUSUxFX0xJU1QpKTtcclxuICAgICAgICBpbWdEYXRhID0gc2NhbGVJbWFnZURhdGEoaW1nRGF0YSwgTWF0aC5mbG9vcig0MDAgLyBPYmplY3Quc2l6ZShUSUxFX0xJU1QpKSwgbWFpbkN0eCk7XHJcblxyXG4gICAgICAgIG1NYXBDdHgucHV0SW1hZ2VEYXRhKGltZ0RhdGEsIDAsIDApO1xyXG5cclxuICAgICAgICBtTWFwQ3R4Um90LnJvdGF0ZSg5MCAqIE1hdGguUEkgLyAxODApO1xyXG4gICAgICAgIG1NYXBDdHhSb3Quc2NhbGUoMSwgLTEpO1xyXG4gICAgICAgIG1NYXBDdHhSb3QuZHJhd0ltYWdlKG1NYXAsIDAsIDApO1xyXG4gICAgICAgIG1NYXBDdHhSb3Quc2NhbGUoMSwgLTEpO1xyXG4gICAgICAgIG1NYXBDdHhSb3Qucm90YXRlKDI3MCAqIE1hdGguUEkgLyAxODApO1xyXG5cclxuICAgICAgICBzZXJ2ZXJNYXAgPSBtTWFwUm90O1xyXG4gICAgICAgIG1hcFRpbWVyID0gMjU7XHJcbiAgICB9XHJcblxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgbWFwVGltZXIgLT0gMTtcclxuICAgIH1cclxuXHJcbiAgICBtYWluQ3R4LmRyYXdJbWFnZShzZXJ2ZXJNYXAsIDgwMCwgNDAwKTtcclxufTsgLy9kZXByZWNhdGVkXHJcblxyXG5NaW5pTWFwLnByb3RvdHlwZS5zY2FsZUltYWdlRGF0YSA9IGZ1bmN0aW9uIChpbWFnZURhdGEsIHNjYWxlLCBtYWluQ3R4KSB7XHJcbiAgICB2YXIgc2NhbGVkID0gbWFpbkN0eC5jcmVhdGVJbWFnZURhdGEoaW1hZ2VEYXRhLndpZHRoICogc2NhbGUsIGltYWdlRGF0YS5oZWlnaHQgKiBzY2FsZSk7XHJcbiAgICB2YXIgc3ViTGluZSA9IG1haW5DdHguY3JlYXRlSW1hZ2VEYXRhKHNjYWxlLCAxKS5kYXRhO1xyXG4gICAgZm9yICh2YXIgcm93ID0gMDsgcm93IDwgaW1hZ2VEYXRhLmhlaWdodDsgcm93KyspIHtcclxuICAgICAgICBmb3IgKHZhciBjb2wgPSAwOyBjb2wgPCBpbWFnZURhdGEud2lkdGg7IGNvbCsrKSB7XHJcbiAgICAgICAgICAgIHZhciBzb3VyY2VQaXhlbCA9IGltYWdlRGF0YS5kYXRhLnN1YmFycmF5KFxyXG4gICAgICAgICAgICAgICAgKHJvdyAqIGltYWdlRGF0YS53aWR0aCArIGNvbCkgKiA0LFxyXG4gICAgICAgICAgICAgICAgKHJvdyAqIGltYWdlRGF0YS53aWR0aCArIGNvbCkgKiA0ICsgNFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgICBmb3IgKHZhciB4ID0gMDsgeCA8IHNjYWxlOyB4KyspIHN1YkxpbmUuc2V0KHNvdXJjZVBpeGVsLCB4ICogNClcclxuICAgICAgICAgICAgZm9yICh2YXIgeSA9IDA7IHkgPCBzY2FsZTsgeSsrKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZGVzdFJvdyA9IHJvdyAqIHNjYWxlICsgeTtcclxuICAgICAgICAgICAgICAgIHZhciBkZXN0Q29sID0gY29sICogc2NhbGU7XHJcbiAgICAgICAgICAgICAgICBzY2FsZWQuZGF0YS5zZXQoc3ViTGluZSwgKGRlc3RSb3cgKiBzY2FsZWQud2lkdGggKyBkZXN0Q29sKSAqIDQpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHNjYWxlZDtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTWluaU1hcDsiLCJmdW5jdGlvbiBTaGFyZCh0aGlzSW5mbywgY2xpZW50KSB7XHJcbiAgICB0aGlzLmlkID0gdGhpc0luZm8uaWQ7XHJcbiAgICB0aGlzLnggPSB0aGlzSW5mby54O1xyXG4gICAgdGhpcy55ID0gdGhpc0luZm8ueTtcclxuICAgIHRoaXMubmFtZSA9IHRoaXNJbmZvLm5hbWU7XHJcbiAgICB0aGlzLnZpc2libGUgPSB0aGlzSW5mby52aXNpYmxlO1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5TaGFyZC5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKHRoaXNJbmZvKSB7XHJcbiAgICB0aGlzLnggPSB0aGlzSW5mby54O1xyXG4gICAgdGhpcy55ID0gdGhpc0luZm8ueTtcclxuICAgIHRoaXMudmlzaWJsZSA9IHRoaXNJbmZvLnZpc2libGU7XHJcbiAgICB0aGlzLm5hbWUgPSB0aGlzSW5mby5uYW1lO1xyXG59O1xyXG5cclxuXHJcblNoYXJkLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50LmRyYWZ0Q3R4O1xyXG4gICAgY3R4LmxpbmVXaWR0aCA9IDI7XHJcblxyXG4gICAgaWYgKHRoaXMudmlzaWJsZSkge1xyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBpZiAodGhpcy5uYW1lICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIGN0eC5mb250ID0gXCIzMHB4IEFyaWFsXCI7XHJcbiAgICAgICAgICAgIGN0eC5maWxsVGV4dCh0aGlzLm5hbWUsIHRoaXMueCwgdGhpcy55KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwicmdiYSgxMDAsIDI1NSwgMjI3LCAwLjEpXCI7XHJcbiAgICAgICAgY3R4LmFyYyh0aGlzLngsIHRoaXMueSwgMjAsIDAsIDIgKiBNYXRoLlBJLCBmYWxzZSk7XHJcbiAgICAgICAgY3R4LmZpbGwoKTtcclxuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcblxyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCIjZGZmZjQyXCI7XHJcblxyXG4gICAgICAgIHZhciByYWRpdXMgPSAxMCwgaTtcclxuICAgICAgICB2YXIgc3RhcnRUaGV0YSA9IGdldFJhbmRvbSgwLCAwLjIpO1xyXG4gICAgICAgIHZhciB0aGV0YSA9IDA7XHJcbiAgICAgICAgdmFyIHN0YXJ0WCA9IHJhZGl1cyAqIE1hdGguY29zKHN0YXJ0VGhldGEpO1xyXG4gICAgICAgIHZhciBzdGFydFkgPSByYWRpdXMgKiBNYXRoLnNpbihzdGFydFRoZXRhKTtcclxuICAgICAgICBjdHgubW92ZVRvKHRoaXMueCArIHN0YXJ0WCwgdGhpcy55ICsgc3RhcnRZKTtcclxuICAgICAgICBmb3IgKGkgPSBNYXRoLlBJIC8gMjsgaSA8PSAyICogTWF0aC5QSSAtIE1hdGguUEkgLyAyOyBpICs9IE1hdGguUEkgLyAyKSB7XHJcbiAgICAgICAgICAgIHRoZXRhID0gc3RhcnRUaGV0YSArIGkgKyBnZXRSYW5kb20oLTEgLyAyNCwgMSAvIDI0KTtcclxuICAgICAgICAgICAgdmFyIHggPSByYWRpdXMgKiBNYXRoLmNvcyh0aGV0YSk7XHJcbiAgICAgICAgICAgIHZhciB5ID0gcmFkaXVzICogTWF0aC5zaW4odGhldGEpO1xyXG4gICAgICAgICAgICBjdHgubGluZVRvKHRoaXMueCArIHgsIHRoaXMueSArIHkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjdHgubGluZVRvKHRoaXMueCArIHN0YXJ0WCwgdGhpcy55ICsgc3RhcnRZKTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgY3R4LmZpbGwoKTtcclxuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0UmFuZG9tKG1pbiwgbWF4KSB7XHJcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pICsgbWluO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNoYXJkOyIsImZ1bmN0aW9uIFRpbGUodGhpc0luZm8sIGNsaWVudCkge1xyXG4gICAgdGhpcy5pZCA9IHRoaXNJbmZvLmlkO1xyXG4gICAgdGhpcy54ID0gdGhpc0luZm8ueDtcclxuICAgIHRoaXMueSA9IHRoaXNJbmZvLnk7XHJcbiAgICB0aGlzLmxlbmd0aCA9IHRoaXNJbmZvLmxlbmd0aDtcclxuICAgIHRoaXMuY29sb3IgPSB0aGlzSW5mby5jb2xvcjtcclxuICAgIHRoaXMuYWxlcnQgPSB0aGlzSW5mby5hbGVydDtcclxuICAgIHRoaXMucmFuZG9tID0gTWF0aC5mbG9vcihnZXRSYW5kb20oMCwgMykpO1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5UaWxlLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAodGhpc0luZm8pIHtcclxuICAgIHRoaXMuY29sb3IgPSB0aGlzSW5mby5jb2xvcjtcclxuICAgIHRoaXMuYWxlcnQgPSB0aGlzSW5mby5hbGVydDtcclxufTtcclxuXHJcblRpbGUucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgY3R4ID0gdGhpcy5jbGllbnQuZHJhZnRDdHg7XHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2IoXCIgK1xyXG4gICAgICAgIHRoaXMuY29sb3IuciArIFwiLFwiICtcclxuICAgICAgICB0aGlzLmNvbG9yLmcgKyBcIixcIiArXHJcbiAgICAgICAgdGhpcy5jb2xvci5iICtcclxuICAgICAgICBcIilcIjtcclxuXHJcbiAgICBjdHgubGluZVdpZHRoID0gMTU7XHJcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSBcIiMxZTJhMmJcIjtcclxuXHJcbiAgICBjdHgucmVjdCh0aGlzLngsIHRoaXMueSwgdGhpcy5sZW5ndGgsIHRoaXMubGVuZ3RoKTtcclxuICAgIGN0eC5zdHJva2UoKTtcclxuICAgIGN0eC5maWxsKCk7XHJcbn07XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBUaWxlO1xyXG5cclxuXHJcbmZ1bmN0aW9uIGdldFJhbmRvbShtaW4sIG1heCkge1xyXG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pbjtcclxufSIsIm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgQW5pbWF0aW9uOiByZXF1aXJlKCcuL0FuaW1hdGlvbicpLFxyXG4gICAgQXJyb3c6IHJlcXVpcmUoJy4vQXJyb3cnKSxcclxuICAgIEJyYWNrZXQ6IHJlcXVpcmUoJy4vQnJhY2tldCcpLFxyXG4gICAgQ29udHJvbGxlcjogcmVxdWlyZSgnLi9Db250cm9sbGVyJyksXHJcbiAgICBGYWN0aW9uOiByZXF1aXJlKCcuL0ZhY3Rpb24nKSxcclxuICAgIEhvbWU6IHJlcXVpcmUoJy4vSG9tZScpLFxyXG4gICAgTGFzZXI6IHJlcXVpcmUoJy4vTGFzZXInKSxcclxuICAgIE1pbmlNYXA6IHJlcXVpcmUoJy4vTWluaU1hcCcpLFxyXG4gICAgU2hhcmQ6IHJlcXVpcmUoJy4vU2hhcmQnKSxcclxuICAgIFRpbGU6IHJlcXVpcmUoJy4vVGlsZScpXHJcbn07IiwidmFyIENsaWVudCA9IHJlcXVpcmUoJy4vQ2xpZW50LmpzJyk7XHJcbnZhciBNYWluVUkgPSByZXF1aXJlKCcuL3VpL01haW5VSScpO1xyXG5cclxudmFyIGNsaWVudCA9IG5ldyBDbGllbnQoKTtcclxuXHJcblxyXG5kb2N1bWVudC5vbmtleWRvd24gPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGNsaWVudC5rZXlzW2V2ZW50LmtleUNvZGVdID0gdHJ1ZTtcclxuICAgIGNsaWVudC5zb2NrZXQuZW1pdCgna2V5RXZlbnQnLCB7aWQ6IGV2ZW50LmtleUNvZGUsIHN0YXRlOiB0cnVlfSk7XHJcbn07XHJcblxyXG5kb2N1bWVudC5vbmtleXVwID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICBjbGllbnQua2V5c1tldmVudC5rZXlDb2RlXSA9IGZhbHNlO1xyXG4gICAgY2xpZW50LnNvY2tldC5lbWl0KCdrZXlFdmVudCcsIHtpZDogZXZlbnQua2V5Q29kZSwgc3RhdGU6IGZhbHNlfSk7XHJcbn07XHJcblxyXG5cclxuJCh3aW5kb3cpLmJpbmQoJ21vdXNld2hlZWwgRE9NTW91c2VTY3JvbGwnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGlmIChldmVudC5jdHJsS2V5ID09PSB0cnVlKSB7XHJcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgIH1cclxuXHJcbiAgICBpZihldmVudC5vcmlnaW5hbEV2ZW50LndoZWVsRGVsdGEgLzEyMCA+IDAgJiYgY2xpZW50Lm1haW5TY2FsZUZhY3RvciA8IDIpIHtcclxuICAgICAgICBjbGllbnQubWFpblNjYWxlRmFjdG9yICs9IDAuMjtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKGNsaWVudC5tYWluU2NhbGVGYWN0b3IgPiAwLjcpIHtcclxuICAgICAgICBjbGllbnQubWFpblNjYWxlRmFjdG9yIC09IDAuMjtcclxuICAgIH1cclxufSk7XHJcblxyXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdjb250ZXh0bWVudScsIGZ1bmN0aW9uIChlKSB7IC8vcHJldmVudCByaWdodC1jbGljayBjb250ZXh0IG1lbnVcclxuICAgIGUucHJldmVudERlZmF1bHQoKTtcclxufSwgZmFsc2UpOyIsImRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nOyAgLy8gZmlyZWZveCwgY2hyb21lXHJcbmRvY3VtZW50LmJvZHkuc2Nyb2xsID0gXCJub1wiO1xyXG52YXIgUGxheWVyTmFtZXJVSSA9IHJlcXVpcmUoJy4vUGxheWVyTmFtZXJVSScpO1xyXG52YXIgU2hhcmROYW1lclVJID0gcmVxdWlyZSgnLi9TaGFyZE5hbWVyVUknKTtcclxudmFyIEdhbWVVSSA9IHJlcXVpcmUoJy4vZ2FtZS9HYW1lVUknKTtcclxudmFyIEhvbWVVSSA9IHJlcXVpcmUoXCIuL2hvbWUvSG9tZVVJXCIpO1xyXG5cclxuZnVuY3Rpb24gTWFpblVJKGNsaWVudCwgc29ja2V0KSB7XHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxuICAgIHRoaXMuc29ja2V0ID0gc29ja2V0O1xyXG5cclxuXHJcblxyXG4gICAgdGhpcy5wbGF5ZXJOYW1lclVJID0gbmV3IFBsYXllck5hbWVyVUkodGhpcy5jbGllbnQsIHRoaXMuc29ja2V0KTtcclxuICAgIHRoaXMuZ2FtZVVJID0gbmV3IEdhbWVVSSh0aGlzLmNsaWVudCwgdGhpcy5zb2NrZXQpO1xyXG4gICAgdGhpcy5zaGFyZE5hbWVyVUkgPSBuZXcgU2hhcmROYW1lclVJKHRoaXMuY2xpZW50LCB0aGlzLnNvY2tldCk7XHJcbiAgICB0aGlzLmhvbWVVSSA9IG5ldyBIb21lVUkodGhpcy5jbGllbnQsIHRoaXMuc29ja2V0KTtcclxufVxyXG5cclxuTWFpblVJLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKGluZm8pIHtcclxuICAgIHZhciBhY3Rpb24gPSBpbmZvLmFjdGlvbjtcclxuICAgIHZhciBob21lO1xyXG5cclxuICAgIGlmIChhY3Rpb24gPT09IFwibmFtZSBzaGFyZFwiKSB7XHJcbiAgICAgICAgdGhpcy5zaGFyZE5hbWVyVUkub3BlbigpO1xyXG4gICAgfVxyXG4gICAgaWYgKGFjdGlvbiA9PT0gXCJob21lIGluZm9cIikge1xyXG4gICAgICAgIGhvbWUgPSB0aGlzLmNsaWVudC5IT01FX0xJU1RbaW5mby5ob21lSWRdO1xyXG4gICAgICAgIHRoaXMuaG9tZVVJLm9wZW4oaG9tZSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuTWFpblVJLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uIChhY3Rpb24pIHtcclxuICAgIGlmIChhY3Rpb24gPT09IFwibmFtZSBzaGFyZFwiKSB7XHJcbiAgICAgICAgdGhpcy5zaGFyZE5hbWVyVUkuY2xvc2UoKTtcclxuICAgIH1cclxuICAgIGlmIChhY3Rpb24gPT09IFwiaG9tZSBpbmZvXCIpIHtcclxuICAgICAgICB0aGlzLkxJU1RfU0NST0xMID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5ob21lVUkuY2xvc2UoKTtcclxuICAgICAgICB0aGlzLnNvY2tldC5lbWl0KFwicmVtb3ZlVmlld2VyXCIsIHt9KTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5NYWluVUkucHJvdG90eXBlLnVwZGF0ZUxlYWRlckJvYXJkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGxlYWRlcmJvYXJkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsZWFkZXJib2FyZFwiKTtcclxuICAgIGxlYWRlcmJvYXJkLmlubmVySFRNTCA9IFwiXCI7XHJcbiAgICBmb3IgKHZhciBpID0gRkFDVElPTl9BUlJBWS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG4gICAgICAgIHZhciBmYWN0aW9uID0gRkFDVElPTl9BUlJBWVtpXTtcclxuXHJcbiAgICAgICAgdmFyIGVudHJ5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcclxuICAgICAgICBlbnRyeS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShmYWN0aW9uLm5hbWUpKTtcclxuICAgICAgICBsZWFkZXJib2FyZC5hcHBlbmRDaGlsZChlbnRyeSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuXHJcblxyXG4vKiogREVQUkVDQVRFRCBNRVRIT0RTICoqL1xyXG5NYWluVUkucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIChpbmZvKSB7XHJcbiAgICB2YXIgYWN0aW9uID0gaW5mby5hY3Rpb247XHJcbiAgICBpZiAoYWN0aW9uID09PSBcInVwZGF0ZSBxdWV1ZVwiKSB7XHJcbiAgICAgICAgdGhpcy5ob21lVUkuYnVpbGRQYWdlLnVwZGF0ZSgpO1xyXG4gICAgICAgIHRoaXMuaG9tZVVJLmJvdHNQYWdlLnVwZGF0ZSgpO1xyXG4gICAgICAgIC8vdGhpcy5ob21lVUkudXBncmFkZXNQYWdlLnVwZGF0ZSgpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE1haW5VSTsiLCJmdW5jdGlvbiBQbGF5ZXJOYW1lclVJIChjbGllbnQsIHNvY2tldCkge1xyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbiAgICB0aGlzLnNvY2tldCA9IHNvY2tldDtcclxuXHJcbiAgICB0aGlzLmxlYWRlcmJvYXJkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsZWFkZXJib2FyZF9jb250YWluZXJcIik7XHJcbiAgICB0aGlzLm5hbWVCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm5hbWVTdWJtaXRcIik7XHJcbiAgICB0aGlzLnBsYXllck5hbWVJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicGxheWVyTmFtZUlucHV0XCIpO1xyXG4gICAgdGhpcy5mYWN0aW9uTmFtZUlucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJmYWN0aW9uTmFtZUlucHV0XCIpO1xyXG4gICAgdGhpcy5wbGF5ZXJOYW1lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicGxheWVyX25hbWVyXCIpO1xyXG59XHJcblxyXG5QbGF5ZXJOYW1lclVJLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKCkge1xyXG5cclxuICAgIHRoaXMucGxheWVyTmFtZUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSAxMykge1xyXG4gICAgICAgICAgICB0aGlzLmZhY3Rpb25OYW1lSW5wdXQuZm9jdXMoKTtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMuZmFjdGlvbk5hbWVJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwia2V5dXBcIiwgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMpIHtcclxuICAgICAgICAgICAgdGhpcy5uYW1lQnRuLmNsaWNrKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICB0aGlzLm5hbWVCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLmNsaWVudC5tYWluQ2FudmFzLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgICAgICB0aGlzLmxlYWRlcmJvYXJkLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgICAgICB0aGlzLnNvY2tldC5lbWl0KFwibmV3UGxheWVyXCIsXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IHRoaXMucGxheWVyTmFtZUlucHV0LnZhbHVlLFxyXG4gICAgICAgICAgICAgICAgZmFjdGlvbjogdGhpcy5mYWN0aW9uTmFtZUlucHV0LnZhbHVlXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMucGxheWVyTmFtZXIuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG4gICAgdGhpcy5wbGF5ZXJOYW1lci5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICB0aGlzLnBsYXllck5hbWVJbnB1dC5mb2N1cygpO1xyXG4gICAgdGhpcy5sZWFkZXJib2FyZC5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUGxheWVyTmFtZXJVSTsiLCJ2YXIgdWkgPSByZXF1aXJlKCcuL1NoYXJkTmFtZXJVSScpO1xyXG5cclxuZnVuY3Rpb24gU2hhcmROYW1lclVJKGNsaWVudCwgc29ja2V0KSB7XHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxuICAgIHRoaXMuc29ja2V0ID0gc29ja2V0O1xyXG5cclxuICAgIHRoaXMuc2hhcmROYW1lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzaGFyZF9uYW1lcl91aScpO1xyXG4gICAgdGhpcy50ZXh0SW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInRleHRJbnB1dFwiKTtcclxuICAgIHRoaXMubmFtZVNoYXJkQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJuYW1lU2hhcmRCdG5cIik7XHJcbn1cclxuXHJcblNoYXJkTmFtZXJVSS5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBzaGFyZE5hbWVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NoYXJkX25hbWVyX3VpJyk7XHJcbiAgICB2YXIgdGV4dElucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0ZXh0SW5wdXRcIik7XHJcbiAgICB2YXIgbmFtZVNoYXJkQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJuYW1lU2hhcmRCdG5cIik7XHJcblxyXG4gICAgc2hhcmROYW1lci5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcclxuXHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5dXBcIiwgdGhpcy5mb2N1c1RleHRJbnB1dCk7XHJcblxyXG4gICAgdGV4dElucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSAxMykge1xyXG4gICAgICAgICAgICB2YXIgdGV4dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidGV4dElucHV0XCIpLnZhbHVlO1xyXG4gICAgICAgICAgICBpZiAodGV4dCAhPT0gbnVsbCAmJiB0ZXh0ICE9PSBcIlwiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNvY2tldC5lbWl0KCd0ZXh0SW5wdXQnLFxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IHNlbGZJZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgd29yZDogdGV4dFxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB1aS5jbG9zZVVJKFwibmFtZSBzaGFyZFwiKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufTtcclxuXHJcblNoYXJkTmFtZXJVSS5wcm90b3R5cGUuZm9jdXNUZXh0SW5wdXQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMpIHtcclxuICAgICAgICB0ZXh0SW5wdXQuZm9jdXMoKTtcclxuICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwia2V5dXBcIiwgZm9jdXNUZXh0SW5wdXQpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuU2hhcmROYW1lclVJLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMudGV4dElucHV0LnZhbHVlID0gXCJcIjtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU2hhcmROYW1lclVJO1xyXG4iLCJmdW5jdGlvbiBHYW1lVUkoKSB7XHJcblxyXG59XHJcblxyXG5HYW1lVUkucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgc2hhcmROYW1lclByb21wdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzaGFyZF9uYW1lcl9wcm9tcHQnKTtcclxuICAgIHNoYXJkTmFtZXJQcm9tcHQuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBvcGVuU2hhcmROYW1lclVJKCk7XHJcbiAgICB9KTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gIEdhbWVVSTsiLCJ2YXIgTGlzdFVJID0gcmVxdWlyZSgnLi9MaXN0VUknKTtcclxuXHJcbmZ1bmN0aW9uIEJvdHNQYWdlKGhvbWVVSSkge1xyXG4gICAgdGhpcy50ZW1wbGF0ZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYm90c19wYWdlXCIpO1xyXG4gICAgdGhpcy5ib3RzTGlzdFVJID0gbmV3IExpc3RVSShkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYm90c19saXN0JyksIGhvbWVVSSk7XHJcbiAgICB0aGlzLmhvbWVVSSA9IGhvbWVVSTtcclxufVxyXG5cclxuQm90c1BhZ2UucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcbiAgICBpZiAodGhpcy5ob21lVUkuaG9tZS50eXBlID09PSBcIkJhcnJhY2tzXCIpIHtcclxuICAgICAgICB0aGlzLmJvdHNMaXN0VUkuYWRkQm90cygpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQm90c1BhZ2UucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy50ZW1wbGF0ZS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcbn07XHJcblxyXG5Cb3RzUGFnZS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgaWYgKHRoaXMuaG9tZVVJLmhvbWUudHlwZSA9PT0gXCJCYXJyYWNrc1wiKSB7XHJcbiAgICAgICAgdGhpcy5ib3RzTGlzdFVJLmFkZEJvdHMoKTtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQm90c1BhZ2U7XHJcblxyXG4iLCJ2YXIgTGlzdFVJID0gcmVxdWlyZSgnLi9MaXN0VUknKTtcclxuXHJcblxyXG5mdW5jdGlvbiBCdWlsZFBhZ2UoaG9tZVVJKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjcmVhdGVfcGFnZVwiKTtcclxuICAgIHRoaXMuY3JlYXRlQm90ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjcmVhdGVfYm90X2NvbnRhaW5lclwiKTtcclxuICAgIHRoaXMubWFrZVNvbGRpZXJCb3RzQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21ha2Vfc29sZGllcl9ib3RzX2J0bicpO1xyXG4gICAgdGhpcy5tYWtlQm9vc3RlckJvdHNCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFrZV9ib29zdGVyX2JvdHNfYnRuJyk7XHJcbiAgICB0aGlzLm1ha2VTdGVhbHRoQm90c0J0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYWtlX3N0ZWFsdGhfYm90c19idG4nKTtcclxuICAgIHRoaXMuc29ja2V0ID0gaG9tZVVJLnNvY2tldDtcclxuXHJcbiAgICB0aGlzLlNFTEVDVEVEX1NIQVJEUyA9IHt9O1xyXG4gICAgdGhpcy5idWlsZFF1ZXVlVUkgPSBuZXcgTGlzdFVJKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdidWlsZF9xdWV1ZScpLCBob21lVUkpO1xyXG4gICAgdGhpcy5zaGFyZHNVSSA9IG5ldyBMaXN0VUkoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2J1aWxkX3NoYXJkc19saXN0JyksIGhvbWVVSSwgdGhpcyk7XHJcbiAgICB0aGlzLmhvbWVVSSA9IGhvbWVVSTtcclxufVxyXG5cclxuXHJcbkJ1aWxkUGFnZS5wcm90b3R5cGUuY2hlY2tTZWxlY3Rpb24gPSBmdW5jdGlvbiAoaW5wdXQpIHtcclxuICAgIHZhciBtYWtlU29sZGllckJvdHNCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFrZV9zb2xkaWVyX2JvdHNfYnRuJyk7XHJcbiAgICB2YXIgbWFrZUJvb3N0ZXJCb3RzQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21ha2VfYm9vc3Rlcl9ib3RzX2J0bicpO1xyXG4gICAgdmFyIG1ha2VTdGVhbHRoQm90c0J0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYWtlX3N0ZWFsdGhfYm90c19idG4nKTtcclxuXHJcbiAgICBpZiAoaW5wdXQgPiAwKSB7XHJcbiAgICAgICAgbWFrZVNvbGRpZXJCb3RzQnRuLmRpc2FibGVkID0gZmFsc2U7XHJcbiAgICAgICAgbWFrZUJvb3N0ZXJCb3RzQnRuLmRpc2FibGVkID0gZmFsc2U7XHJcbiAgICAgICAgbWFrZVN0ZWFsdGhCb3RzQnRuLmRpc2FibGVkID0gZmFsc2U7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIG1ha2VTb2xkaWVyQm90c0J0bi5kaXNhYmxlZCA9IFwiZGlzYWJsZWRcIjtcclxuICAgICAgICBtYWtlQm9vc3RlckJvdHNCdG4uZGlzYWJsZWQgPSBcImRpc2FibGVkXCI7XHJcbiAgICAgICAgbWFrZVN0ZWFsdGhCb3RzQnRuLmRpc2FibGVkID0gXCJkaXNhYmxlZFwiO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQnVpbGRQYWdlLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy50ZW1wbGF0ZS5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xyXG4gICAgdGhpcy5TRUxFQ1RFRF9TSEFSRFMgPSB7fTtcclxuXHJcbiAgICB2YXIgbWFrZVNvbGRpZXJCb3RzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoJ21ha2VCb3RzJywge1xyXG4gICAgICAgICAgICBib3RUeXBlOiBcInNvbGRpZXJcIixcclxuICAgICAgICAgICAgaG9tZTogdGhpcy5ob21lVUkuaG9tZS5pZCxcclxuICAgICAgICAgICAgc2hhcmRzOiB0aGlzLlNFTEVDVEVEX1NIQVJEU1xyXG4gICAgICAgIH0pO1xyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG4gICAgdmFyIG1ha2VCb29zdGVyQm90cyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLnNvY2tldC5lbWl0KCdtYWtlQm90cycsIHtcclxuICAgICAgICAgICAgYm90VHlwZTogXCJib29zdGVyXCIsXHJcbiAgICAgICAgICAgIGhvbWU6IHRoaXMuaG9tZVVJLmhvbWUuaWQsXHJcbiAgICAgICAgICAgIHNoYXJkczogdGhpcy5TRUxFQ1RFRF9TSEFSRFNcclxuICAgICAgICB9KVxyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG4gICAgdmFyIG1ha2VTdGVhbHRoQm90cyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLnNvY2tldC5lbWl0KCdtYWtlQm90cycsIHtcclxuICAgICAgICAgICAgYm90VHlwZTogXCJzdGVhbHRoXCIsXHJcbiAgICAgICAgICAgIGhvbWU6IHRoaXMuaG9tZVVJLmhvbWUuaWQsXHJcbiAgICAgICAgICAgIHNoYXJkczogdGhpcy5TRUxFQ1RFRF9TSEFSRFNcclxuICAgICAgICB9KVxyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG5cclxuICAgIGlmICh0aGlzLmhvbWVVSS5ob21lLnR5cGUgPT09IFwiQmFycmFja3NcIikge1xyXG4gICAgICAgIHRoaXMubWFrZVNvbGRpZXJCb3RzQnRuID0gdGhpcy5ob21lVUkucmVzZXRCdXR0b24odGhpcy5tYWtlU29sZGllckJvdHNCdG4sIG1ha2VTb2xkaWVyQm90cyk7XHJcbiAgICAgICAgdGhpcy5tYWtlQm9vc3RlckJvdHNCdG4gPSB0aGlzLmhvbWVVSS5yZXNldEJ1dHRvbih0aGlzLm1ha2VCb29zdGVyQm90c0J0biwgbWFrZUJvb3N0ZXJCb3RzKTtcclxuICAgICAgICB0aGlzLm1ha2VTdGVhbHRoQm90c0J0biA9IHRoaXMuaG9tZVVJLnJlc2V0QnV0dG9uKHRoaXMubWFrZVN0ZWFsdGhCb3RzQnRuLCBtYWtlU3RlYWx0aEJvdHMpO1xyXG5cclxuICAgICAgICB0aGlzLmNyZWF0ZUJvdC5zdHlsZS5kaXNwbGF5ID0gXCJmbGV4XCI7XHJcbiAgICAgICAgdGhpcy5idWlsZFF1ZXVlVUkuYWRkUXVldWUodGhpcy5ob21lVUkuaG9tZSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMuY3JlYXRlQm90LnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuICAgIH1cclxuICAgIHRoaXMuc2hhcmRzVUkuYWRkU2hhcmRzKCk7XHJcbn07XHJcblxyXG5CdWlsZFBhZ2UucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy50ZW1wbGF0ZS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcbn07XHJcblxyXG5cclxuQnVpbGRQYWdlLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLmJ1aWxkUXVldWVVSS5hZGRRdWV1ZSgpO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBCdWlsZFBhZ2U7XHJcblxyXG4iLCJ2YXIgVXBncmFkZXNQYWdlID0gcmVxdWlyZSgnLi9VcGdyYWRlc1BhZ2UnKTtcclxudmFyIEJvdHNQYWdlID0gcmVxdWlyZSgnLi9Cb3RzUGFnZScpO1xyXG52YXIgQnVpbGRQYWdlID0gcmVxdWlyZSgnLi9CdWlsZFBhZ2UnKTtcclxuXHJcbmZ1bmN0aW9uIEhvbWVVSShjbGllbnQsIHNvY2tldCkge1xyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbiAgICB0aGlzLnNvY2tldCA9IHNvY2tldDtcclxuICAgIHRoaXMudGVtcGxhdGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaG9tZV91aScpO1xyXG4gICAgdGhpcy5ob21lID0gbnVsbDtcclxufVxyXG5cclxuSG9tZVVJLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKGhvbWUpIHtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XHJcbiAgICB0aGlzLmhvbWUgPSBob21lO1xyXG5cclxuICAgIGlmICghdGhpcy51cGdyYWRlc1BhZ2UpIHtcclxuICAgICAgICB0aGlzLnVwZ3JhZGVzUGFnZSA9IG5ldyBVcGdyYWRlc1BhZ2UodGhpcyk7XHJcbiAgICAgICAgdGhpcy5ib3RzUGFnZSA9IG5ldyBCb3RzUGFnZSh0aGlzKTtcclxuICAgICAgICB0aGlzLmJ1aWxkUGFnZSA9IG5ldyBCdWlsZFBhZ2UodGhpcyk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkVGFiTGlzdGVuZXJzKCk7XHJcbiAgICAgICAgdGhpcy5hZGRDbG9zZUxpc3RlbmVyKCk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5vcGVuSG9tZUluZm8oKTtcclxuICAgIHRoaXMudXBncmFkZXNQYWdlLm9wZW4oKTtcclxuICAgIHRoaXMuYnVpbGRQYWdlLmNsb3NlKCk7XHJcbiAgICB0aGlzLmJvdHNQYWdlLmNsb3NlKCk7XHJcblxyXG4gICAgLy90aGlzLm9wZW5Db2xvclBpY2tlcihob21lKTtcclxufTtcclxuXHJcbkhvbWVVSS5wcm90b3R5cGUub3BlbkhvbWVJbmZvID0gZnVuY3Rpb24gKCkge1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2hvbWVfdHlwZScpLmlubmVySFRNTCA9IHRoaXMuaG9tZS50eXBlO1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2hvbWVfbGV2ZWwnKS5pbm5lckhUTUwgPSB0aGlzLmhvbWUubGV2ZWw7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaG9tZV9oZWFsdGgnKS5pbm5lckhUTUwgPSB0aGlzLmhvbWUuaGVhbHRoO1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2hvbWVfcG93ZXInKS5pbm5lckhUTUwgPSB0aGlzLmhvbWUucG93ZXI7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaG9tZV9mYWN0aW9uX25hbWUnKS5pbm5lckhUTUwgPSB0aGlzLmhvbWUuZmFjdGlvbjtcclxufTtcclxuXHJcbkhvbWVVSS5wcm90b3R5cGUub3BlbkNvbG9yUGlja2VyID0gZnVuY3Rpb24gKGhvbWUpIHtcclxuICAgIHZhciBjb2xvclBpY2tlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY29sb3JfcGlja2VyXCIpO1xyXG4gICAgdmFyIGNvbG9yQ2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjb2xvcl9jYW52YXNcIik7XHJcbiAgICB2YXIgY29sb3JDdHggPSBjb2xvckNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XHJcblxyXG4gICAgY29sb3JDYW52YXMud2lkdGggPSAxMDA7XHJcbiAgICBjb2xvckNhbnZhcy5oZWlnaHQgPSAxMDA7XHJcblxyXG4gICAgaWYgKCFob21lLmhhc0NvbG9yICYmIGhvbWUubGV2ZWwgPiAxKSB7XHJcbiAgICAgICAgY29sb3JQaWNrZXIuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIGNvbG9yUGlja2VyLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB2YXIgY29sb3JzID0gbmV3IEltYWdlKCk7XHJcbiAgICBjb2xvcnMuc3JjID0gJ2NvbG9ycy5qcGcnO1xyXG4gICAgY29sb3JzLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBjb2xvckN0eC5maWxsU3R5bGUgPSBcIiMzMzNlZWVcIjtcclxuICAgICAgICBjb2xvckN0eC5maWxsUmVjdCgwLCAwLCBjb2xvckNhbnZhcy53aWR0aCAvIDIsIGNvbG9yQ2FudmFzLmhlaWdodCAvIDIpO1xyXG4gICAgICAgIGNvbG9yQ3R4LmZpbGxTdHlsZSA9IFwiIzYyM2VlZVwiO1xyXG4gICAgICAgIGNvbG9yQ3R4LmZpbGxSZWN0KGNvbG9yQ2FudmFzLndpZHRoIC8gMiwgY29sb3JDYW52YXMuaGVpZ2h0IC8gMiwgY29sb3JDYW52YXMud2lkdGgsIGNvbG9yQ2FudmFzLmhlaWdodCk7XHJcbiAgICB9O1xyXG5cclxuICAgIGNvbG9yQ2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICB2YXIgcmVjdCA9IGNvbG9yQ2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgICAgIHZhciB4ID0gZXZlbnQuY2xpZW50WCAtIHJlY3QubGVmdDtcclxuICAgICAgICB2YXIgeSA9IGV2ZW50LmNsaWVudFkgLSByZWN0LnRvcDtcclxuICAgICAgICB2YXIgaW1nX2RhdGEgPSBjb2xvckN0eC5nZXRJbWFnZURhdGEoeCwgeSwgMTAwLCAxMDApLmRhdGE7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQuZW1pdChcIm5ld0NvbG9yXCIsIHtcclxuICAgICAgICAgICAgaG9tZTogaG9tZS5pZCxcclxuICAgICAgICAgICAgY29sb3I6IHtcclxuICAgICAgICAgICAgICAgIHI6IGltZ19kYXRhWzBdLFxyXG4gICAgICAgICAgICAgICAgZzogaW1nX2RhdGFbMV0sXHJcbiAgICAgICAgICAgICAgICBiOiBpbWdfZGF0YVsyXVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG59O1xyXG5cclxuSG9tZVVJLnByb3RvdHlwZS5hZGRUYWJMaXN0ZW5lcnMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgdXBncmFkZXNUYWIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndXBncmFkZXNfdGFiJyk7XHJcbiAgICB2YXIgY3JlYXRlVGFiID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NyZWF0ZV90YWInKTtcclxuICAgIHZhciBib3RzVGFiID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JvdHNfdGFiJyk7XHJcblxyXG4gICAgdXBncmFkZXNUYWIuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZXZ0KSB7XHJcbiAgICAgICAgdGhpcy51cGdyYWRlc1BhZ2Uub3BlbigpO1xyXG4gICAgICAgIHRoaXMuYnVpbGRQYWdlLmNsb3NlKCk7XHJcbiAgICAgICAgdGhpcy5ib3RzUGFnZS5jbG9zZSgpO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICBjcmVhdGVUYWIuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZXZ0KSB7XHJcbiAgICAgICAgdGhpcy51cGdyYWRlc1BhZ2UuY2xvc2UoKTtcclxuICAgICAgICB0aGlzLmJ1aWxkUGFnZS5vcGVuKCk7XHJcbiAgICAgICAgdGhpcy5ib3RzUGFnZS5jbG9zZSgpO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICBib3RzVGFiLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGV2dCkge1xyXG4gICAgICAgIHRoaXMudXBncmFkZXNQYWdlLmNsb3NlKCk7XHJcbiAgICAgICAgdGhpcy5idWlsZFBhZ2UuY2xvc2UoKTtcclxuICAgICAgICB0aGlzLmJvdHNQYWdlLm9wZW4oKTtcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcbn07XHJcblxyXG5Ib21lVUkucHJvdG90eXBlLmFkZENsb3NlTGlzdGVuZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgY2xvc2VCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNsb3NlX2hvbWVfdWlcIik7XHJcbiAgICBjbG9zZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuY2xpZW50Lm1haW5VSS5jbG9zZShcImhvbWUgaW5mb1wiKTtcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcbn07XHJcblxyXG5Ib21lVUkucHJvdG90eXBlLnJlc2V0QnV0dG9uID0gZnVuY3Rpb24gKGJ1dHRvbiwgY2FsbGJhY2spIHtcclxuICAgIHZhciBzZXRTa2lsbE1ldGVyID0gZnVuY3Rpb24gKGJ1dHRvbikge1xyXG4gICAgICAgIHZhciBmaW5kQ2hpbGRDYW52YXMgPSBmdW5jdGlvbiAoc2tpbGxEaXYpIHtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBza2lsbERpdi5jaGlsZE5vZGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoc2tpbGxEaXYuY2hpbGROb2Rlc1tpXS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSBcImNhbnZhc1wiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNraWxsRGl2LmNoaWxkTm9kZXNbaV07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfTtcclxuICAgICAgICB2YXIgY2FudmFzID0gZmluZENoaWxkQ2FudmFzKGJ1dHRvbi5wYXJlbnROb2RlKTtcclxuICAgICAgICBjYW52YXMud2lkdGggPSAyNjA7XHJcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IDEwMDtcclxuICAgICAgICB2YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuICAgICAgICBjdHguY2xlYXJSZWN0KDAsIDAsIDEwMDAsIDIwMCk7XHJcbiAgICAgICAgdmFyIG1hZ25pdHVkZSA9IDA7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiI0ZGRkZGRlwiO1xyXG4gICAgICAgIHN3aXRjaCAoYnV0dG9uLnVwZ1R5cGUpIHtcclxuICAgICAgICAgICAgY2FzZSBcImhvbWVIZWFsdGhcIjpcclxuICAgICAgICAgICAgICAgIG1hZ25pdHVkZSA9IHRoaXMuaG9tZS5wb3dlcjtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwiZG1nXCI6XHJcbiAgICAgICAgICAgICAgICBtYWduaXR1ZGUgPSB0aGlzLmhvbWUudW5pdERtZztcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwiYXJtb3JcIjpcclxuICAgICAgICAgICAgICAgIG1hZ25pdHVkZSA9IHRoaXMuaG9tZS51bml0QXJtb3I7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcInNwZWVkXCI6XHJcbiAgICAgICAgICAgICAgICBtYWduaXR1ZGUgPSB0aGlzLmhvbWUudW5pdFNwZWVkO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgIH1cclxuICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgbWFnbml0dWRlICogMTAsIDIwMCk7XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcbiAgICB2YXIgbmV3QnV0dG9uID0gYnV0dG9uLmNsb25lTm9kZSh0cnVlKTtcclxuICAgIG5ld0J1dHRvbi51cGdUeXBlID0gYnV0dG9uLnVwZ1R5cGU7XHJcblxyXG4gICAgYnV0dG9uLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG5ld0J1dHRvbiwgYnV0dG9uKTtcclxuICAgIGJ1dHRvbiA9IG5ld0J1dHRvbjtcclxuICAgIGJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGNhbGxiYWNrKTtcclxuICAgIGlmIChidXR0b24udXBnVHlwZSkge1xyXG4gICAgICAgIHNldFNraWxsTWV0ZXIoYnV0dG9uKTtcclxuICAgIH1cclxuICAgIHJldHVybiBidXR0b247XHJcbn07XHJcblxyXG5Ib21lVUkucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy50ZW1wbGF0ZS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBIb21lVUk7XHJcbiIsImZ1bmN0aW9uIExpc3RVSShsaXN0LCBob21lVUksIHBhcmVudCkge1xyXG4gICAgdGhpcy5saXN0ID0gbGlzdDtcclxuICAgIHRoaXMuaG9tZVVJID0gaG9tZVVJO1xyXG4gICAgdGhpcy5jbGllbnQgPSBob21lVUkuY2xpZW50O1xyXG4gICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XHJcblxyXG4gICAgdGhpcy5saXN0LmFkZEV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIHRoaXMuaG9tZVVJLkxJU1RfU0NST0xMID0gdHJ1ZTtcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcbn1cclxuXHJcbkxpc3RVSS5wcm90b3R5cGUuYWRkUXVldWUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgaG9tZSA9IHRoaXMuaG9tZVVJLmhvbWU7XHJcbiAgICB0aGlzLmxpc3QuaW5uZXJIVE1MID0gXCJcIjtcclxuICAgIGlmICghaG9tZS5xdWV1ZSkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaG9tZS5xdWV1ZS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciBidWlsZEluZm8gPSBob21lLnF1ZXVlW2ldO1xyXG4gICAgICAgIHZhciBlbnRyeSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XHJcbiAgICAgICAgZW50cnkuaWQgPSBNYXRoLnJhbmRvbSgpO1xyXG5cclxuICAgICAgICAoZnVuY3Rpb24gKF9pZCkge1xyXG4gICAgICAgICAgICBlbnRyeS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmNsaWNrZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNsaWNrZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3R5bGUuYmFja2dyb3VuZCA9IFwiI2ZmZmIyMlwiO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGlja2VkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdHlsZS5iYWNrZ3JvdW5kID0gXCIjNTQyZmNlXCI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pKGVudHJ5LmlkKTtcclxuXHJcbiAgICAgICAgZW50cnkuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoXHJcbiAgICAgICAgICAgIGJ1aWxkSW5mby5zaGFyZE5hbWUgKyBcIiAtLSBcIiArIE1hdGguZmxvb3IoYnVpbGRJbmZvLnRpbWVyIC8gMTAwMCkgK1xyXG4gICAgICAgICAgICBcIjpcIiArIE1hdGguZmxvb3IoYnVpbGRJbmZvLnRpbWVyICUgMTAwMCkpKTtcclxuICAgICAgICB0aGlzLmxpc3QuYXBwZW5kQ2hpbGQoZW50cnkpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuTGlzdFVJLnByb3RvdHlwZS5hZGRCb3RzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGhvbWUgPSB0aGlzLmhvbWVVSS5ob21lO1xyXG4gICAgdGhpcy5saXN0LmlubmVySFRNTCA9IFwiXCI7XHJcbiAgICBpZiAoIWhvbWUucXVldWUpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGhvbWUuYm90cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciBib3RJbmZvID0gaG9tZS5ib3RzW2ldO1xyXG4gICAgICAgIHZhciBlbnRyeSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XHJcbiAgICAgICAgZW50cnkuaWQgPSBNYXRoLnJhbmRvbSgpO1xyXG5cclxuICAgICAgICAoZnVuY3Rpb24gKF9pZCkge1xyXG4gICAgICAgICAgICBlbnRyeS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmNsaWNrZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNsaWNrZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3R5bGUuYmFja2dyb3VuZCA9IFwiI2ZmZmIyMlwiO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGlja2VkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdHlsZS5iYWNrZ3JvdW5kID0gXCIjNTQyZmNlXCI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pKGVudHJ5LmlkKTtcclxuXHJcbiAgICAgICAgZW50cnkuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoXHJcbiAgICAgICAgICAgIGJvdEluZm8ubmFtZSArIFwiIC0tIFwiICsgXCJMZXZlbDpcIiArIGJvdEluZm8ubGV2ZWwpKTtcclxuICAgICAgICB0aGlzLmxpc3QuYXBwZW5kQ2hpbGQoZW50cnkpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuTGlzdFVJLnByb3RvdHlwZS5hZGRTaGFyZHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgaG9tZSA9IHRoaXMuaG9tZVVJLmhvbWU7XHJcbiAgICB2YXIgU0VMRUNURURfU0hBUkRTID0gdGhpcy5wYXJlbnQuU0VMRUNURURfU0hBUkRTO1xyXG4gICAgdGhpcy5saXN0LmlubmVySFRNTCA9IFwiXCI7XHJcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IGhvbWUuc2hhcmRzLmxlbmd0aDsgaisrKSB7XHJcbiAgICAgICAgdmFyIGVudHJ5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcclxuICAgICAgICB2YXIgc2hhcmQgPSB0aGlzLmNsaWVudC5TSEFSRF9MSVNUW2hvbWUuc2hhcmRzW2pdXTtcclxuXHJcbiAgICAgICAgdmFyIGNoZWNrU2VsZWN0aW9uID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB0aGlzLnBhcmVudC5jaGVja1NlbGVjdGlvbihPYmplY3Quc2l6ZShTRUxFQ1RFRF9TSEFSRFMpKTtcclxuICAgICAgICB9LmJpbmQodGhpcyk7XHJcblxyXG5cclxuICAgICAgICBlbnRyeS5pZCA9IHNoYXJkLmlkO1xyXG5cclxuICAgICAgICAoZnVuY3Rpb24gKF9pZCkge1xyXG4gICAgICAgICAgICBlbnRyeS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmNsaWNrZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNsaWNrZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3R5bGUuYmFja2dyb3VuZCA9IFwiI2ZmZmIyMlwiO1xyXG4gICAgICAgICAgICAgICAgICAgIFNFTEVDVEVEX1NIQVJEU1tfaWRdID0gX2lkO1xyXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrU2VsZWN0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNsaWNrZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0eWxlLmJhY2tncm91bmQgPSBcIiM1NDJmY2VcIjtcclxuICAgICAgICAgICAgICAgICAgICBkZWxldGUgU0VMRUNURURfU0hBUkRTW2VudHJ5LmlkXTtcclxuICAgICAgICAgICAgICAgICAgICBjaGVja1NlbGVjdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KShlbnRyeS5pZCk7XHJcblxyXG4gICAgICAgIGVudHJ5LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHNoYXJkLm5hbWUpKTtcclxuICAgICAgICB0aGlzLmxpc3QuYXBwZW5kQ2hpbGQoZW50cnkpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTGlzdFVJO1xyXG5cclxuT2JqZWN0LnNpemUgPSBmdW5jdGlvbihvYmopIHtcclxuICAgIHZhciBzaXplID0gMCwga2V5O1xyXG4gICAgZm9yIChrZXkgaW4gb2JqKSB7XHJcbiAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSBzaXplKys7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gc2l6ZTtcclxufTsiLCJ2YXIgTGlzdFVJID0gcmVxdWlyZSgnLi9MaXN0VUknKTtcclxuXHJcbmZ1bmN0aW9uIFVwZ3JhZGVzUGFnZShob21lVUkpIHtcclxuICAgIHRoaXMudGVtcGxhdGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInVwZ3JhZGVzX3BhZ2VcIik7XHJcbiAgICB0aGlzLnVuaXRVcGdyYWRlcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidW5pdF91cGdyYWRlc1wiKTtcclxuICAgIHRoaXMuYmxkQmFzZUhlYWx0aEJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdibGRfaG9tZV9idG4nKTtcclxuICAgIHRoaXMuYmxkQXJtb3JCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmxkX2FybW9yJyk7XHJcbiAgICB0aGlzLmJsZFNwZWVkQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JsZF9zcGVlZCcpO1xyXG4gICAgdGhpcy5ibGREbWdCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmxkX2RhbWFnZScpO1xyXG5cclxuICAgIHRoaXMuU0VMRUNURURfU0hBUkRTID0ge307XHJcblxyXG4gICAgdGhpcy5zaGFyZHNVSSA9IG5ldyBMaXN0VUkoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ1cGdyYWRlc19zaGFyZHNfbGlzdFwiKSwgaG9tZVVJLCB0aGlzKTtcclxuICAgIHRoaXMuaG9tZVVJID0gaG9tZVVJO1xyXG4gICAgdGhpcy5zb2NrZXQgPSB0aGlzLmhvbWVVSS5zb2NrZXQ7XHJcbn1cclxuXHJcblVwZ3JhZGVzUGFnZS5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcclxuICAgIHRoaXMuYmxkQmFzZUhlYWx0aEJ0bi51cGdUeXBlID0gXCJob21lSGVhbHRoXCI7XHJcbiAgICB0aGlzLmJsZEFybW9yQnRuLnVwZ1R5cGUgPSBcImFybW9yXCI7XHJcbiAgICB0aGlzLmJsZFNwZWVkQnRuLnVwZ1R5cGUgPSBcInNwZWVkXCI7XHJcbiAgICB0aGlzLmJsZERtZ0J0bi51cGdUeXBlID0gXCJkbWdcIjtcclxuXHJcbiAgICB0aGlzLnNoYXJkc1VJLmFkZFNoYXJkcygpO1xyXG5cclxuICAgIHZhciBibGRIb21lID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoJ2J1aWxkSG9tZScsIHtcclxuICAgICAgICAgICAgaG9tZTogdGhpcy5ob21lVUkuaG9tZS5pZCxcclxuICAgICAgICAgICAgc2hhcmRzOiB0aGlzLlNFTEVDVEVEX1NIQVJEU1xyXG4gICAgICAgIH0pXHJcbiAgICB9LmJpbmQodGhpcyk7XHJcbiAgICB2YXIgdXBnVW5pdCA9IGZ1bmN0aW9uICgpIHsgLy9UT0RPOiBmaXggdXBncmFkaW5nIHVuaXRzXHJcbiAgICAgICAgdGhpcy5zb2NrZXQuZW1pdCgndXBncmFkZVVuaXQnLCB7XHJcbiAgICAgICAgICAgIGhvbWU6IHRoaXMuaG9tZVVJLmhvbWUuaWQsXHJcbiAgICAgICAgICAgIHR5cGU6IHRoaXMudXBnVHlwZSxcclxuICAgICAgICAgICAgc2hhcmRzOiB0aGlzLlNFTEVDVEVEX1NIQVJEU1xyXG4gICAgICAgIH0pO1xyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG5cclxuICAgIGNvbnNvbGUubG9nKFwiUkVTRVRUSU5HIEJVVFRPTlwiKTtcclxuICAgIHRoaXMuYmxkQmFzZUhlYWx0aEJ0biA9IHRoaXMuaG9tZVVJLnJlc2V0QnV0dG9uKHRoaXMuYmxkQmFzZUhlYWx0aEJ0biwgYmxkSG9tZSk7XHJcblxyXG4gICAgaWYgKHRoaXMuaG9tZVVJLmhvbWUudHlwZSA9PT0gXCJCYXJyYWNrc1wiKSB7XHJcbiAgICAgICAgdGhpcy51bml0VXBncmFkZXMuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcclxuICAgICAgICB0aGlzLmJsZEFybW9yQnRuID0gdGhpcy5ob21lVUkucmVzZXRCdXR0b24odGhpcy5ibGRBcm1vckJ0biwgdXBnVW5pdCk7XHJcbiAgICAgICAgdGhpcy5ibGRTcGVlZEJ0biA9IHRoaXMuaG9tZVVJLnJlc2V0QnV0dG9uKHRoaXMuYmxkU3BlZWRCdG4sIHVwZ1VuaXQpO1xyXG4gICAgICAgIHRoaXMuYmxkRG1nQnRuID0gdGhpcy5ob21lVUkucmVzZXRCdXR0b24odGhpcy5ibGREbWdCdG4sIHVwZ1VuaXQpO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgdGhpcy51bml0VXBncmFkZXMuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcblVwZ3JhZGVzUGFnZS5wcm90b3R5cGUuY2hlY2tTZWxlY3Rpb24gPSBmdW5jdGlvbiAoaW5wdXQpIHtcclxuICAgIHZhciBibGRCYXNlSGVhbHRoQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JsZF9ob21lX2J0bicpO1xyXG4gICAgdmFyIGJsZEFybW9yQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JsZF9hcm1vcicpO1xyXG4gICAgdmFyIGJsZFNwZWVkQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JsZF9zcGVlZCcpO1xyXG4gICAgdmFyIGJsZERtZ0J0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdibGRfZGFtYWdlJyk7XHJcblxyXG4gICAgaWYgKGlucHV0ID4gMCkge1xyXG4gICAgICAgIGJsZEJhc2VIZWFsdGhCdG4uZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICBibGRBcm1vckJ0bi5kaXNhYmxlZCA9IGZhbHNlO1xyXG4gICAgICAgIGJsZFNwZWVkQnRuLmRpc2FibGVkID0gZmFsc2U7XHJcbiAgICAgICAgYmxkRG1nQnRuLmRpc2FibGVkID0gZmFsc2U7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGJsZEJhc2VIZWFsdGhCdG4uZGlzYWJsZWQgPSBcImRpc2FibGVkXCI7XHJcbiAgICAgICAgYmxkQXJtb3JCdG4uZGlzYWJsZWQgPSBcImRpc2FibGVkXCI7XHJcbiAgICAgICAgYmxkU3BlZWRCdG4uZGlzYWJsZWQgPSBcImRpc2FibGVkXCI7XHJcbiAgICAgICAgYmxkRG1nQnRuLmRpc2FibGVkID0gXCJkaXNhYmxlZFwiO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcblVwZ3JhZGVzUGFnZS5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxufTtcclxuXHJcblVwZ3JhZGVzUGFnZS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5zaGFyZHNVSS5hZGRTaGFyZHMoKVxyXG59O1xyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVXBncmFkZXNQYWdlOyJdfQ==
