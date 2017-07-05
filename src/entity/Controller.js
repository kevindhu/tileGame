const entityConfig = require('./entityConfig');
const Arithmetic = require('../modules/Arithmetic');
var lerp = require('lerp');

function Controller(id, faction, gameServer) {
    this.id = id;
    this.gameServer = gameServer;
    this.packetHandler = gameServer.packetHandler;

    this.faction = faction.name;

    this.radius = 50;

    this.x = faction.x;
    this.y = faction.y;
    this.health = 5;
    this.maxSpeed = 7;
    this.timer = 0;
    this.xSpeed = 0;
    this.ySpeed = 0;

    this.pressingRight = false;
    this.pressingLeft = false;
    this.pressingUp = false;
    this.pressingDown = false;
}

Controller.prototype.init = function () {
    this.addQuadItem();
    this.gameServer.CONTROLLER_LIST[this.id] = this;
    this.gameServer.packetHandler.addControllerPackets(this);
};


Controller.prototype.onDelete = function () {
    this.gameServer.controllerTree.remove(this.quadItem);
    this.gameServer.FACTION_LIST[this.faction].removeController(this);
    delete this.gameServer.CONTROLLER_LIST[this.id];
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
    this.updatePosition();
    this.updateQuadItem();
    this.checkCollisions();

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


Controller.prototype.checkCollisions = function () {
    this.gameServer.controllerTree.find(this.quadItem.bound, function (controller) {
        if (this.type === "Bot" && controller.faction !== this.faction) {
            //this.shootShard(controller);
            this.shootLaser(controller);
        }
    }.bind(this))
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
    this.quadItem.bound = {
        minx: this.x - this.radius,
        miny: this.y - this.radius,
        maxx: this.x + this.radius,
        maxy: this.y + this.radius
    };
    this.gameServer.controllerTree.remove(this.quadItem);
    this.gameServer.controllerTree.insert(this.quadItem);
};

Controller.prototype.decreaseHealth = function (amount) {
    this.health -=amount;
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
        if (!onBoundary(this.y + this.maxSpeed)) {
            this.ySpeed = lerp(this.ySpeed, this.maxSpeed, 0.3);
        }
        else {
            this.ySpeed = 0;
        }
    }
    if (this.pressingUp) {
        if (!onBoundary(this.y - this.maxSpeed)) {
            this.ySpeed = lerp(this.ySpeed, -this.maxSpeed, 0.3);
        }
        else {
            this.ySpeed = 0;
        }
    }
    if (this.pressingLeft) {
        if (!onBoundary(this.x - this.maxSpeed)) {
            this.xSpeed = lerp(this.xSpeed, -this.maxSpeed, 0.3);
        }
        else {
            this.xSpeed = 0;
        }
    }
    if (this.pressingRight) {
        if (!onBoundary(this.x + this.maxSpeed)) {
            this.xSpeed = lerp(this.xSpeed, this.maxSpeed, 0.3);
        }
        else {
            this.xSpeed = 0;
        }
    }


    if (!this.pressingRight && !this.pressingLeft) {
        this.xSpeed = lerp(this.xSpeed,0,0.3);
    }
    if (!this.pressingUp && !this.pressingDown) {
        this.ySpeed = lerp(this.ySpeed,0,0.3);
    }
    this.y += this.ySpeed;
    this.x += this.xSpeed;


    var checkStuck = function (coord) {
        var newCoord;
        if (overBoundary(coord)) {
            if (coord < entityConfig.WIDTH/2) {
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

    this.x = checkStuck(this.x);
    this.y = checkStuck(this.y);
};


function onBoundary (coord) {
    return coord <= entityConfig.BORDER_WIDTH ||
        coord >= entityConfig.WIDTH - entityConfig.BORDER_WIDTH;
}

function overBoundary (coord) {
    return coord < entityConfig.BORDER_WIDTH - 1 ||
        coord > entityConfig.WIDTH - entityConfig.BORDER_WIDTH + 1;
}

module.exports = Controller;
