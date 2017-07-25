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

Client.prototype.initViewers = function () {
    this.keys = [];
    this.scaleFactor = 1;
    this.mainScaleFactor = 1;
    this.mainUI = new MainUI(this, this.socket);
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
            console.log(packet.type);
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
}

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
        this.homeUI.resetButton(makeBotsBtn, makeBots);
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

    this.upgradesPage = null;
    this.botsPage = null;
    this.buildPage = null;
}

HomeUI.prototype.open = function (home) {
    this.template.style.display = 'block';
    this.home = home;
    
    if (this.upgradesPage === null) {
        this.upgradesPage = new UpgradesPage(this);
        this.botsPage = new BotsPage(this);
        this.buildPage = new BuildPage(this);
    }


    this.addTabListeners();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY2xpZW50L2pzL0NsaWVudC5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L0FuaW1hdGlvbi5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L0Fycm93LmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvQnJhY2tldC5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L0NvbnRyb2xsZXIuanMiLCJzcmMvY2xpZW50L2pzL2VudGl0eS9GYWN0aW9uLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvSG9tZS5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L0xhc2VyLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvTWluaU1hcC5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L1NoYXJkLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvVGlsZS5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L2luZGV4LmpzIiwic3JjL2NsaWVudC9qcy9pbmRleC5qcyIsInNyYy9jbGllbnQvanMvdWkvTWFpblVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9QbGF5ZXJOYW1lclVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9TaGFyZE5hbWVyVUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL2dhbWUvR2FtZVVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9ob21lL0JvdHNQYWdlLmpzIiwic3JjL2NsaWVudC9qcy91aS9ob21lL0J1aWxkUGFnZS5qcyIsInNyYy9jbGllbnQvanMvdWkvaG9tZS9Ib21lVUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL2hvbWUvTGlzdFVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9ob21lL1VwZ3JhZGVzUGFnZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDallBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIEVudGl0eSA9IHJlcXVpcmUoJy4vZW50aXR5Jyk7XHJcbnZhciBNYWluVUkgPSByZXF1aXJlKCcuL3VpL01haW5VSScpO1xyXG5cclxuZnVuY3Rpb24gQ2xpZW50KCkge1xyXG4gICAgdGhpcy5TRUxGSUQgPSBudWxsO1xyXG4gICAgdGhpcy5BUlJPVyA9IG51bGw7XHJcbiAgICB0aGlzLkJSQUNLRVQgPSBudWxsO1xyXG4gICAgdGhpcy5yaWdodENsaWNrID0gZmFsc2U7XHJcbiAgICB0aGlzLmluaXQoKTtcclxufVxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5pbml0U29ja2V0KCk7XHJcbiAgICB0aGlzLmluaXRDYW52YXNlcygpO1xyXG4gICAgdGhpcy5pbml0TGlzdHMoKTtcclxuICAgIHRoaXMuaW5pdFZpZXdlcnMoKTtcclxufTtcclxuXHJcblxyXG5DbGllbnQucHJvdG90eXBlLmluaXRDYW52YXNlcyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMubWFpbkNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibWFpbl9jYW52YXNcIik7XHJcbiAgICB0aGlzLmRyYWZ0Q2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTtcclxuICAgIHRoaXMubU1hcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7XHJcbiAgICB0aGlzLm1NYXBSb3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpO1xyXG5cclxuICAgIHRoaXMubWFpbkNhbnZhcy5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgIHRoaXMuZHJhZnRDYW52YXMuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG4gICAgdGhpcy5tTWFwLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuICAgIHRoaXMubU1hcFJvdC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcblxyXG4gICAgdGhpcy5kcmFmdENhbnZhcy5oZWlnaHQgPSB0aGlzLm1haW5DYW52YXMuaGVpZ2h0O1xyXG4gICAgdGhpcy5kcmFmdENhbnZhcy53aWR0aCA9IHRoaXMubWFpbkNhbnZhcy53aWR0aDtcclxuICAgIHRoaXMubU1hcC5oZWlnaHQgPSA1MDA7XHJcbiAgICB0aGlzLm1NYXAud2lkdGggPSA1MDA7XHJcbiAgICB0aGlzLm1NYXBSb3QuaGVpZ2h0ID0gNTAwO1xyXG4gICAgdGhpcy5tTWFwUm90LndpZHRoID0gNTAwO1xyXG5cclxuICAgIHRoaXMubWFpbkN0eCA9IHRoaXMubWFpbkNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XHJcbiAgICB0aGlzLmRyYWZ0Q3R4ID0gdGhpcy5kcmFmdENhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XHJcbiAgICB0aGlzLm1NYXBDdHggPSB0aGlzLm1NYXAuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG4gICAgdGhpcy5tTWFwQ3R4Um90ID0gdGhpcy5tTWFwUm90LmdldENvbnRleHQoXCIyZFwiKTtcclxuXHJcbiAgICB0aGlzLm1haW5DYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBpZiAoZXZlbnQuYnV0dG9uID09PSAyKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmlnaHRDbGljayA9IHRydWU7XHJcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLkNPTlRST0xMRVJfTElTVFt0aGlzLlNFTEZJRF0pIHtcclxuICAgICAgICAgICAgdGhpcy5BUlJPVyA9IG5ldyBBcnJvdyhldmVudC54IC8gbWFpbkNhbnZhcy5vZmZzZXRXaWR0aCAqIDEwMDAsXHJcbiAgICAgICAgICAgICAgICBldmVudC55IC8gbWFpbkNhbnZhcy5vZmZzZXRIZWlnaHQgKiA1MDApO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMubWFpbkNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBpZiAoIXJpZ2h0Q2xpY2spIHtcclxuICAgICAgICAgICAgdGhpcy5BUlJPVy5wb3N0WCA9IGV2ZW50LnggLyBtYWluQ2FudmFzLm9mZnNldFdpZHRoICogMTAwMDtcclxuICAgICAgICAgICAgdGhpcy5BUlJPVy5wb3N0WSA9IGV2ZW50LnkgLyBtYWluQ2FudmFzLm9mZnNldEhlaWdodCAqIDUwMDtcclxuXHJcbiAgICAgICAgICAgIHZhciBtaW5YID0gKHRoaXMuQVJST1cucHJlWCAtIGRyYWZ0Q2FudmFzLndpZHRoIC8gMikgLyBzY2FsZUZhY3RvcjtcclxuICAgICAgICAgICAgdmFyIG1pblkgPSAodGhpcy5BUlJPVy5wcmVZIC0gZHJhZnRDYW52YXMuaGVpZ2h0IC8gMikgLyBzY2FsZUZhY3RvcjtcclxuICAgICAgICAgICAgdmFyIG1heFggPSAodGhpcy5BUlJPVy5wb3N0WCAtIGRyYWZ0Q2FudmFzLndpZHRoIC8gMikgLyBzY2FsZUZhY3RvcjtcclxuICAgICAgICAgICAgdmFyIG1heFkgPSAodGhpcy5BUlJPVy5wb3N0WSAtIGRyYWZ0Q2FudmFzLmhlaWdodCAvIDIpIC8gc2NhbGVGYWN0b3I7XHJcbiAgICAgICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJzZWxlY3RCb3RzXCIsIHtcclxuICAgICAgICAgICAgICAgIG1pblg6IG1pblgsXHJcbiAgICAgICAgICAgICAgICBtaW5ZOiBtaW5ZLFxyXG4gICAgICAgICAgICAgICAgbWF4WDogbWF4WCxcclxuICAgICAgICAgICAgICAgIG1heFk6IG1heFlcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICB2YXIgeCA9IGV2ZW50LnggLyBtYWluQ2FudmFzLm9mZnNldFdpZHRoICogMTAwMDtcclxuICAgICAgICAgICAgdmFyIHkgPSBldmVudC55IC8gbWFpbkNhbnZhcy5vZmZzZXRIZWlnaHQgKiA1MDA7XHJcbiAgICAgICAgICAgIG1heFggPSAoeCAtIGRyYWZ0Q2FudmFzLndpZHRoIC8gMikgLyBzY2FsZUZhY3RvcjtcclxuICAgICAgICAgICAgbWF4WSA9ICh5IC0gZHJhZnRDYW52YXMuaGVpZ2h0IC8gMikgLyBzY2FsZUZhY3RvcjtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJib3RDb21tYW5kXCIsIHtcclxuICAgICAgICAgICAgICAgIHg6IG1heFgsXHJcbiAgICAgICAgICAgICAgICB5OiBtYXhZXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5yaWdodENsaWNrID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5BUlJPVyA9IG51bGw7XHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLm1haW5DYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBpZiAodGhpcy5BUlJPVykge1xyXG4gICAgICAgICAgICB0aGlzLkFSUk9XLnBvc3RYID0gZXZlbnQueCAvIG1haW5DYW52YXMub2Zmc2V0V2lkdGggKiAxMDAwO1xyXG4gICAgICAgICAgICB0aGlzLkFSUk9XLnBvc3RZID0gZXZlbnQueSAvIG1haW5DYW52YXMub2Zmc2V0SGVpZ2h0ICogNTAwO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG5cclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdExpc3RzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5GQUNUSU9OX0xJU1QgPSB7fTtcclxuICAgIHRoaXMuRkFDVElPTl9BUlJBWSA9IFtdO1xyXG5cclxuICAgIHRoaXMuQ09OVFJPTExFUl9MSVNUID0ge307XHJcbiAgICB0aGlzLlRJTEVfTElTVCA9IHt9O1xyXG4gICAgdGhpcy5TSEFSRF9MSVNUID0ge307XHJcbiAgICB0aGlzLkxBU0VSX0xJU1QgPSB7fTtcclxuICAgIHRoaXMuSE9NRV9MSVNUID0ge307XHJcbiAgICB0aGlzLkFOSU1BVElPTl9MSVNUID0ge307XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLmluaXRTb2NrZXQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnNvY2tldCA9IGlvKCk7XHJcbiAgICB0aGlzLnNvY2tldC52ZXJpZmllZCA9IGZhbHNlO1xyXG5cclxuICAgIHRoaXMuc29ja2V0Lm9uKCdhZGRGYWN0aW9uc1VJJywgdGhpcy5hZGRGYWN0aW9uc3RvVUkuYmluZCh0aGlzKSk7XHJcbiAgICB0aGlzLnNvY2tldC5vbigndXBkYXRlRW50aXRpZXMnLCB0aGlzLmhhbmRsZVBhY2tldC5iaW5kKHRoaXMpKTtcclxuICAgIHRoaXMuc29ja2V0Lm9uKCdkcmF3U2NlbmUnLCB0aGlzLmRyYXdTY2VuZS5iaW5kKHRoaXMpKTtcclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdFZpZXdlcnMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLmtleXMgPSBbXTtcclxuICAgIHRoaXMuc2NhbGVGYWN0b3IgPSAxO1xyXG4gICAgdGhpcy5tYWluU2NhbGVGYWN0b3IgPSAxO1xyXG4gICAgdGhpcy5tYWluVUkgPSBuZXcgTWFpblVJKHRoaXMsIHRoaXMuc29ja2V0KTtcclxufTtcclxuXHJcblxyXG5DbGllbnQucHJvdG90eXBlLmFkZEZhY3Rpb25zdG9VSSA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICBpZiAoIXRoaXMuc29ja2V0LnZlcmlmaWVkKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJWRVJJRklFRFwiKTtcclxuICAgICAgICB0aGlzLnNvY2tldC5lbWl0KFwidmVyaWZ5XCIsIHt9KTtcclxuICAgICAgICB0aGlzLnNvY2tldC52ZXJpZmllZCA9IHRydWU7XHJcbiAgICB9XHJcbiAgICB2YXIgZmFjdGlvbnMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZmFjdGlvbnMnKTtcclxuICAgIHZhciBwYWNrZXQgPSBkYXRhLmZhY3Rpb25zO1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFja2V0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFyIG5hbWUgPSBwYWNrZXRbaV07XHJcbiAgICAgICAgdmFyIG9wdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ29wdGlvbicpO1xyXG4gICAgICAgIG9wdGlvbi52YWx1ZSA9IG5hbWU7XHJcbiAgICAgICAgZmFjdGlvbnMuYXBwZW5kQ2hpbGQob3B0aW9uKTtcclxuICAgIH1cclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaGFuZGxlUGFja2V0ID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgIHZhciBwYWNrZXQsIGk7XHJcbiAgICBmb3IgKGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHBhY2tldCA9IGRhdGFbaV07XHJcbiAgICAgICAgc3dpdGNoIChwYWNrZXQubWFzdGVyKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJhZGRcIjpcclxuICAgICAgICAgICAgICAgIHRoaXMuYWRkRW50aXRpZXMocGFja2V0KTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwiZGVsZXRlXCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRlbGV0ZUVudGl0aWVzKHBhY2tldCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcInVwZGF0ZVwiOlxyXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVFbnRpdGllcyhwYWNrZXQpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS51cGRhdGVFbnRpdGllcyA9IGZ1bmN0aW9uIChwYWNrZXQpIHtcclxuICAgIGZ1bmN0aW9uIHVwZGF0ZUVudGl0eShwYWNrZXQsIGxpc3QpIHtcclxuICAgICAgICBpZiAoIXBhY2tldCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBlbnRpdHkgPSBsaXN0W3BhY2tldC5pZF07XHJcbiAgICAgICAgaWYgKCFlbnRpdHkpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbnRpdHkudXBkYXRlKHBhY2tldCk7XHJcbiAgICB9XHJcblxyXG4gICAgc3dpdGNoIChwYWNrZXQuY2xhc3MpIHtcclxuICAgICAgICBjYXNlIFwiY29udHJvbGxlckluZm9cIjpcclxuICAgICAgICAgICAgdXBkYXRlRW50aXR5KHBhY2tldCwgdGhpcy5DT05UUk9MTEVSX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwidGlsZUluZm9cIjpcclxuICAgICAgICAgICAgdXBkYXRlRW50aXR5KHBhY2tldCwgdGhpcy5USUxFX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwic2hhcmRJbmZvXCI6XHJcbiAgICAgICAgICAgIHVwZGF0ZUVudGl0eShwYWNrZXQsIHRoaXMuU0hBUkRfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJob21lSW5mb1wiOlxyXG4gICAgICAgICAgICB1cGRhdGVFbnRpdHkocGFja2V0LCB0aGlzLkhPTUVfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJmYWN0aW9uSW5mb1wiOlxyXG4gICAgICAgICAgICB1cGRhdGVFbnRpdHkocGFja2V0LCB0aGlzLkZBQ1RJT05fTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJVSUluZm9cIjpcclxuICAgICAgICAgICAgaWYgKHRoaXMuU0VMRklEID09PSBwYWNrZXQucGxheWVySWQpIHtcclxuICAgICAgICAgICAgICAgIHVwZGF0ZVVJKHBhY2tldCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLmRlbGV0ZUVudGl0aWVzID0gZnVuY3Rpb24gKHBhY2tldCkge1xyXG4gICAgdmFyIGRlbGV0ZUVudGl0eSA9IGZ1bmN0aW9uIChwYWNrZXQsIGxpc3QsIGFycmF5KSB7XHJcbiAgICAgICAgaWYgKCFwYWNrZXQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoYXJyYXkpIHtcclxuICAgICAgICAgICAgdmFyIGluZGV4ID0gZmluZFdpdGhBdHRyKGFycmF5LCBcImlkXCIsIHBhY2tldC5pZCk7XHJcbiAgICAgICAgICAgIGFycmF5LnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGRlbGV0ZSBsaXN0W3BhY2tldC5pZF07XHJcbiAgICB9O1xyXG5cclxuICAgIHN3aXRjaCAocGFja2V0LmNsYXNzKSB7XHJcbiAgICAgICAgY2FzZSBcInRpbGVJbmZvXCI6XHJcbiAgICAgICAgICAgIGRlbGV0ZUVudGl0eShwYWNrZXQsIHRoaXMuVElMRV9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImNvbnRyb2xsZXJJbmZvXCI6XHJcbiAgICAgICAgICAgIGRlbGV0ZUVudGl0eShwYWNrZXQsIHRoaXMuQ09OVFJPTExFUl9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcInNoYXJkSW5mb1wiOlxyXG4gICAgICAgICAgICBkZWxldGVFbnRpdHkocGFja2V0LCB0aGlzLlNIQVJEX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiaG9tZUluZm9cIjpcclxuICAgICAgICAgICAgZGVsZXRlRW50aXR5KHBhY2tldCwgdGhpcy5IT01FX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiZmFjdGlvbkluZm9cIjpcclxuICAgICAgICAgICAgZGVsZXRlRW50aXR5KHBhY2tldCwgdGhpcy5GQUNUSU9OX0xJU1QsIHRoaXMuRkFDVElPTl9BUlJBWSk7XHJcbiAgICAgICAgICAgIC8vdGhpcy5kcmF3TGVhZGVyQm9hcmQoKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImFuaW1hdGlvbkluZm9cIjpcclxuICAgICAgICAgICAgZGVsZXRlRW50aXR5KHBhY2tldCwgdGhpcy5BTklNQVRJT05fTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJsYXNlckluZm9cIjpcclxuICAgICAgICAgICAgZGVsZXRlRW50aXR5KHBhY2tldCwgdGhpcy5MQVNFUl9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImJyYWNrZXRJbmZvXCI6XHJcbiAgICAgICAgICAgIGlmICh0aGlzLlNFTEZJRCA9PT0gcGFja2V0LmlkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLkJSQUNLRVQgPSBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJVSUluZm9cIjpcclxuICAgICAgICAgICAgaWYgKHRoaXMuU0VMRklEID09PSBwYWNrZXQuaWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWFpblVJLmNsb3NlKHBhY2tldC5hY3Rpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5hZGRFbnRpdGllcyA9IGZ1bmN0aW9uIChwYWNrZXQpIHtcclxuICAgIHZhciBhZGRFbnRpdHkgPSBmdW5jdGlvbiAocGFja2V0LCBsaXN0LCBlbnRpdHksIGFycmF5KSB7XHJcbiAgICAgICAgaWYgKCFwYWNrZXQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsaXN0W3BhY2tldC5pZF0gPSBuZXcgZW50aXR5KHBhY2tldCwgdGhpcyk7XHJcbiAgICAgICAgaWYgKGFycmF5ICYmIGZpbmRXaXRoQXR0cihhcnJheSwgXCJpZFwiLCBwYWNrZXQuaWQpID09PSAtMSkge1xyXG4gICAgICAgICAgICBhcnJheS5wdXNoKGxpc3RbcGFja2V0LmlkXSk7XHJcbiAgICAgICAgfVxyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG5cclxuICAgIHN3aXRjaCAocGFja2V0LmNsYXNzKSB7XHJcbiAgICAgICAgY2FzZSBcInRpbGVJbmZvXCI6XHJcbiAgICAgICAgICAgIGFkZEVudGl0eShwYWNrZXQsIHRoaXMuVElMRV9MSVNULCBFbnRpdHkuVGlsZSk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJjb250cm9sbGVySW5mb1wiOlxyXG4gICAgICAgICAgICBhZGRFbnRpdHkocGFja2V0LCB0aGlzLkNPTlRST0xMRVJfTElTVCwgRW50aXR5LkNvbnRyb2xsZXIpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwic2hhcmRJbmZvXCI6XHJcbiAgICAgICAgICAgIGFkZEVudGl0eShwYWNrZXQsIHRoaXMuU0hBUkRfTElTVCwgRW50aXR5LlNoYXJkKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImxhc2VySW5mb1wiOlxyXG4gICAgICAgICAgICBhZGRFbnRpdHkocGFja2V0LCB0aGlzLkxBU0VSX0xJU1QsIEVudGl0eS5MYXNlcik7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJob21lSW5mb1wiOlxyXG4gICAgICAgICAgICBhZGRFbnRpdHkocGFja2V0LCB0aGlzLkhPTUVfTElTVCwgRW50aXR5LkhvbWUpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiZmFjdGlvbkluZm9cIjpcclxuICAgICAgICAgICAgYWRkRW50aXR5KHBhY2tldCwgdGhpcy5GQUNUSU9OX0xJU1QsIEVudGl0eS5GYWN0aW9uLCB0aGlzLkZBQ1RJT05fQVJSQVkpO1xyXG4gICAgICAgICAgICAvL3RoaXMuZHJhd0xlYWRlckJvYXJkKCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJhbmltYXRpb25JbmZvXCI6XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHBhY2tldC50eXBlKTtcclxuICAgICAgICAgICAgYWRkRW50aXR5KHBhY2tldCwgdGhpcy5BTklNQVRJT05fTElTVCwgRW50aXR5LkFuaW1hdGlvbik7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJicmFja2V0SW5mb1wiOlxyXG4gICAgICAgICAgICBpZiAodGhpcy5TRUxGSUQgPT09IHBhY2tldC5wbGF5ZXJJZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5CUkFDS0VUID0gbmV3IEVudGl0eS5CcmFja2V0KHBhY2tldCwgdGhpcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcIlVJSW5mb1wiOlxyXG4gICAgICAgICAgICBpZiAodGhpcy5TRUxGSUQgPT09IHBhY2tldC5wbGF5ZXJJZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tYWluVUkub3BlbihwYWNrZXQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJzZWxmSWRcIjpcclxuICAgICAgICAgICAgdGhpcy5TRUxGSUQgPSBwYWNrZXQuc2VsZklkO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgIH1cclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUudXBkYXRlRmFjdGlvbnNMaXN0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGZhY3Rpb25Tb3J0ID0gZnVuY3Rpb24gKGEsIGIpIHtcclxuICAgICAgICByZXR1cm4gYS5zaXplIC0gYi5zaXplO1xyXG4gICAgfTtcclxuXHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLmRyYXdTY2VuZSA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICB2YXIgaWQ7XHJcbiAgICB2YXIgc2VsZlBsYXllciA9IHRoaXMuQ09OVFJPTExFUl9MSVNUW3RoaXMuU0VMRklEXTtcclxuICAgIGlmICghc2VsZlBsYXllcikge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLm1haW5DdHguY2xlYXJSZWN0KDAsIDAsIDExMDAwLCAxMTAwMCk7XHJcbiAgICB0aGlzLmRyYWZ0Q3R4LmNsZWFyUmVjdCgwLCAwLCAxMTAwMCwgMTEwMDApO1xyXG4gICAgdGhpcy5tTWFwQ3R4LmNsZWFyUmVjdCgwLCAwLCA1MDAsIDUwMCk7XHJcblxyXG4gICAgdmFyIGVudGl0eUxpc3QgPSBbdGhpcy5USUxFX0xJU1QsIHRoaXMuQ09OVFJPTExFUl9MSVNULFxyXG4gICAgICAgIHRoaXMuU0hBUkRfTElTVCwgdGhpcy5MQVNFUl9MSVNULCB0aGlzLkhPTUVfTElTVCxcclxuICAgICAgICB0aGlzLkZBQ1RJT05fTElTVCwgdGhpcy5BTklNQVRJT05fTElTVF07XHJcblxyXG4gICAgdmFyIGluQm91bmRzID0gZnVuY3Rpb24gKHBsYXllciwgeCwgeSkge1xyXG4gICAgICAgIHZhciByYW5nZSA9IHRoaXMubWFpbkNhbnZhcy53aWR0aCAvICgxLjIgKiB0aGlzLnNjYWxlRmFjdG9yKTtcclxuICAgICAgICByZXR1cm4geCA8IChwbGF5ZXIueCArIHJhbmdlKSAmJiB4ID4gKHBsYXllci54IC0gNSAvIDQgKiByYW5nZSlcclxuICAgICAgICAgICAgJiYgeSA8IChwbGF5ZXIueSArIHJhbmdlKSAmJiB5ID4gKHBsYXllci55IC0gNSAvIDQgKiByYW5nZSk7XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbnRpdHlMaXN0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFyIGxpc3QgPSBlbnRpdHlMaXN0W2ldO1xyXG4gICAgICAgIGZvciAoaWQgaW4gbGlzdCkge1xyXG4gICAgICAgICAgICB2YXIgZW50aXR5ID0gbGlzdFtpZF07XHJcbiAgICAgICAgICAgIGlmIChpbkJvdW5kcyhzZWxmUGxheWVyLCBlbnRpdHkueCwgZW50aXR5LnkpKSB7XHJcbiAgICAgICAgICAgICAgICBlbnRpdHkuc2hvdygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBpZiAodGhpcy5CUkFDS0VUKSB7XHJcbiAgICAgICAgdGhpcy5CUkFDS0VULnNob3coKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgZHJhd0Nvbm5lY3RvcnMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgZm9yICh2YXIgaWQgaW4gdGhpcy5IT01FX0xJU1QpIHtcclxuICAgICAgICAgICAgdmFyIGhvbWUgPSB0aGlzLkhPTUVfTElTVFtpZF07XHJcbiAgICAgICAgICAgIGlmIChob21lLm5laWdoYm9ycykge1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBob21lLm5laWdoYm9ycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBuZWlnaGJvciA9IHRoaXMuSE9NRV9MSVNUW2hvbWUubmVpZ2hib3JzW2ldXTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRyYWZ0Q3R4Lm1vdmVUbyhob21lLngsIGhvbWUueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kcmFmdEN0eC5zdHJva2VTdHlsZSA9IFwiIzkxMjM4MVwiO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRyYWZ0Q3R4LmxpbmVXaWR0aCA9IDEwO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZHJhZnRDdHgubGluZVRvKG5laWdoYm9yLngsIG5laWdoYm9yLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZHJhZnRDdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcblxyXG5cclxuICAgIHZhciB0cmFuc2xhdGVTY2VuZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLmRyYWZ0Q3R4LnNldFRyYW5zZm9ybSgxLCAwLCAwLCAxLCAwLCAwKTtcclxuICAgICAgICB0aGlzLnNjYWxlRmFjdG9yID0gbGVycCh0aGlzLnNjYWxlRmFjdG9yLCB0aGlzLm1haW5TY2FsZUZhY3RvciwgMC4zKTtcclxuXHJcbiAgICAgICAgdGhpcy5kcmFmdEN0eC50cmFuc2xhdGUodGhpcy5tYWluQ2FudmFzLndpZHRoIC8gMiwgdGhpcy5tYWluQ2FudmFzLmhlaWdodCAvIDIpO1xyXG4gICAgICAgIHRoaXMuZHJhZnRDdHguc2NhbGUodGhpcy5zY2FsZUZhY3RvciwgdGhpcy5zY2FsZUZhY3Rvcik7XHJcbiAgICAgICAgdGhpcy5kcmFmdEN0eC50cmFuc2xhdGUoLXNlbGZQbGF5ZXIueCwgLXNlbGZQbGF5ZXIueSk7XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcblxyXG4gICAgZHJhd0Nvbm5lY3RvcnMoKTtcclxuICAgIHRyYW5zbGF0ZVNjZW5lKCk7XHJcbiAgICB0aGlzLm1haW5DdHguZHJhd0ltYWdlKHRoaXMuZHJhZnRDYW52YXMsIDAsIDApO1xyXG59O1xyXG5cclxuXHJcbmZ1bmN0aW9uIGxlcnAoYSwgYiwgcmF0aW8pIHtcclxuICAgIHJldHVybiBhICsgcmF0aW8gKiAoYiAtIGEpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmaW5kV2l0aEF0dHIoYXJyYXksIGF0dHIsIHZhbHVlKSB7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSArPSAxKSB7XHJcbiAgICAgICAgaWYgKGFycmF5W2ldW2F0dHJdID09PSB2YWx1ZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gaTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gLTE7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFJhbmRvbShtaW4sIG1heCkge1xyXG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pbjtcclxufVxyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ2xpZW50OyIsImZ1bmN0aW9uIEFuaW1hdGlvbihhbmltYXRpb25JbmZvLCBjbGllbnQpIHtcclxuICAgIHRoaXMudHlwZSA9IGFuaW1hdGlvbkluZm8udHlwZTtcclxuICAgIHRoaXMuaWQgPSBhbmltYXRpb25JbmZvLmlkO1xyXG4gICAgdGhpcy5uYW1lID0gYW5pbWF0aW9uSW5mby5uYW1lO1xyXG4gICAgdGhpcy54ID0gYW5pbWF0aW9uSW5mby54O1xyXG4gICAgdGhpcy55ID0gYW5pbWF0aW9uSW5mby55O1xyXG4gICAgdGhpcy50aGV0YSA9IDE1O1xyXG4gICAgdGhpcy50aW1lciA9IGdldFJhbmRvbSgxMCwgMTQpO1xyXG5cclxuICAgIGlmICh0aGlzLngpIHtcclxuICAgICAgICB0aGlzLmVuZFggPSB0aGlzLnggKyBnZXRSYW5kb20oLTEwMCwgMTAwKTtcclxuICAgICAgICB0aGlzLmVuZFkgPSB0aGlzLnkgKyBnZXRSYW5kb20oLTEwMCwgMTAwKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxufVxyXG5cclxuXHJcbkFuaW1hdGlvbi5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBob21lO1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50LmRyYWZ0Q3R4O1xyXG4gICAgaWYgKHRoaXMudHlwZSA9PT0gXCJhZGRTaGFyZFwiKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJEUkFXSU5HIEFERCBTSEFSRCBBTklNQVRJT05cIik7XHJcbiAgICAgICAgaG9tZSA9IHRoaXMuY2xpZW50LkhPTUVfTElTVFt0aGlzLmlkXTtcclxuICAgICAgICBpZiAoIWhvbWUpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDMgKiB0aGlzLnRpbWVyO1xyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiIzAxMkNDQ1wiO1xyXG4gICAgICAgIGN0eC5hcmMoaG9tZS54LCBob21lLnksIGhvbWUucmFkaXVzLCAwLCB0aGlzLnRpbWVyIC8gMS4yLCB0cnVlKTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLnR5cGUgPT09IFwicmVtb3ZlU2hhcmRcIikge1xyXG4gICAgICAgIGhvbWUgPSB0aGlzLmNsaWVudC5IT01FX0xJU1RbdGhpcy5pZF07XHJcbiAgICAgICAgaWYgKCFob21lKSB7XHJcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmNsaWVudC5BTklNQVRJT05fTElTVFtpZF07XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSAxNSAtIHRoaXMudGltZXI7XHJcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCJyZ2JhKDI1NSwgMCwgMCwgXCIgKyB0aGlzLnRpbWVyICogMTAgLyAxMDAgKyBcIilcIjtcclxuICAgICAgICBjdHguYXJjKGhvbWUueCwgaG9tZS55LCBob21lLnJhZGl1cywgMCwgMiAqIE1hdGguUEksIGZhbHNlKTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLnR5cGUgPT09IFwic2hhcmREZWF0aFwiKSB7XHJcbiAgICAgICAgY3R4LmZvbnQgPSA2MCAtIHRoaXMudGltZXIgKyBcInB4IEFyaWFsXCI7XHJcbiAgICAgICAgY3R4LnNhdmUoKTtcclxuICAgICAgICBjdHgudHJhbnNsYXRlKHRoaXMueCwgdGhpcy55KTtcclxuICAgICAgICBjdHgucm90YXRlKC1NYXRoLlBJIC8gNTAgKiB0aGlzLnRoZXRhKTtcclxuICAgICAgICBjdHgudGV4dEFsaWduID0gXCJjZW50ZXJcIjtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2JhKDI1NSwgMTY4LCA4NiwgXCIgKyB0aGlzLnRpbWVyICogMTAgLyAxMDAgKyBcIilcIjtcclxuICAgICAgICBjdHguZmlsbFRleHQodGhpcy5uYW1lLCAwLCAxNSk7XHJcbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcclxuXHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiIzAwMDAwMFwiO1xyXG4gICAgICAgIHRoaXMudGhldGEgPSBsZXJwKHRoaXMudGhldGEsIDAsIDAuMDgpO1xyXG4gICAgICAgIHRoaXMueCA9IGxlcnAodGhpcy54LCB0aGlzLmVuZFgsIDAuMSk7XHJcbiAgICAgICAgdGhpcy55ID0gbGVycCh0aGlzLnksIHRoaXMuZW5kWSwgMC4xKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnRpbWVyLS07XHJcbiAgICBpZiAodGhpcy50aW1lciA8PSAwKSB7XHJcbiAgICAgICAgZGVsZXRlIHRoaXMuY2xpZW50LkFOSU1BVElPTl9MSVNUW3RoaXMuaWRdO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbmZ1bmN0aW9uIGdldFJhbmRvbShtaW4sIG1heCkge1xyXG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pbjtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBBbmltYXRpb247IiwiZnVuY3Rpb24gQXJyb3coeCwgeSkge1xyXG4gICAgdGhpcy5wcmVYID0geDtcclxuICAgIHRoaXMucHJlWSA9IHk7XHJcbiAgICB0aGlzLnBvc3RYID0geDtcclxuICAgIHRoaXMucG9zdFkgPSB5O1xyXG4gICAgdGhpcy5kZWx0YVggPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMucG9zdFggLSBtYWluQ2FudmFzLndpZHRoIC8gMjtcclxuICAgIH07XHJcbiAgICB0aGlzLmRlbHRhWSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5wb3N0WSAtIG1haW5DYW52YXMuaGVpZ2h0IC8gMjtcclxuICAgIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBBcnJvdzsiLCJmdW5jdGlvbiBCcmFja2V0KGJyYWNrZXRJbmZvLCBjbGllbnQpIHtcclxuICAgIHZhciB0aWxlID0gY2xpZW50LlRJTEVfTElTVFticmFja2V0SW5mby50aWxlSWRdO1xyXG5cclxuICAgIHRoaXMueCA9IHRpbGUueDtcclxuICAgIHRoaXMueSA9IHRpbGUueTtcclxuICAgIHRoaXMubGVuZ3RoID0gdGlsZS5sZW5ndGg7XHJcblxyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbn1cclxuXHJcbkJyYWNrZXQucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgc2VsZlBsYXllciA9IHRoaXMuY2xpZW50LkNPTlRST0xMRVJfTElTVFt0aGlzLmNsaWVudC5TRUxGSURdO1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50LmRyYWZ0Q3R4O1xyXG5cclxuICAgIGN0eC5maWxsU3R5bGUgPSBcInJnYmEoMTAwLDIxMSwyMTEsMC42KVwiO1xyXG4gICAgY3R4LmZpbGxSZWN0KHRoaXMueCwgdGhpcy55LCB0aGlzLmxlbmd0aCwgdGhpcy5sZW5ndGgpO1xyXG4gICAgY3R4LmZvbnQgPSBcIjIwcHggQXJpYWxcIjtcclxuXHJcbiAgICBjdHguZmlsbFRleHQoXCJQcmVzcyBaIHRvIFBsYWNlIFNlbnRpbmVsXCIsIHNlbGZQbGF5ZXIueCwgc2VsZlBsYXllci55ICsgMTAwKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQnJhY2tldDsiLCJmdW5jdGlvbiBDb250cm9sbGVyKGNvbnRyb2xsZXJJbmZvLCBjbGllbnQpIHtcclxuICAgIHRoaXMuaWQgPSBjb250cm9sbGVySW5mby5pZDtcclxuICAgIHRoaXMubmFtZSA9IGNvbnRyb2xsZXJJbmZvLm5hbWU7XHJcbiAgICB0aGlzLnggPSBjb250cm9sbGVySW5mby54O1xyXG4gICAgdGhpcy55ID0gY29udHJvbGxlckluZm8ueTtcclxuICAgIHRoaXMuaGVhbHRoID0gY29udHJvbGxlckluZm8uaGVhbHRoO1xyXG4gICAgdGhpcy5tYXhIZWFsdGggPSBjb250cm9sbGVySW5mby5tYXhIZWFsdGg7XHJcbiAgICB0aGlzLnNlbGVjdGVkID0gY29udHJvbGxlckluZm8uc2VsZWN0ZWQ7XHJcbiAgICB0aGlzLm93bmVyID0gY29udHJvbGxlckluZm8ub3duZXI7XHJcbiAgICB0aGlzLnRoZXRhID0gY29udHJvbGxlckluZm8udGhldGE7XHJcbiAgICB0aGlzLnR5cGUgPSBjb250cm9sbGVySW5mby50eXBlO1xyXG4gICAgdGhpcy5sZXZlbCA9IGNvbnRyb2xsZXJJbmZvLmxldmVsO1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5Db250cm9sbGVyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoY29udHJvbGxlckluZm8pIHtcclxuICAgIHRoaXMueCA9IGNvbnRyb2xsZXJJbmZvLng7XHJcbiAgICB0aGlzLnkgPSBjb250cm9sbGVySW5mby55O1xyXG4gICAgdGhpcy5oZWFsdGggPSBjb250cm9sbGVySW5mby5oZWFsdGg7XHJcbiAgICB0aGlzLm1heEhlYWx0aCA9IGNvbnRyb2xsZXJJbmZvLm1heEhlYWx0aDtcclxuICAgIHRoaXMuc2VsZWN0ZWQgPSBjb250cm9sbGVySW5mby5zZWxlY3RlZDtcclxuICAgIHRoaXMudGhldGEgPSBjb250cm9sbGVySW5mby50aGV0YTtcclxuICAgIHRoaXMubGV2ZWwgPSBjb250cm9sbGVySW5mby5sZXZlbDtcclxufTtcclxuXHJcbkNvbnRyb2xsZXIucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5mb250ID0gXCIyMHB4IEFyaWFsXCI7XHJcbiAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5zdHJva2VTdHlsZSA9IFwiI2ZmOWQ2MFwiO1xyXG5cclxuICAgIHRoaXMuY2xpZW50LmRyYWZ0Q3R4LmZpbGxTdHlsZSA9IFwicmdiYSgxMjMsMCwwLFwiICsgdGhpcy5oZWFsdGggLyAoNCAqIHRoaXMubWF4SGVhbHRoKSArIFwiKVwiO1xyXG4gICAgdGhpcy5jbGllbnQuZHJhZnRDdHgubGluZVdpZHRoID0gMTA7XHJcbiAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5iZWdpblBhdGgoKTtcclxuXHJcbiAgICAvL2RyYXcgcGxheWVyIG9iamVjdFxyXG4gICAgaWYgKHRoaXMudHlwZSA9PT0gXCJQbGF5ZXJcIikge1xyXG4gICAgICAgIHZhciByYWRpdXMgPSAzMDtcclxuICAgICAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5tb3ZlVG8odGhpcy54ICsgcmFkaXVzLCB0aGlzLnkpO1xyXG4gICAgICAgIGZvciAoaSA9IE1hdGguUEkgLyA0OyBpIDw9IDIgKiBNYXRoLlBJIC0gTWF0aC5QSSAvIDQ7IGkgKz0gTWF0aC5QSSAvIDQpIHtcclxuICAgICAgICAgICAgdGhldGEgPSBpICsgZ2V0UmFuZG9tKC0odGhpcy5tYXhIZWFsdGggLyB0aGlzLmhlYWx0aCkgLyA3LCAodGhpcy5tYXhIZWFsdGggLyB0aGlzLmhlYWx0aCkgLyA3KTtcclxuICAgICAgICAgICAgeCA9IHJhZGl1cyAqIE1hdGguY29zKHRoZXRhKTtcclxuICAgICAgICAgICAgeSA9IHJhZGl1cyAqIE1hdGguc2luKHRoZXRhKTtcclxuICAgICAgICAgICAgdGhpcy5jbGllbnQuZHJhZnRDdHgubGluZVRvKHRoaXMueCArIHgsIHRoaXMueSArIHkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5saW5lVG8odGhpcy54ICsgcmFkaXVzLCB0aGlzLnkgKyAzKTtcclxuICAgICAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5zdHJva2UoKTtcclxuICAgICAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5maWxsKCk7XHJcbiAgICB9IGVsc2UgeyAvL2JvdFxyXG4gICAgICAgIHZhciB4LCB5LCB0aGV0YSwgc3RhcnRYLCBzdGFydFk7XHJcbiAgICAgICAgdmFyIHNtYWxsUmFkaXVzID0gMTI7XHJcbiAgICAgICAgdmFyIGJpZ1JhZGl1cyA9IDIwO1xyXG5cclxuICAgICAgICB0aGV0YSA9IHRoaXMudGhldGE7XHJcbiAgICAgICAgc3RhcnRYID0gYmlnUmFkaXVzICogTWF0aC5jb3ModGhldGEpO1xyXG4gICAgICAgIHN0YXJ0WSA9IGJpZ1JhZGl1cyAqIE1hdGguc2luKHRoZXRhKTtcclxuICAgICAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5tb3ZlVG8odGhpcy54ICsgc3RhcnRYLCB0aGlzLnkgKyBzdGFydFkpO1xyXG4gICAgICAgIGZvciAoaSA9IDE7IGkgPD0gMjsgaSsrKSB7XHJcbiAgICAgICAgICAgIHRoZXRhID0gdGhpcy50aGV0YSArIDIgKiBNYXRoLlBJIC8gMyAqIGkgK1xyXG4gICAgICAgICAgICAgICAgZ2V0UmFuZG9tKC10aGlzLm1heEhlYWx0aCAvIHRoaXMuaGVhbHRoIC8gNywgdGhpcy5tYXhIZWFsdGggLyB0aGlzLmhlYWx0aCAvIDcpO1xyXG4gICAgICAgICAgICB4ID0gc21hbGxSYWRpdXMgKiBNYXRoLmNvcyh0aGV0YSk7XHJcbiAgICAgICAgICAgIHkgPSBzbWFsbFJhZGl1cyAqIE1hdGguc2luKHRoZXRhKTtcclxuICAgICAgICAgICAgdGhpcy5jbGllbnQuZHJhZnRDdHgubGluZVRvKHRoaXMueCArIHgsIHRoaXMueSArIHkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5saW5lVG8odGhpcy54ICsgc3RhcnRYLCB0aGlzLnkgKyBzdGFydFkpO1xyXG4gICAgICAgIHRoaXMuY2xpZW50LmRyYWZ0Q3R4LmZpbGwoKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5maWxsU3R5bGUgPSBcIiNmZjlkNjBcIjtcclxuICAgIHRoaXMuY2xpZW50LmRyYWZ0Q3R4LmZpbGxUZXh0KHRoaXMubmFtZSwgdGhpcy54LCB0aGlzLnkgKyA3MCk7XHJcbiAgICBpZiAodGhpcy5zZWxlY3RlZCAmJiB0aGlzLm93bmVyID09PSB0aGlzLmNsaWVudC5TRUxGSUQpIHtcclxuICAgICAgICB0aGlzLmNsaWVudC5kcmFmdEN0eC5saW5lV2lkdGggPSA1O1xyXG4gICAgICAgIHRoaXMuY2xpZW50LmRyYWZ0Q3R4LnN0cm9rZVN0eWxlID0gXCIjMWQ1NWFmXCI7XHJcbiAgICAgICAgdGhpcy5jbGllbnQuZHJhZnRDdHguc3Ryb2tlKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0UmFuZG9tKG1pbiwgbWF4KSB7XHJcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pICsgbWluO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRyb2xsZXI7IiwiZnVuY3Rpb24gRmFjdGlvbihmYWN0aW9uSW5mbywgY2xpZW50KSB7XHJcbiAgICB0aGlzLmlkID0gZmFjdGlvbkluZm8uaWQ7XHJcbiAgICB0aGlzLm5hbWUgPSBmYWN0aW9uSW5mby5uYW1lO1xyXG4gICAgdGhpcy54ID0gZmFjdGlvbkluZm8ueDtcclxuICAgIHRoaXMueSA9IGZhY3Rpb25JbmZvLnk7XHJcbiAgICB0aGlzLnNpemUgPSBmYWN0aW9uSW5mby5zaXplO1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5GYWN0aW9uLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoZmFjdGlvbkluZm8pIHtcclxuICAgIHRoaXMueCA9IGZhY3Rpb25JbmZvLng7XHJcbiAgICB0aGlzLnkgPSBmYWN0aW9uSW5mby55O1xyXG4gICAgdGhpcy5zaXplID0gZmFjdGlvbkluZm8uc2l6ZTtcclxuXHJcblxyXG4gICAgLy9GQUNUSU9OX0FSUkFZLnNvcnQoZmFjdGlvblNvcnQpO1xyXG4gICAgLy9kcmF3TGVhZGVyQm9hcmQoKTsgLy9jaGFuZ2UgdGhpc1xyXG59O1xyXG5cclxuRmFjdGlvbi5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5kcmFmdEN0eDtcclxuICAgIGN0eC5mb250ID0gdGhpcy5zaXplICogMzAgKyBcInB4IEFyaWFsXCI7XHJcbiAgICBjdHgudGV4dEFsaWduID0gXCJjZW50ZXJcIjtcclxuICAgIGN0eC5maWxsVGV4dCh0aGlzLm5hbWUsIHRoaXMueCwgdGhpcy55KTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRmFjdGlvbjsiLCJmdW5jdGlvbiBIb21lKGhvbWVJbmZvLCBjbGllbnQpIHtcclxuICAgIHRoaXMuaWQgPSBob21lSW5mby5pZDtcclxuICAgIHRoaXMueCA9IGhvbWVJbmZvLng7XHJcbiAgICB0aGlzLnkgPSBob21lSW5mby55O1xyXG4gICAgdGhpcy5uYW1lID0gaG9tZUluZm8ub3duZXI7XHJcbiAgICB0aGlzLnR5cGUgPSBob21lSW5mby50eXBlO1xyXG4gICAgdGhpcy5yYWRpdXMgPSBob21lSW5mby5yYWRpdXM7XHJcbiAgICB0aGlzLnNoYXJkcyA9IGhvbWVJbmZvLnNoYXJkcztcclxuICAgIHRoaXMucG93ZXIgPSBob21lSW5mby5wb3dlcjtcclxuICAgIHRoaXMubGV2ZWwgPSBob21lSW5mby5sZXZlbDtcclxuICAgIHRoaXMuaGFzQ29sb3IgPSBob21lSW5mby5oYXNDb2xvcjtcclxuICAgIHRoaXMuaGVhbHRoID0gaG9tZUluZm8uaGVhbHRoO1xyXG4gICAgdGhpcy5uZWlnaGJvcnMgPSBob21lSW5mby5uZWlnaGJvcnM7XHJcblxyXG4gICAgdGhpcy51bml0RG1nID0gaG9tZUluZm8udW5pdERtZztcclxuICAgIHRoaXMudW5pdFNwZWVkID0gaG9tZUluZm8udW5pdFNwZWVkO1xyXG4gICAgdGhpcy51bml0QXJtb3IgPSBob21lSW5mby51bml0QXJtb3I7XHJcbiAgICB0aGlzLnF1ZXVlID0gaG9tZUluZm8ucXVldWU7XHJcbiAgICB0aGlzLmJvdHMgPSBob21lSW5mby5ib3RzO1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5cclxuSG9tZS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKGhvbWVJbmZvKSB7XHJcbiAgICB0aGlzLnNoYXJkcyA9IGhvbWVJbmZvLnNoYXJkcztcclxuICAgIHRoaXMubGV2ZWwgPSBob21lSW5mby5sZXZlbDtcclxuICAgIHRoaXMucmFkaXVzID0gaG9tZUluZm8ucmFkaXVzO1xyXG4gICAgdGhpcy5wb3dlciA9IGhvbWVJbmZvLnBvd2VyO1xyXG4gICAgdGhpcy5oZWFsdGggPSBob21lSW5mby5oZWFsdGg7XHJcbiAgICB0aGlzLmhhc0NvbG9yID0gaG9tZUluZm8uaGFzQ29sb3I7XHJcbiAgICB0aGlzLm5laWdoYm9ycyA9IGhvbWVJbmZvLm5laWdoYm9ycztcclxuICAgIHRoaXMudW5pdERtZyA9IGhvbWVJbmZvLnVuaXREbWc7XHJcbiAgICB0aGlzLnVuaXRTcGVlZCA9IGhvbWVJbmZvLnVuaXRTcGVlZDtcclxuICAgIHRoaXMudW5pdEFybW9yID0gaG9tZUluZm8udW5pdEFybW9yO1xyXG4gICAgdGhpcy5xdWV1ZSA9IGhvbWVJbmZvLnF1ZXVlO1xyXG4gICAgdGhpcy5ib3RzID0gaG9tZUluZm8uYm90cztcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSG9tZTtcclxuXHJcblxyXG5Ib21lLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50LmRyYWZ0Q3R4O1xyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgaWYgKHRoaXMubmVpZ2hib3JzLmxlbmd0aCA+PSA0KSB7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiIzQxNjllMVwiO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCIjMzk2YTZkXCI7XHJcbiAgICB9XHJcblxyXG4gICAgY3R4LmFyYyh0aGlzLngsIHRoaXMueSwgdGhpcy5yYWRpdXMsIDAsIDIgKiBNYXRoLlBJLCBmYWxzZSk7XHJcbiAgICBjdHguZmlsbCgpO1xyXG5cclxuICAgIHZhciBzZWxmUGxheWVyID0gdGhpcy5jbGllbnQuQ09OVFJPTExFUl9MSVNUW3RoaXMuY2xpZW50LlNFTEZJRF07XHJcblxyXG4gICAgaWYgKGluQm91bmRzQ2xvc2Uoc2VsZlBsYXllciwgdGhpcy54LCB0aGlzLnkpKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuZmFjdGlvbilcclxuICAgICAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCJyZ2JhKDEyLCAyNTUsIDIxOCwgMC43KVwiO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSAxMDtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMub3duZXIgIT09IG51bGwpIHtcclxuICAgICAgICBjdHguZmlsbFRleHQodGhpcy5zaGFyZHMubGVuZ3RoLCB0aGlzLngsIHRoaXMueSArIDQwKTtcclxuICAgIH1cclxuICAgIGN0eC5jbG9zZVBhdGgoKTtcclxufTtcclxuXHJcblxyXG5mdW5jdGlvbiBpbkJvdW5kc0Nsb3NlKHBsYXllciwgeCwgeSkge1xyXG4gICAgdmFyIHJhbmdlID0gMTUwO1xyXG4gICAgcmV0dXJuIHggPCAocGxheWVyLnggKyByYW5nZSkgJiYgeCA+IChwbGF5ZXIueCAtIDUgLyA0ICogcmFuZ2UpXHJcbiAgICAgICAgJiYgeSA8IChwbGF5ZXIueSArIHJhbmdlKSAmJiB5ID4gKHBsYXllci55IC0gNSAvIDQgKiByYW5nZSk7XHJcbn1cclxuIiwiZnVuY3Rpb24gTGFzZXIobGFzZXJJbmZvLCBjbGllbnQpIHtcclxuICAgIHRoaXMuaWQgPSBsYXNlckluZm8uaWQ7XHJcbiAgICB0aGlzLm93bmVyID0gbGFzZXJJbmZvLm93bmVyO1xyXG4gICAgdGhpcy50YXJnZXQgPSBsYXNlckluZm8udGFyZ2V0O1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5MYXNlci5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5kcmFmdEN0eDtcclxuICAgIHZhciB0YXJnZXQgPSB0aGlzLmNsaWVudC5DT05UUk9MTEVSX0xJU1RbdGhpcy50YXJnZXRdO1xyXG4gICAgdmFyIG93bmVyID0gdGhpcy5jbGllbnQuQ09OVFJPTExFUl9MSVNUW3RoaXMub3duZXJdO1xyXG5cclxuICAgIGlmICh0YXJnZXQgJiYgb3duZXIpIHtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4Lm1vdmVUbyhvd25lci54LCBvd25lci55KTtcclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcIiM5MTIyMjJcIjtcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gMTA7XHJcbiAgICAgICAgY3R4LmxpbmVUbyh0YXJnZXQueCwgdGFyZ2V0LnkpO1xyXG4gICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTGFzZXI7IiwiZnVuY3Rpb24gTWluaU1hcCgpIHtcclxufVxyXG5cclxuTWluaU1hcC5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGlmIChtYXBUaW1lciA8PSAwIHx8IHNlcnZlck1hcCA9PT0gbnVsbCkge1xyXG4gICAgICAgIHZhciB0aWxlTGVuZ3RoID0gTWF0aC5zcXJ0KE9iamVjdC5zaXplKFRJTEVfTElTVCkpO1xyXG4gICAgICAgIGlmICh0aWxlTGVuZ3RoID09PSAwIHx8ICFzZWxmUGxheWVyKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGltZ0RhdGEgPSBtYWluQ3R4LmNyZWF0ZUltYWdlRGF0YSh0aWxlTGVuZ3RoLCB0aWxlTGVuZ3RoKTtcclxuICAgICAgICB2YXIgdGlsZTtcclxuICAgICAgICB2YXIgdGlsZVJHQjtcclxuICAgICAgICB2YXIgaSA9IDA7XHJcblxyXG5cclxuICAgICAgICBmb3IgKHZhciBpZCBpbiBUSUxFX0xJU1QpIHtcclxuICAgICAgICAgICAgdGlsZVJHQiA9IHt9O1xyXG4gICAgICAgICAgICB0aWxlID0gVElMRV9MSVNUW2lkXTtcclxuICAgICAgICAgICAgaWYgKHRpbGUuY29sb3IgJiYgdGlsZS5hbGVydCB8fCBpbkJvdW5kcyhzZWxmUGxheWVyLCB0aWxlLngsIHRpbGUueSkpIHtcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuciA9IHRpbGUuY29sb3IucjtcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuZyA9IHRpbGUuY29sb3IuZztcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuYiA9IHRpbGUuY29sb3IuYjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuciA9IDA7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLmcgPSAwO1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5iID0gMDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2ldID0gdGlsZVJHQi5yO1xyXG4gICAgICAgICAgICBpbWdEYXRhLmRhdGFbaSArIDFdID0gdGlsZVJHQi5nO1xyXG4gICAgICAgICAgICBpbWdEYXRhLmRhdGFbaSArIDJdID0gdGlsZVJHQi5iO1xyXG4gICAgICAgICAgICBpbWdEYXRhLmRhdGFbaSArIDNdID0gMjU1O1xyXG4gICAgICAgICAgICBpICs9IDQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnNvbGUubG9nKDQwMCAvIE9iamVjdC5zaXplKFRJTEVfTElTVCkpO1xyXG4gICAgICAgIGltZ0RhdGEgPSBzY2FsZUltYWdlRGF0YShpbWdEYXRhLCBNYXRoLmZsb29yKDQwMCAvIE9iamVjdC5zaXplKFRJTEVfTElTVCkpLCBtYWluQ3R4KTtcclxuXHJcbiAgICAgICAgbU1hcEN0eC5wdXRJbWFnZURhdGEoaW1nRGF0YSwgMCwgMCk7XHJcblxyXG4gICAgICAgIG1NYXBDdHhSb3Qucm90YXRlKDkwICogTWF0aC5QSSAvIDE4MCk7XHJcbiAgICAgICAgbU1hcEN0eFJvdC5zY2FsZSgxLCAtMSk7XHJcbiAgICAgICAgbU1hcEN0eFJvdC5kcmF3SW1hZ2UobU1hcCwgMCwgMCk7XHJcbiAgICAgICAgbU1hcEN0eFJvdC5zY2FsZSgxLCAtMSk7XHJcbiAgICAgICAgbU1hcEN0eFJvdC5yb3RhdGUoMjcwICogTWF0aC5QSSAvIDE4MCk7XHJcblxyXG4gICAgICAgIHNlcnZlck1hcCA9IG1NYXBSb3Q7XHJcbiAgICAgICAgbWFwVGltZXIgPSAyNTtcclxuICAgIH1cclxuXHJcbiAgICBlbHNlIHtcclxuICAgICAgICBtYXBUaW1lciAtPSAxO1xyXG4gICAgfVxyXG5cclxuICAgIG1haW5DdHguZHJhd0ltYWdlKHNlcnZlck1hcCwgODAwLCA0MDApO1xyXG59OyAvL2RlcHJlY2F0ZWRcclxuXHJcbk1pbmlNYXAucHJvdG90eXBlLnNjYWxlSW1hZ2VEYXRhID0gZnVuY3Rpb24gKGltYWdlRGF0YSwgc2NhbGUsIG1haW5DdHgpIHtcclxuICAgIHZhciBzY2FsZWQgPSBtYWluQ3R4LmNyZWF0ZUltYWdlRGF0YShpbWFnZURhdGEud2lkdGggKiBzY2FsZSwgaW1hZ2VEYXRhLmhlaWdodCAqIHNjYWxlKTtcclxuICAgIHZhciBzdWJMaW5lID0gbWFpbkN0eC5jcmVhdGVJbWFnZURhdGEoc2NhbGUsIDEpLmRhdGE7XHJcbiAgICBmb3IgKHZhciByb3cgPSAwOyByb3cgPCBpbWFnZURhdGEuaGVpZ2h0OyByb3crKykge1xyXG4gICAgICAgIGZvciAodmFyIGNvbCA9IDA7IGNvbCA8IGltYWdlRGF0YS53aWR0aDsgY29sKyspIHtcclxuICAgICAgICAgICAgdmFyIHNvdXJjZVBpeGVsID0gaW1hZ2VEYXRhLmRhdGEuc3ViYXJyYXkoXHJcbiAgICAgICAgICAgICAgICAocm93ICogaW1hZ2VEYXRhLndpZHRoICsgY29sKSAqIDQsXHJcbiAgICAgICAgICAgICAgICAocm93ICogaW1hZ2VEYXRhLndpZHRoICsgY29sKSAqIDQgKyA0XHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIGZvciAodmFyIHggPSAwOyB4IDwgc2NhbGU7IHgrKykgc3ViTGluZS5zZXQoc291cmNlUGl4ZWwsIHggKiA0KVxyXG4gICAgICAgICAgICBmb3IgKHZhciB5ID0gMDsgeSA8IHNjYWxlOyB5KyspIHtcclxuICAgICAgICAgICAgICAgIHZhciBkZXN0Um93ID0gcm93ICogc2NhbGUgKyB5O1xyXG4gICAgICAgICAgICAgICAgdmFyIGRlc3RDb2wgPSBjb2wgKiBzY2FsZTtcclxuICAgICAgICAgICAgICAgIHNjYWxlZC5kYXRhLnNldChzdWJMaW5lLCAoZGVzdFJvdyAqIHNjYWxlZC53aWR0aCArIGRlc3RDb2wpICogNClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gc2NhbGVkO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNaW5pTWFwOyIsImZ1bmN0aW9uIFNoYXJkKHRoaXNJbmZvLCBjbGllbnQpIHtcclxuICAgIHRoaXMuaWQgPSB0aGlzSW5mby5pZDtcclxuICAgIHRoaXMueCA9IHRoaXNJbmZvLng7XHJcbiAgICB0aGlzLnkgPSB0aGlzSW5mby55O1xyXG4gICAgdGhpcy5uYW1lID0gdGhpc0luZm8ubmFtZTtcclxuICAgIHRoaXMudmlzaWJsZSA9IHRoaXNJbmZvLnZpc2libGU7XHJcblxyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbn1cclxuXHJcblNoYXJkLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAodGhpc0luZm8pIHtcclxuICAgIHRoaXMueCA9IHRoaXNJbmZvLng7XHJcbiAgICB0aGlzLnkgPSB0aGlzSW5mby55O1xyXG4gICAgdGhpcy52aXNpYmxlID0gdGhpc0luZm8udmlzaWJsZTtcclxuICAgIHRoaXMubmFtZSA9IHRoaXNJbmZvLm5hbWU7XHJcbn07XHJcblxyXG5cclxuU2hhcmQucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgY3R4ID0gdGhpcy5jbGllbnQuZHJhZnRDdHg7XHJcbiAgICBjdHgubGluZVdpZHRoID0gMjtcclxuXHJcbiAgICBpZiAodGhpcy52aXNpYmxlKSB7XHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGlmICh0aGlzLm5hbWUgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgY3R4LmZvbnQgPSBcIjMwcHggQXJpYWxcIjtcclxuICAgICAgICAgICAgY3R4LmZpbGxUZXh0KHRoaXMubmFtZSwgdGhpcy54LCB0aGlzLnkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2JhKDEwMCwgMjU1LCAyMjcsIDAuMSlcIjtcclxuICAgICAgICBjdHguYXJjKHRoaXMueCwgdGhpcy55LCAyMCwgMCwgMiAqIE1hdGguUEksIGZhbHNlKTtcclxuICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuXHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcIiNkZmZmNDJcIjtcclxuXHJcbiAgICAgICAgdmFyIHJhZGl1cyA9IDEwLCBpO1xyXG4gICAgICAgIHZhciBzdGFydFRoZXRhID0gZ2V0UmFuZG9tKDAsIDAuMik7XHJcbiAgICAgICAgdmFyIHRoZXRhID0gMDtcclxuICAgICAgICB2YXIgc3RhcnRYID0gcmFkaXVzICogTWF0aC5jb3Moc3RhcnRUaGV0YSk7XHJcbiAgICAgICAgdmFyIHN0YXJ0WSA9IHJhZGl1cyAqIE1hdGguc2luKHN0YXJ0VGhldGEpO1xyXG4gICAgICAgIGN0eC5tb3ZlVG8odGhpcy54ICsgc3RhcnRYLCB0aGlzLnkgKyBzdGFydFkpO1xyXG4gICAgICAgIGZvciAoaSA9IE1hdGguUEkgLyAyOyBpIDw9IDIgKiBNYXRoLlBJIC0gTWF0aC5QSSAvIDI7IGkgKz0gTWF0aC5QSSAvIDIpIHtcclxuICAgICAgICAgICAgdGhldGEgPSBzdGFydFRoZXRhICsgaSArIGdldFJhbmRvbSgtMSAvIDI0LCAxIC8gMjQpO1xyXG4gICAgICAgICAgICB2YXIgeCA9IHJhZGl1cyAqIE1hdGguY29zKHRoZXRhKTtcclxuICAgICAgICAgICAgdmFyIHkgPSByYWRpdXMgKiBNYXRoLnNpbih0aGV0YSk7XHJcbiAgICAgICAgICAgIGN0eC5saW5lVG8odGhpcy54ICsgeCwgdGhpcy55ICsgeSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGN0eC5saW5lVG8odGhpcy54ICsgc3RhcnRYLCB0aGlzLnkgKyBzdGFydFkpO1xyXG4gICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5mdW5jdGlvbiBnZXRSYW5kb20obWluLCBtYXgpIHtcclxuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikgKyBtaW47XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU2hhcmQ7IiwiZnVuY3Rpb24gVGlsZSh0aGlzSW5mbywgY2xpZW50KSB7XHJcbiAgICB0aGlzLmlkID0gdGhpc0luZm8uaWQ7XHJcbiAgICB0aGlzLnggPSB0aGlzSW5mby54O1xyXG4gICAgdGhpcy55ID0gdGhpc0luZm8ueTtcclxuICAgIHRoaXMubGVuZ3RoID0gdGhpc0luZm8ubGVuZ3RoO1xyXG4gICAgdGhpcy5jb2xvciA9IHRoaXNJbmZvLmNvbG9yO1xyXG4gICAgdGhpcy5hbGVydCA9IHRoaXNJbmZvLmFsZXJ0O1xyXG4gICAgdGhpcy5yYW5kb20gPSBNYXRoLmZsb29yKGdldFJhbmRvbSgwLCAzKSk7XHJcblxyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbn1cclxuXHJcblRpbGUucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICh0aGlzSW5mbykge1xyXG4gICAgdGhpcy5jb2xvciA9IHRoaXNJbmZvLmNvbG9yO1xyXG4gICAgdGhpcy5hbGVydCA9IHRoaXNJbmZvLmFsZXJ0O1xyXG59O1xyXG5cclxuVGlsZS5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5kcmFmdEN0eDtcclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgIGN0eC5maWxsU3R5bGUgPSBcInJnYihcIiArXHJcbiAgICAgICAgdGhpcy5jb2xvci5yICsgXCIsXCIgK1xyXG4gICAgICAgIHRoaXMuY29sb3IuZyArIFwiLFwiICtcclxuICAgICAgICB0aGlzLmNvbG9yLmIgK1xyXG4gICAgICAgIFwiKVwiO1xyXG5cclxuICAgIGN0eC5saW5lV2lkdGggPSAxNTtcclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiIzFlMmEyYlwiO1xyXG5cclxuICAgIGN0eC5yZWN0KHRoaXMueCwgdGhpcy55LCB0aGlzLmxlbmd0aCwgdGhpcy5sZW5ndGgpO1xyXG4gICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgY3R4LmZpbGwoKTtcclxufTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFRpbGU7XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0UmFuZG9tKG1pbiwgbWF4KSB7XHJcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pICsgbWluO1xyXG59IiwibW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgICBBbmltYXRpb246IHJlcXVpcmUoJy4vQW5pbWF0aW9uJyksXHJcbiAgICBBcnJvdzogcmVxdWlyZSgnLi9BcnJvdycpLFxyXG4gICAgQnJhY2tldDogcmVxdWlyZSgnLi9CcmFja2V0JyksXHJcbiAgICBDb250cm9sbGVyOiByZXF1aXJlKCcuL0NvbnRyb2xsZXInKSxcclxuICAgIEZhY3Rpb246IHJlcXVpcmUoJy4vRmFjdGlvbicpLFxyXG4gICAgSG9tZTogcmVxdWlyZSgnLi9Ib21lJyksXHJcbiAgICBMYXNlcjogcmVxdWlyZSgnLi9MYXNlcicpLFxyXG4gICAgTWluaU1hcDogcmVxdWlyZSgnLi9NaW5pTWFwJyksXHJcbiAgICBTaGFyZDogcmVxdWlyZSgnLi9TaGFyZCcpLFxyXG4gICAgVGlsZTogcmVxdWlyZSgnLi9UaWxlJylcclxufTsiLCJ2YXIgQ2xpZW50ID0gcmVxdWlyZSgnLi9DbGllbnQuanMnKTtcclxudmFyIE1haW5VSSA9IHJlcXVpcmUoJy4vdWkvTWFpblVJJyk7XHJcblxyXG52YXIgY2xpZW50ID0gbmV3IENsaWVudCgpO1xyXG52YXIgbWFpblVJID0gbmV3IE1haW5VSShjbGllbnQsIGNsaWVudC5zb2NrZXQpO1xyXG5cclxuXHJcbm1haW5VSS5wbGF5ZXJOYW1lclVJLm9wZW4oKTtcclxubWFpblVJLmdhbWVVSS5vcGVuKCk7XHJcblxyXG5cclxuZG9jdW1lbnQub25rZXlkb3duID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICBjbGllbnQua2V5c1tldmVudC5rZXlDb2RlXSA9IHRydWU7XHJcbiAgICBjbGllbnQuc29ja2V0LmVtaXQoJ2tleUV2ZW50Jywge2lkOiBldmVudC5rZXlDb2RlLCBzdGF0ZTogdHJ1ZX0pO1xyXG59O1xyXG5cclxuZG9jdW1lbnQub25rZXl1cCA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgY2xpZW50LmtleXNbZXZlbnQua2V5Q29kZV0gPSBmYWxzZTtcclxuICAgIGNsaWVudC5zb2NrZXQuZW1pdCgna2V5RXZlbnQnLCB7aWQ6IGV2ZW50LmtleUNvZGUsIHN0YXRlOiBmYWxzZX0pO1xyXG59O1xyXG5cclxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY29udGV4dG1lbnUnLCBmdW5jdGlvbiAoZSkgeyAvL3ByZXZlbnQgcmlnaHQtY2xpY2sgY29udGV4dCBtZW51XHJcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbn0sIGZhbHNlKTsiLCJkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUub3ZlcmZsb3cgPSAnaGlkZGVuJzsgIC8vIGZpcmVmb3gsIGNocm9tZVxyXG5kb2N1bWVudC5ib2R5LnNjcm9sbCA9IFwibm9cIjtcclxudmFyIFBsYXllck5hbWVyVUkgPSByZXF1aXJlKCcuL1BsYXllck5hbWVyVUknKTtcclxudmFyIFNoYXJkTmFtZXJVSSA9IHJlcXVpcmUoJy4vU2hhcmROYW1lclVJJyk7XHJcbnZhciBHYW1lVUkgPSByZXF1aXJlKCcuL2dhbWUvR2FtZVVJJyk7XHJcbnZhciBIb21lVUkgPSByZXF1aXJlKFwiLi9ob21lL0hvbWVVSVwiKTtcclxuXHJcbmZ1bmN0aW9uIE1haW5VSShjbGllbnQsIHNvY2tldCkge1xyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbiAgICB0aGlzLnNvY2tldCA9IHNvY2tldDtcclxuXHJcbiAgICB0aGlzLnBsYXllck5hbWVyVUkgPSBuZXcgUGxheWVyTmFtZXJVSSh0aGlzLmNsaWVudCwgdGhpcy5zb2NrZXQpO1xyXG4gICAgdGhpcy5nYW1lVUkgPSBuZXcgR2FtZVVJKHRoaXMuY2xpZW50LCB0aGlzLnNvY2tldCk7XHJcbiAgICB0aGlzLnNoYXJkTmFtZXJVSSA9IG5ldyBTaGFyZE5hbWVyVUkodGhpcy5jbGllbnQsIHRoaXMuc29ja2V0KTtcclxuICAgIHRoaXMuaG9tZVVJID0gbmV3IEhvbWVVSSh0aGlzLmNsaWVudCwgdGhpcy5zb2NrZXQpO1xyXG59XHJcblxyXG5NYWluVUkucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoaW5mbykge1xyXG4gICAgdmFyIGFjdGlvbiA9IGluZm8uYWN0aW9uO1xyXG4gICAgdmFyIGhvbWU7XHJcblxyXG4gICAgaWYgKGFjdGlvbiA9PT0gXCJuYW1lIHNoYXJkXCIpIHtcclxuICAgICAgICB0aGlzLnNoYXJkTmFtZXJVSS5vcGVuKCk7XHJcbiAgICB9XHJcbiAgICBpZiAoYWN0aW9uID09PSBcImhvbWUgaW5mb1wiKSB7XHJcbiAgICAgICAgaG9tZSA9IHRoaXMuY2xpZW50LkhPTUVfTElTVFtpbmZvLmhvbWVJZF07XHJcbiAgICAgICAgdGhpcy5ob21lVUkub3Blbihob21lKTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5NYWluVUkucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKGFjdGlvbikge1xyXG4gICAgaWYgKGFjdGlvbiA9PT0gXCJuYW1lIHNoYXJkXCIpIHtcclxuICAgICAgICB0aGlzLnNoYXJkTmFtZXJVSS5jbG9zZSgpO1xyXG4gICAgfVxyXG4gICAgaWYgKGFjdGlvbiA9PT0gXCJob21lIGluZm9cIikge1xyXG4gICAgICAgIHRoaXMuTElTVF9TQ1JPTEwgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLmhvbWVVSS5jbG9zZSgpO1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJyZW1vdmVWaWV3ZXJcIiwge30pO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbk1haW5VSS5wcm90b3R5cGUudXBkYXRlTGVhZGVyQm9hcmQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgbGVhZGVyYm9hcmQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImxlYWRlcmJvYXJkXCIpO1xyXG4gICAgbGVhZGVyYm9hcmQuaW5uZXJIVE1MID0gXCJcIjtcclxuICAgIGZvciAodmFyIGkgPSBGQUNUSU9OX0FSUkFZLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcbiAgICAgICAgdmFyIGZhY3Rpb24gPSBGQUNUSU9OX0FSUkFZW2ldO1xyXG5cclxuICAgICAgICB2YXIgZW50cnkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xyXG4gICAgICAgIGVudHJ5LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGZhY3Rpb24ubmFtZSkpO1xyXG4gICAgICAgIGxlYWRlcmJvYXJkLmFwcGVuZENoaWxkKGVudHJ5KTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5cclxuXHJcbi8qKiBERVBSRUNBVEVEIE1FVEhPRFMgKiovXHJcbk1haW5VSS5wcm90b3R5cGUudXBkYXRlVUkgPSBmdW5jdGlvbiAoaW5mbykge1xyXG4gICAgdmFyIGFjdGlvbiA9IGluZm8uYWN0aW9uO1xyXG4gICAgdmFyIGhvbWU7XHJcbiAgICBpZiAoYWN0aW9uID09PSBcInVwZGF0ZSBxdWV1ZVwiKSB7XHJcbiAgICAgICAgdmFyIGJ1aWxkUXVldWUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnVpbGRfcXVldWUnKTtcclxuICAgICAgICBob21lID0gdGhpcy5jbGllbnQuSE9NRV9MSVNUW2luZm8uaG9tZUlkXTtcclxuICAgICAgICBhZGRRdWV1ZUluZm8oYnVpbGRRdWV1ZSwgaG9tZSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTWFpblVJOyIsImZ1bmN0aW9uIFBsYXllck5hbWVyVUkgKGNsaWVudCwgc29ja2V0KSB7XHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxuICAgIHRoaXMuc29ja2V0ID0gc29ja2V0O1xyXG5cclxuICAgIHRoaXMubGVhZGVyYm9hcmQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImxlYWRlcmJvYXJkX2NvbnRhaW5lclwiKTtcclxuICAgIHRoaXMubmFtZUJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibmFtZVN1Ym1pdFwiKTtcclxuICAgIHRoaXMucGxheWVyTmFtZUlucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwbGF5ZXJOYW1lSW5wdXRcIik7XHJcbiAgICB0aGlzLmZhY3Rpb25OYW1lSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImZhY3Rpb25OYW1lSW5wdXRcIik7XHJcbiAgICB0aGlzLnBsYXllck5hbWVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwbGF5ZXJfbmFtZXJcIik7XHJcbn1cclxuXHJcblBsYXllck5hbWVyVUkucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgdGhpcy5wbGF5ZXJOYW1lSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDEzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZmFjdGlvbk5hbWVJbnB1dC5mb2N1cygpO1xyXG4gICAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG4gICAgdGhpcy5mYWN0aW9uTmFtZUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSAxMykge1xyXG4gICAgICAgICAgICB0aGlzLm5hbWVCdG4uY2xpY2soKTtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMubmFtZUJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuY2xpZW50Lm1haW5DYW52YXMuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgICAgIHRoaXMubGVhZGVyYm9hcmQuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJuZXdQbGF5ZXJcIixcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogdGhpcy5wbGF5ZXJOYW1lSW5wdXQudmFsdWUsXHJcbiAgICAgICAgICAgICAgICBmYWN0aW9uOiB0aGlzLmZhY3Rpb25OYW1lSW5wdXQudmFsdWVcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5wbGF5ZXJOYW1lci5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICB0aGlzLnBsYXllck5hbWVyLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgIHRoaXMucGxheWVyTmFtZUlucHV0LmZvY3VzKCk7XHJcbiAgICB0aGlzLmxlYWRlcmJvYXJkLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBQbGF5ZXJOYW1lclVJOyIsInZhciB1aSA9IHJlcXVpcmUoJy4vU2hhcmROYW1lclVJJyk7XHJcblxyXG5mdW5jdGlvbiBTaGFyZE5hbWVyVUkoY2xpZW50LCBzb2NrZXQpIHtcclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XHJcblxyXG4gICAgdGhpcy5zaGFyZE5hbWVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NoYXJkX25hbWVyX3VpJyk7XHJcbiAgICB0aGlzLnRleHRJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidGV4dElucHV0XCIpO1xyXG4gICAgdGhpcy5uYW1lU2hhcmRCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm5hbWVTaGFyZEJ0blwiKTtcclxufVxyXG5cclxuU2hhcmROYW1lclVJLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHNoYXJkTmFtZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2hhcmRfbmFtZXJfdWknKTtcclxuICAgIHZhciB0ZXh0SW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInRleHRJbnB1dFwiKTtcclxuICAgIHZhciBuYW1lU2hhcmRCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm5hbWVTaGFyZEJ0blwiKTtcclxuXHJcbiAgICBzaGFyZE5hbWVyLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xyXG5cclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCB0aGlzLmZvY3VzVGV4dElucHV0KTtcclxuXHJcbiAgICB0ZXh0SW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDEzKSB7XHJcbiAgICAgICAgICAgIHZhciB0ZXh0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0ZXh0SW5wdXRcIikudmFsdWU7XHJcbiAgICAgICAgICAgIGlmICh0ZXh0ICE9PSBudWxsICYmIHRleHQgIT09IFwiXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc29ja2V0LmVtaXQoJ3RleHRJbnB1dCcsXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogc2VsZklkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3b3JkOiB0ZXh0XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHVpLmNsb3NlVUkoXCJuYW1lIHNoYXJkXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59O1xyXG5cclxuU2hhcmROYW1lclVJLnByb3RvdHlwZS5mb2N1c1RleHRJbnB1dCA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgIGlmIChldmVudC5rZXlDb2RlID09PSAxMykge1xyXG4gICAgICAgIHRleHRJbnB1dC5mb2N1cygpO1xyXG4gICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCBmb2N1c1RleHRJbnB1dCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5TaGFyZE5hbWVyVUkucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy50ZXh0SW5wdXQudmFsdWUgPSBcIlwiO1xyXG4gICAgdGhpcy50ZW1wbGF0ZS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTaGFyZE5hbWVyVUk7XHJcbiIsImZ1bmN0aW9uIEdhbWVVSSgpIHtcclxuXHJcbn1cclxuXHJcbkdhbWVVSS5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBzaGFyZE5hbWVyUHJvbXB0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NoYXJkX25hbWVyX3Byb21wdCcpO1xyXG4gICAgc2hhcmROYW1lclByb21wdC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIG9wZW5TaGFyZE5hbWVyVUkoKTtcclxuICAgIH0pO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSAgR2FtZVVJOyIsInZhciBMaXN0VUkgPSByZXF1aXJlKCcuL0xpc3RVSScpO1xyXG5cclxuZnVuY3Rpb24gQm90c1BhZ2UoaG9tZVVJKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJib3RzX3BhZ2VcIik7XHJcbiAgICB0aGlzLmJvdHNMaXN0VUkgPSBuZXcgTGlzdFVJKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdib3RzX2xpc3QnKSwgaG9tZVVJKTtcclxuICAgIHRoaXMuaG9tZVVJID0gaG9tZVVJO1xyXG59XHJcblxyXG5Cb3RzUGFnZS5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcclxuICAgIGlmICh0aGlzLmhvbWVVSS5ob21lLnR5cGUgPT09IFwiQmFycmFja3NcIikge1xyXG4gICAgICAgIHRoaXMuYm90c0xpc3RVSS5hZGRCb3RzKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5Cb3RzUGFnZS5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxufTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEJvdHNQYWdlO1xyXG5cclxuIiwidmFyIExpc3RVSSA9IHJlcXVpcmUoJy4vTGlzdFVJJyk7XHJcblxyXG5cclxuZnVuY3Rpb24gQnVpbGRQYWdlKGhvbWVVSSkge1xyXG4gICAgdGhpcy50ZW1wbGF0ZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY3JlYXRlX3BhZ2VcIik7XHJcbiAgICB0aGlzLmNyZWF0ZUJvdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY3JlYXRlX2JvdF9jb250YWluZXJcIik7XHJcbiAgICB0aGlzLm1ha2VCb3RzQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21ha2VfYm90c19idG4nKTtcclxuXHJcbiAgICB0aGlzLlNFTEVDVEVEX1NIQVJEUyA9IHt9O1xyXG5cclxuICAgIHRoaXMuYnVpbGRRdWV1ZVVJID0gbmV3IExpc3RVSShkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnVpbGRfcXVldWUnKSwgaG9tZVVJKTtcclxuICAgIHRoaXMuc2hhcmRzVUkgPSBuZXcgTGlzdFVJKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdidWlsZF9zaGFyZHNfbGlzdCcpLCBob21lVUksIHRoaXMpO1xyXG4gICAgdGhpcy5ob21lVUkgPSBob21lVUk7XHJcbn1cclxuXHJcblxyXG5CdWlsZFBhZ2UucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcblxyXG4gICAgdGhpcy5TRUxFQ1RFRF9TSEFSRFMgPSB7fTtcclxuXHJcbiAgICB2YXIgbWFrZUJvdHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQuZW1pdCgnbWFrZUJvdHMnLCB7XHJcbiAgICAgICAgICAgIGhvbWU6IHRoaXMuaG9tZS5pZCxcclxuICAgICAgICAgICAgc2hhcmRzOiB0aGlzLlNFTEVDVEVEX1NIQVJEU1xyXG4gICAgICAgIH0pO1xyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG5cclxuICAgIGlmICh0aGlzLmhvbWVVSS5ob21lLnR5cGUgPT09IFwiQmFycmFja3NcIikge1xyXG4gICAgICAgIHRoaXMuaG9tZVVJLnJlc2V0QnV0dG9uKG1ha2VCb3RzQnRuLCBtYWtlQm90cyk7XHJcbiAgICAgICAgdGhpcy5jcmVhdGVCb3Quc3R5bGUuZGlzcGxheSA9IFwiZmxleFwiO1xyXG4gICAgICAgIHRoaXMuYnVpbGRRdWV1ZVVJLmFkZFF1ZXVlKHRoaXMuaG9tZVVJLmhvbWUpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLmNyZWF0ZUJvdC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcbiAgICB9XHJcbiAgICB0aGlzLnNoYXJkc1VJLmFkZFNoYXJkcygpO1xyXG59O1xyXG5cclxuQnVpbGRQYWdlLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG59O1xyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQnVpbGRQYWdlO1xyXG5cclxuIiwidmFyIFVwZ3JhZGVzUGFnZSA9IHJlcXVpcmUoJy4vVXBncmFkZXNQYWdlJyk7XHJcbnZhciBCb3RzUGFnZSA9IHJlcXVpcmUoJy4vQm90c1BhZ2UnKTtcclxudmFyIEJ1aWxkUGFnZSA9IHJlcXVpcmUoJy4vQnVpbGRQYWdlJyk7XHJcblxyXG5mdW5jdGlvbiBIb21lVUkoY2xpZW50LCBzb2NrZXQpIHtcclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XHJcbiAgICB0aGlzLnRlbXBsYXRlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2hvbWVfdWknKTtcclxuICAgIHRoaXMuaG9tZSA9IG51bGw7XHJcblxyXG4gICAgdGhpcy51cGdyYWRlc1BhZ2UgPSBudWxsO1xyXG4gICAgdGhpcy5ib3RzUGFnZSA9IG51bGw7XHJcbiAgICB0aGlzLmJ1aWxkUGFnZSA9IG51bGw7XHJcbn1cclxuXHJcbkhvbWVVSS5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uIChob21lKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xyXG4gICAgdGhpcy5ob21lID0gaG9tZTtcclxuICAgIFxyXG4gICAgaWYgKHRoaXMudXBncmFkZXNQYWdlID09PSBudWxsKSB7XHJcbiAgICAgICAgdGhpcy51cGdyYWRlc1BhZ2UgPSBuZXcgVXBncmFkZXNQYWdlKHRoaXMpO1xyXG4gICAgICAgIHRoaXMuYm90c1BhZ2UgPSBuZXcgQm90c1BhZ2UodGhpcyk7XHJcbiAgICAgICAgdGhpcy5idWlsZFBhZ2UgPSBuZXcgQnVpbGRQYWdlKHRoaXMpO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICB0aGlzLmFkZFRhYkxpc3RlbmVycygpO1xyXG4gICAgdGhpcy5vcGVuSG9tZUluZm8oKTtcclxuICAgIHRoaXMudXBncmFkZXNQYWdlLm9wZW4oKTtcclxuICAgIC8vdGhpcy5vcGVuQ29sb3JQaWNrZXIoaG9tZSk7XHJcbn07XHJcblxyXG5Ib21lVUkucHJvdG90eXBlLm9wZW5Ib21lSW5mbyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdob21lX3R5cGUnKS5pbm5lckhUTUwgPSB0aGlzLmhvbWUudHlwZTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdob21lX2xldmVsJykuaW5uZXJIVE1MID0gdGhpcy5ob21lLmxldmVsO1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2hvbWVfaGVhbHRoJykuaW5uZXJIVE1MID0gdGhpcy5ob21lLmhlYWx0aDtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdob21lX3Bvd2VyJykuaW5uZXJIVE1MID0gdGhpcy5ob21lLnBvd2VyO1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2hvbWVfZmFjdGlvbl9uYW1lJykuaW5uZXJIVE1MID0gdGhpcy5ob21lLmZhY3Rpb247XHJcbn07XHJcblxyXG5Ib21lVUkucHJvdG90eXBlLm9wZW5Db2xvclBpY2tlciA9IGZ1bmN0aW9uIChob21lKSB7XHJcbiAgICB2YXIgY29sb3JQaWNrZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNvbG9yX3BpY2tlclwiKTtcclxuICAgIHZhciBjb2xvckNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY29sb3JfY2FudmFzXCIpO1xyXG4gICAgdmFyIGNvbG9yQ3R4ID0gY29sb3JDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG5cclxuICAgIGNvbG9yQ2FudmFzLndpZHRoID0gMTAwO1xyXG4gICAgY29sb3JDYW52YXMuaGVpZ2h0ID0gMTAwO1xyXG5cclxuICAgIGlmICghaG9tZS5oYXNDb2xvciAmJiBob21lLmxldmVsID4gMSkge1xyXG4gICAgICAgIGNvbG9yUGlja2VyLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBjb2xvclBpY2tlci5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdmFyIGNvbG9ycyA9IG5ldyBJbWFnZSgpO1xyXG4gICAgY29sb3JzLnNyYyA9ICdjb2xvcnMuanBnJztcclxuICAgIGNvbG9ycy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgY29sb3JDdHguZmlsbFN0eWxlID0gXCIjMzMzZWVlXCI7XHJcbiAgICAgICAgY29sb3JDdHguZmlsbFJlY3QoMCwgMCwgY29sb3JDYW52YXMud2lkdGggLyAyLCBjb2xvckNhbnZhcy5oZWlnaHQgLyAyKTtcclxuICAgICAgICBjb2xvckN0eC5maWxsU3R5bGUgPSBcIiM2MjNlZWVcIjtcclxuICAgICAgICBjb2xvckN0eC5maWxsUmVjdChjb2xvckNhbnZhcy53aWR0aCAvIDIsIGNvbG9yQ2FudmFzLmhlaWdodCAvIDIsIGNvbG9yQ2FudmFzLndpZHRoLCBjb2xvckNhbnZhcy5oZWlnaHQpO1xyXG4gICAgfTtcclxuXHJcbiAgICBjb2xvckNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgdmFyIHJlY3QgPSBjb2xvckNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICB2YXIgeCA9IGV2ZW50LmNsaWVudFggLSByZWN0LmxlZnQ7XHJcbiAgICAgICAgdmFyIHkgPSBldmVudC5jbGllbnRZIC0gcmVjdC50b3A7XHJcbiAgICAgICAgdmFyIGltZ19kYXRhID0gY29sb3JDdHguZ2V0SW1hZ2VEYXRhKHgsIHksIDEwMCwgMTAwKS5kYXRhO1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJuZXdDb2xvclwiLCB7XHJcbiAgICAgICAgICAgIGhvbWU6IGhvbWUuaWQsXHJcbiAgICAgICAgICAgIGNvbG9yOiB7XHJcbiAgICAgICAgICAgICAgICByOiBpbWdfZGF0YVswXSxcclxuICAgICAgICAgICAgICAgIGc6IGltZ19kYXRhWzFdLFxyXG4gICAgICAgICAgICAgICAgYjogaW1nX2RhdGFbMl1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxufTtcclxuXHJcbkhvbWVVSS5wcm90b3R5cGUuYWRkVGFiTGlzdGVuZXJzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHVwZ3JhZGVzVGFiID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3VwZ3JhZGVzX3RhYicpO1xyXG4gICAgdmFyIGNyZWF0ZVRhYiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjcmVhdGVfdGFiJyk7XHJcbiAgICB2YXIgYm90c1RhYiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdib3RzX3RhYicpO1xyXG5cclxuICAgIHVwZ3JhZGVzVGFiLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGV2dCkge1xyXG4gICAgICAgIHRoaXMudXBncmFkZXNQYWdlLm9wZW4oKTtcclxuICAgICAgICB0aGlzLmJ1aWxkUGFnZS5jbG9zZSgpO1xyXG4gICAgICAgIHRoaXMuYm90c1BhZ2UuY2xvc2UoKTtcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG4gICAgY3JlYXRlVGFiLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGV2dCkge1xyXG4gICAgICAgIHRoaXMudXBncmFkZXNQYWdlLmNsb3NlKCk7XHJcbiAgICAgICAgdGhpcy5idWlsZFBhZ2Uub3BlbigpO1xyXG4gICAgICAgIHRoaXMuYm90c1BhZ2UuY2xvc2UoKTtcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG4gICAgYm90c1RhYi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChldnQpIHtcclxuICAgICAgICB0aGlzLnVwZ3JhZGVzUGFnZS5jbG9zZSgpO1xyXG4gICAgICAgIHRoaXMuYnVpbGRQYWdlLmNsb3NlKCk7XHJcbiAgICAgICAgdGhpcy5ib3RzUGFnZS5vcGVuKCk7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG59O1xyXG5cclxuSG9tZVVJLnByb3RvdHlwZS5yZXNldEJ1dHRvbiA9IGZ1bmN0aW9uIChidXR0b24sIGNhbGxiYWNrKSB7XHJcbiAgICB2YXIgc2V0U2tpbGxNZXRlciA9IGZ1bmN0aW9uIChidXR0b24pIHtcclxuICAgICAgICB2YXIgZmluZENoaWxkQ2FudmFzID0gZnVuY3Rpb24gKHNraWxsRGl2KSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2tpbGxEaXYuY2hpbGROb2Rlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHNraWxsRGl2LmNoaWxkTm9kZXNbaV0ubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gXCJjYW52YXNcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBza2lsbERpdi5jaGlsZE5vZGVzW2ldO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZhciBjYW52YXMgPSBmaW5kQ2hpbGRDYW52YXMoYnV0dG9uLnBhcmVudE5vZGUpO1xyXG4gICAgICAgIGNhbnZhcy53aWR0aCA9IDI2MDtcclxuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gMTAwO1xyXG4gICAgICAgIHZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG4gICAgICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgMTAwMCwgMjAwKTtcclxuICAgICAgICB2YXIgbWFnbml0dWRlID0gMDtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCIjRkZGRkZGXCI7XHJcbiAgICAgICAgc3dpdGNoIChidXR0b24udXBnVHlwZSkge1xyXG4gICAgICAgICAgICBjYXNlIFwiaG9tZUhlYWx0aFwiOlxyXG4gICAgICAgICAgICAgICAgbWFnbml0dWRlID0gdGhpcy5ob21lLnBvd2VyO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJkbWdcIjpcclxuICAgICAgICAgICAgICAgIG1hZ25pdHVkZSA9IHRoaXMuaG9tZS51bml0RG1nO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJhcm1vclwiOlxyXG4gICAgICAgICAgICAgICAgbWFnbml0dWRlID0gdGhpcy5ob21lLnVuaXRBcm1vcjtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwic3BlZWRcIjpcclxuICAgICAgICAgICAgICAgIG1hZ25pdHVkZSA9IHRoaXMuaG9tZS51bml0U3BlZWQ7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCBtYWduaXR1ZGUgKiAxMCwgMjAwKTtcclxuICAgIH07XHJcbiAgICB2YXIgbmV3QnV0dG9uID0gYnV0dG9uLmNsb25lTm9kZSh0cnVlKTtcclxuICAgIGJ1dHRvbi5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdCdXR0b24sIGJ1dHRvbik7XHJcbiAgICBidXR0b24gPSBuZXdCdXR0b247XHJcbiAgICBidXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjYWxsYmFjayk7XHJcbiAgICBpZiAoYnV0dG9uLnVwZ1R5cGUpIHtcclxuICAgICAgICBzZXRTa2lsbE1ldGVyKGJ1dHRvbik7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gYnV0dG9uO1xyXG59O1xyXG5cclxuSG9tZVVJLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSG9tZVVJO1xyXG4iLCJmdW5jdGlvbiBMaXN0VUkobGlzdCwgaG9tZVVJLCBwYXJlbnQpIHtcclxuICAgIHRoaXMubGlzdCA9IGxpc3Q7XHJcbiAgICB0aGlzLmhvbWVVSSA9IGhvbWVVSTtcclxuICAgIHRoaXMuY2xpZW50ID0gaG9tZVVJLmNsaWVudDtcclxuICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xyXG5cclxuICAgIHRoaXMubGlzdC5hZGRFdmVudExpc3RlbmVyKCdzY3JvbGwnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICB0aGlzLmhvbWVVSS5MSVNUX1NDUk9MTCA9IHRydWU7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG59XHJcblxyXG5MaXN0VUkucHJvdG90eXBlLmFkZFF1ZXVlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGhvbWUgPSB0aGlzLmhvbWVVSS5ob21lO1xyXG4gICAgdGhpcy5saXN0LmlubmVySFRNTCA9IFwiXCI7XHJcbiAgICBpZiAoIWhvbWUucXVldWUpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGhvbWUucXVldWUubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgYnVpbGRJbmZvID0gaG9tZS5xdWV1ZVtpXTtcclxuICAgICAgICB2YXIgZW50cnkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xyXG4gICAgICAgIGVudHJ5LmlkID0gTWF0aC5yYW5kb20oKTtcclxuXHJcbiAgICAgICAgKGZ1bmN0aW9uIChfaWQpIHtcclxuICAgICAgICAgICAgZW50cnkuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5jbGlja2VkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGlja2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0eWxlLmJhY2tncm91bmQgPSBcIiNmZmZiMjJcIjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2xpY2tlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3R5bGUuYmFja2dyb3VuZCA9IFwiIzU0MmZjZVwiO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KShlbnRyeS5pZCk7XHJcblxyXG4gICAgICAgIGVudHJ5LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKFxyXG4gICAgICAgICAgICBidWlsZEluZm8uc2hhcmROYW1lICsgXCIgLS0gXCIgKyBNYXRoLmZsb29yKGJ1aWxkSW5mby50aW1lciAvIDEwMDApICtcclxuICAgICAgICAgICAgXCI6XCIgKyBNYXRoLmZsb29yKGJ1aWxkSW5mby50aW1lciAlIDEwMDApKSk7XHJcbiAgICAgICAgdGhpcy5saXN0LmFwcGVuZENoaWxkKGVudHJ5KTtcclxuICAgIH1cclxufTtcclxuXHJcbkxpc3RVSS5wcm90b3R5cGUuYWRkQm90cyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBob21lID0gdGhpcy5ob21lVUkuaG9tZTtcclxuICAgIHRoaXMubGlzdC5pbm5lckhUTUwgPSBcIlwiO1xyXG4gICAgaWYgKCFob21lLnF1ZXVlKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBob21lLmJvdHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgYm90SW5mbyA9IGhvbWUuYm90c1tpXTtcclxuICAgICAgICB2YXIgZW50cnkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xyXG4gICAgICAgIGVudHJ5LmlkID0gTWF0aC5yYW5kb20oKTtcclxuXHJcbiAgICAgICAgKGZ1bmN0aW9uIChfaWQpIHtcclxuICAgICAgICAgICAgZW50cnkuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5jbGlja2VkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGlja2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0eWxlLmJhY2tncm91bmQgPSBcIiNmZmZiMjJcIjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2xpY2tlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3R5bGUuYmFja2dyb3VuZCA9IFwiIzU0MmZjZVwiO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KShlbnRyeS5pZCk7XHJcblxyXG4gICAgICAgIGVudHJ5LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKFxyXG4gICAgICAgICAgICBib3RJbmZvLm5hbWUgKyBcIiAtLSBcIiArIFwiTGV2ZWw6XCIgKyBib3RJbmZvLmxldmVsKSk7XHJcbiAgICAgICAgdGhpcy5saXN0LmFwcGVuZENoaWxkKGVudHJ5KTtcclxuICAgIH1cclxufTtcclxuXHJcbkxpc3RVSS5wcm90b3R5cGUuYWRkU2hhcmRzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGhvbWUgPSB0aGlzLmhvbWVVSS5ob21lO1xyXG4gICAgdmFyIGNoZWNrU2VsZWN0aW9uID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBibGRCYXNlSGVhbHRoQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JsZF9ob21lX2J0bicpO1xyXG4gICAgICAgIHZhciBtYWtlQm90c0J0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYWtlX2JvdHNfYnRuJyk7XHJcbiAgICAgICAgdmFyIGJsZEFybW9yQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JsZF9hcm1vcicpO1xyXG4gICAgICAgIHZhciBibGRTcGVlZEJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdibGRfc3BlZWQnKTtcclxuICAgICAgICB2YXIgYmxkRG1nQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JsZF9kYW1hZ2UnKTtcclxuXHJcbiAgICAgICAgaWYgKE9iamVjdC5zaXplKHRoaXMucGFyZW50LlNFTEVDVEVEX1NIQVJEUykgPiAwKSB7XHJcbiAgICAgICAgICAgIGJsZEJhc2VIZWFsdGhCdG4uZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgYmxkQXJtb3JCdG4uZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgYmxkU3BlZWRCdG4uZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgYmxkRG1nQnRuLmRpc2FibGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIG1ha2VCb3RzQnRuLmRpc2FibGVkID0gZmFsc2U7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgYmxkQmFzZUhlYWx0aEJ0bi5kaXNhYmxlZCA9IFwiZGlzYWJsZWRcIjtcclxuICAgICAgICAgICAgYmxkQXJtb3JCdG4uZGlzYWJsZWQgPSBcImRpc2FibGVkXCI7XHJcbiAgICAgICAgICAgIGJsZFNwZWVkQnRuLmRpc2FibGVkID0gXCJkaXNhYmxlZFwiO1xyXG4gICAgICAgICAgICBibGREbWdCdG4uZGlzYWJsZWQgPSBcImRpc2FibGVkXCI7XHJcbiAgICAgICAgICAgIG1ha2VCb3RzQnRuLmRpc2FibGVkID0gXCJkaXNhYmxlZFwiO1xyXG4gICAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKTtcclxuICAgIGNoZWNrU2VsZWN0aW9uKCk7XHJcbiAgICB0aGlzLmxpc3QuaW5uZXJIVE1MID0gXCJcIjtcclxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgaG9tZS5zaGFyZHMubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICB2YXIgZW50cnkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xyXG4gICAgICAgIHZhciBzaGFyZCA9IHRoaXMuY2xpZW50LlNIQVJEX0xJU1RbaG9tZS5zaGFyZHNbal1dO1xyXG4gICAgICAgIGVudHJ5LmlkID0gc2hhcmQuaWQ7XHJcblxyXG4gICAgICAgIGVudHJ5LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmICghZW50cnkuY2xpY2tlZCkge1xyXG4gICAgICAgICAgICAgICAgZW50cnkuY2xpY2tlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBlbnRyeS5zdHlsZS5iYWNrZ3JvdW5kID0gXCIjZmZmYjIyXCI7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnBhcmVudC5TRUxFQ1RFRF9TSEFSRFNbZW50cnkuaWRdID0gZW50cnkuaWQ7XHJcbiAgICAgICAgICAgICAgICBjaGVja1NlbGVjdGlvbigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZW50cnkuY2xpY2tlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgZW50cnkuc3R5bGUuYmFja2dyb3VuZCA9IFwiIzU0MmZjZVwiO1xyXG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMucGFyZW50LlNFTEVDVEVEX1NIQVJEU1tlbnRyeS5pZF07XHJcbiAgICAgICAgICAgICAgICBjaGVja1NlbGVjdGlvbigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcblxyXG4gICAgICAgIGVudHJ5LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHNoYXJkLm5hbWUpKTtcclxuICAgICAgICB0aGlzLmxpc3QuYXBwZW5kQ2hpbGQoZW50cnkpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTGlzdFVJO1xyXG5cclxuT2JqZWN0LnNpemUgPSBmdW5jdGlvbihvYmopIHtcclxuICAgIHZhciBzaXplID0gMCwga2V5O1xyXG4gICAgZm9yIChrZXkgaW4gb2JqKSB7XHJcbiAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSBzaXplKys7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gc2l6ZTtcclxufTsiLCJ2YXIgTGlzdFVJID0gcmVxdWlyZSgnLi9MaXN0VUknKTtcclxuXHJcbmZ1bmN0aW9uIFVwZ3JhZGVzUGFnZShob21lVUkpIHtcclxuICAgIHRoaXMudGVtcGxhdGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInVwZ3JhZGVzX3BhZ2VcIik7XHJcbiAgICB0aGlzLnVuaXRVcGdyYWRlcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidW5pdF91cGdyYWRlc1wiKTtcclxuICAgIHRoaXMuYmxkQmFzZUhlYWx0aEJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdibGRfaG9tZV9idG4nKTtcclxuICAgIHRoaXMuYmxkQXJtb3JCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmxkX2FybW9yJyk7XHJcbiAgICB0aGlzLmJsZFNwZWVkQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JsZF9zcGVlZCcpO1xyXG4gICAgdGhpcy5ibGREbWdCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmxkX2RhbWFnZScpO1xyXG5cclxuICAgIHRoaXMuU0VMRUNURURfU0hBUkRTID0ge307XHJcblxyXG4gICAgdGhpcy5zaGFyZHNVSSA9IG5ldyBMaXN0VUkoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ1cGdyYWRlc19zaGFyZHNfbGlzdFwiKSxob21lVUksIHRoaXMpO1xyXG4gICAgdGhpcy5ob21lVUkgPSBob21lVUk7XHJcblxyXG4gICAgdGhpcy5zaGFyZHNVSS5hZGRTaGFyZHMoKTtcclxufVxyXG5cclxuVXBncmFkZXNQYWdlLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy50ZW1wbGF0ZS5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xyXG4gICAgdGhpcy5ibGRCYXNlSGVhbHRoQnRuLnVwZ1R5cGUgPSBcImhvbWVIZWFsdGhcIjtcclxuICAgIHRoaXMuYmxkQXJtb3JCdG4udXBnVHlwZSA9IFwiYXJtb3JcIjtcclxuICAgIHRoaXMuYmxkU3BlZWRCdG4udXBnVHlwZSA9IFwic3BlZWRcIjtcclxuICAgIHRoaXMuYmxkRG1nQnRuLnVwZ1R5cGUgPSBcImRtZ1wiO1xyXG5cclxuICAgIHZhciBibGRIb21lID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoJ2J1aWxkSG9tZScsIHtcclxuICAgICAgICAgICAgaG9tZTogdGhpcy5ob21lVUkuaG9tZS5pZCxcclxuICAgICAgICAgICAgc2hhcmRzOiB0aGlzLlNFTEVDVEVEX1NIQVJEU1xyXG4gICAgICAgIH0pXHJcbiAgICB9LmJpbmQodGhpcyk7XHJcbiAgICB2YXIgdXBnVW5pdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLnNvY2tldC5lbWl0KCd1cGdyYWRlVW5pdCcsIHtcclxuICAgICAgICAgICAgaG9tZTogdGhpcy5ob21lVUkuaG9tZS5pZCxcclxuICAgICAgICAgICAgdHlwZTogdGhpcy51cGdUeXBlLFxyXG4gICAgICAgICAgICBzaGFyZHM6IFNFTEVDVEVEX1NIQVJEU1xyXG4gICAgICAgIH0pO1xyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG5cclxuXHJcbiAgICB0aGlzLmJsZEJhc2VIZWFsdGhCdG4gPSB0aGlzLmhvbWVVSS5yZXNldEJ1dHRvbih0aGlzLmJsZEJhc2VIZWFsdGhCdG4sIGJsZEhvbWUpO1xyXG5cclxuICAgIGlmICh0aGlzLmhvbWVVSS5ob21lLnR5cGUgPT09IFwiQmFycmFja3NcIikge1xyXG4gICAgICAgIHRoaXMudW5pdFVwZ3JhZGVzLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcbiAgICAgICAgdGhpcy5ibGRBcm1vckJ0biA9IHRoaXMuaG9tZVVJLnJlc2V0QnV0dG9uKHRoaXMuYmxkQXJtb3JCdG4sIHVwZ1VuaXQpO1xyXG4gICAgICAgIHRoaXMuYmxkU3BlZWRCdG4gPSB0aGlzLmhvbWVVSS5yZXNldEJ1dHRvbih0aGlzLmJsZFNwZWVkQnRuLCB1cGdVbml0KTtcclxuICAgICAgICB0aGlzLmJsZERtZ0J0biA9IHRoaXMuaG9tZVVJLnJlc2V0QnV0dG9uKHRoaXMuYmxkRG1nQnRuLCB1cGdVbml0KTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIHRoaXMudW5pdFVwZ3JhZGVzLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5VcGdyYWRlc1BhZ2UucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy50ZW1wbGF0ZS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcbn07XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBVcGdyYWRlc1BhZ2U7Il19
