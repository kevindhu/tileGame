const entityConfig = require('./entityConfig');
var EntityFunctions = require('./EntityFunctions');
var lerp = require('lerp');

function Laser(owner, target, gameServer) {
    this.gameServer = gameServer;
    this.packetHandler = gameServer.packetHandler;

    this.id = Math.random();
    this.owner = owner.id;
    this.target = target.id;

    this.faction = owner.faction;

    this.supply = 30;

    this.init();
}


Laser.prototype.init = function () {
    this.gameServer.LASER_LIST[this.id] = this;
    //TODO: add x,y for lasers lol
    this.chunk = EntityFunctions.findChunk(gameServer, this);
    this.gameServer.CHUNKS[this.chunk].LASER_LIST[this.id] = this;
    this.packetHandler.addLaserPackets(this);
};

Laser.prototype.update = function () {
    var target = this.gameServer.CONTROLLER_LIST[this.target];
    var owner = this.gameServer.CONTROLLER_LIST[this.owner];
    if (!target || !owner || this.outofRange(owner, target)) {
        this.onDelete();
        return;
    }
    target.decreaseHealth(0.1);
    this.useSupply();
    this.checkStatus();
};


Laser.prototype.outofRange = function (owner, target) {
    return (target.x - owner.x) * (target.x - owner.x) +
        (target.y - owner.y) * (target.y - owner.y) > 40000;
};


Laser.prototype.useSupply = function () {
    this.supply -= 1;
};


Laser.prototype.checkStatus = function () {
    if (this.supply <= 0) {
        this.onDelete();
    }
};


Laser.prototype.onDelete = function () {
    delete this.gameServer.LASER_LIST[this.id];
    delete this.gameServer.CHUNKS[this.chunk].LASER_LIST[this.id];
    this.packetHandler.deleteLaserPackets(this);
};



module.exports = Laser;