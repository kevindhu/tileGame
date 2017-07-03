const entityConfig = require('./entityConfig');
var lerp = require('lerp');

function Laser(owner, target, gameServer) {
    this.gameServer = gameServer;
    this.packetHandler = gameServer.packetHandler;

    this.id = Math.random();
    this.owner = owner.id;
    this.target = target.id;

    this.faction = owner.faction;

    this.supply = 100;

    this.init();
}


Laser.prototype.init = function () {
    this.gameServer.LASER_LIST[this.id] = this;
    this.packetHandler.addLaserPackets(this);
};

Laser.prototype.update = function () {
    var target = this.gameServer.CONTROLLER_LIST[this.target];
    target.decreaseHealth(0.1);
    this.useSupply();
    this.checkStatus();
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
    this.packetHandler.deleteLaserPackets(this);
};



module.exports = Laser;