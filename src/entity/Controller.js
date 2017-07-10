const entityConfig = require('./entityConfig');
var EntityFunctions = require('./EntityFunctions');
const Arithmetic = require('../modules/Arithmetic');

var lerp = require('lerp');

function Controller(id, faction, gameServer) {
    this.id = id;
    this.gameServer = gameServer;
    this.packetHandler = gameServer.packetHandler;

    this.faction = faction.name;
    this.radius = 50;

    this.stationary = true;
    this.x = faction.x;
    this.y = faction.y;
    this.health = 5;
    this.maxXSpeed = 10;
    this.maxYSpeed = 10;
    this.timer = 0;
    this.xSpeed = 0;
    this.ySpeed = 0;
    this.theta = 0;
    this.selected = false;

    this.pressingRight = false;
    this.pressingLeft = false;
    this.pressingUp = false;
    this.pressingDown = false;
}

Controller.prototype.init = function () {
    this.addQuadItem();
    this.gameServer.CONTROLLER_LIST[this.id] = this;
    this.chunk = EntityFunctions.findChunk(this.gameServer, this);
    this.gameServer.CHUNKS[this.chunk].CONTROLLER_LIST[this.id] = this;
    this.gameServer.packetHandler.addControllerPackets(this);
};


Controller.prototype.onDelete = function () {
    this.gameServer.controllerTree.remove(this.quadItem);
    this.gameServer.FACTION_LIST[this.faction].removeController(this);

    delete this.gameServer.CONTROLLER_LIST[this.id];
    delete this.gameServer.CHUNKS[this.chunk].CONTROLLER_LIST[this.id];
    this.packetHandler.deleteControllerPackets(this);
};


Controller.prototype.update = function () {
    var tile = this.gameServer.getEntityTile(this);
    if (this.timer > 0) {
        this.timer -= 1;
    }
    if (this.laserTimer && this.laserTimer > 0) {
        this.laserTimer -= 1;
    }
    this.checkCollisions();
    this.updatePosition();
    this.updateQuadItem();
    this.updateChunk();

    if (tile) {
        if (tile.faction === this.faction) {
            this.increaseHealth(0.1);
        }
        else if (tile.faction !== null) {
            var home = this.gameServer.HOME_LIST[tile.home];
            home.shootShard(this);
            this.decreaseHealth(0.1);
        }
    }

    this.packetHandler.updateControllersPackets(this);
};


Controller.prototype.updateChunk = function () {
    var newChunk = EntityFunctions.findChunk(this.gameServer, this);
    if (newChunk !== this.chunk) {
        console.log("NEW CHUNK!");
        delete this.gameServer.CHUNKS[this.chunk].CONTROLLER_LIST[this.id];
        this.chunk = newChunk;
        this.gameServer.CHUNKS[this.chunk].CONTROLLER_LIST[this.id] = this;
    }
};

Controller.prototype.checkCollisions = function () {
    if (this.type === "Bot") {
        this.gameServer.controllerTree.find(this.quadItem.bound, function (controller) {
            if (controller.faction !== this.faction) {
                this.shootShard(controller);
                //this.shootLaser(controller);
            }
            else if (controller.faction && controller.id !== this.id && this.xSpeed < 5 && this.ySpeed < 5) {
                this.ricochet(controller);
            }

        }.bind(this))
    }
};


Controller.prototype.ricochet = function (controller) {
    var xAdd = Math.abs(controller.x - this.x) / 20;
    var yAdd = Math.abs(controller.y - this.y) / 20;

    if (xAdd < 0) {
        xAdd = 4;
    }
    if (yAdd < 0) {
        yAdd = 4;
    }


    var xImpulse = (4 - xAdd)/10;
    var yImpulse = (4 - yAdd)/10;

    if (controller.x > this.x) {
        this.xSpeed -= xImpulse;
    }
    else {
        this.xSpeed += xImpulse;
    }

    if (controller.y > this.y) {
        this.ySpeed -= yImpulse;
    }
    else {
        this.ySpeed += yImpulse;
    }
};

Controller.prototype.shootLaser = function () {
};


Controller.prototype.addQuadItem = function () {
    this.quadItem = {
        cell: this,
        bound: {
            minx: this.x - this.radius,
            miny: this.y - this.radius,
            maxx: this.x + this.radius,
            maxy: this.y + this.radius
        }
    };
    this.gameServer.controllerTree.insert(this.quadItem);
};


Controller.prototype.updateQuadItem = function () {
    if (!this.stationary) { //also maybe add a timer so it doesn't update every frame
        this.quadItem.bound = {
            minx: this.x - this.radius,
            miny: this.y - this.radius,
            maxx: this.x + this.radius,
            maxy: this.y + this.radius
        };
        this.gameServer.controllerTree.remove(this.quadItem);
        this.gameServer.controllerTree.insert(this.quadItem);
    }
};

Controller.prototype.decreaseHealth = function (amount) {
    this.health -= amount;
    if (this.health <= 0) {
        this.onDeath();
    }
};

Controller.prototype.increaseHealth = function (amount) {
    if (this.health <= 10) {
        this.health += amount;
    }
};

Controller.prototype.updatePosition = function () {
    if (this.pressingDown) {
        this.ySpeed = lerp(this.ySpeed, this.maxYSpeed, 0.3);
    }
    if (this.pressingUp) {
        this.ySpeed = lerp(this.ySpeed, -this.maxYSpeed, 0.3);
    }
    if (this.pressingLeft) {
        this.xSpeed = lerp(this.xSpeed, -this.maxXSpeed, 0.3);
    }
    if (this.pressingRight) {
        this.xSpeed = lerp(this.xSpeed, this.maxXSpeed, 0.3);
    }
    if (!this.pressingRight && !this.pressingLeft) {
        this.xSpeed = lerp(this.xSpeed, 0, 0.3);
    }
    if (!this.pressingUp && !this.pressingDown) {
        this.ySpeed = lerp(this.ySpeed, 0, 0.3);
    }
    if (onBoundary(this.x + this.xSpeed)) {
        this.xSpeed = 0;
    }
    if (onBoundary(this.y + this.ySpeed)) {
        this.ySpeed = 0;
    }
    this.checkStationary();
    this.checkStuck();
    this.y += this.ySpeed;
    this.x += this.xSpeed;
};

Controller.prototype.checkStationary = function () {
    if (Math.abs(this.ySpeed) <= 0.3 && Math.abs(this.xSpeed) <= 0.3) {
        this.ySpeed = 0;
        this.xSpeed = 0;
        this.stationary = true;
    }
    else {
        this.stationary = false;
    }
};

Controller.prototype.checkStuck = function () {
    var resolveStuck = function (coord) {
        var newCoord;
        if (overBoundary(coord)) {
            if (coord < entityConfig.WIDTH / 2) {
                newCoord = entityConfig.BORDER_WIDTH + 100;
                return newCoord;
            }
            else {
                newCoord = entityConfig.WIDTH - entityConfig.BORDER_WIDTH - 100;
                return newCoord;
            }
        }
        return coord;
    };

    this.x = resolveStuck(this.x);
    this.y = resolveStuck(this.y);
};


function onBoundary(coord) {
    return coord <= entityConfig.BORDER_WIDTH ||
        coord >= entityConfig.WIDTH - entityConfig.BORDER_WIDTH;
}

function overBoundary(coord) {
    return coord < entityConfig.BORDER_WIDTH - 1 ||
        coord > entityConfig.WIDTH - entityConfig.BORDER_WIDTH + 1;
}

module.exports = Controller;
