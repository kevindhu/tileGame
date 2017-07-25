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