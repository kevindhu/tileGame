const entityConfig = require('./entityConfig');

function Shard(x, y, id) {
    this.name = null;
    this.id = id;
    this.x = x;
    this.y = y;

    this.xVel = 0;
    this.yVel = 0;
    this.deltaX = 0;
    this.deltaY = 0;
    this.xSwitched = false;
    this.ySwitched = false;

    this.value = 0;
    this.owner = null;
    this.radius = entityConfig.SHARD_WIDTH;
    this.timer = 0;

    this.home = null;
    this.theta = 0;
}


Shard.prototype.rotate = function () {
    if (this.home !== null) {
        var radius = 20;
        this.x = this.home.x + radius * Math.cos(this.theta);
        this.y = this.home.y + radius * Math.sin(this.theta);
        this.theta += Math.PI / 50;
    }
};

Shard.prototype.addVelocity = function (x,y) {
    this.xVel = x;
    this.yVel = y;

    this.deltaX = x/10;
    this.deltaY = y/10;

    this.xSwitched = false;
    this.ySwitched = false;
};

Shard.prototype.decreaseVelocity = function () {
    this.xVel -= this.deltaX;
    this.yVel -= this.deltaY;
    if (this.xVel < 0.5 && this.xVel > -0.5) {
        this.xVel = 0;
        this.yVel = 0;
    }
};

Shard.prototype.updatePosition = function () {
    if (onBoundary(this.x) && !this.xSwitched) {
        this.xVel = -this.xVel;
        this.deltaX = -this.deltaX;
        this.xSwitched = true;
    }
    this.x += this.xVel;
    if (onBoundary(this.y) && !this.ySwitched) {
        this.yVel = -this.yVel;
        this.deltaY = -this.deltaY;
        this.ySwitched = true;
    }
    this.y += this.yVel;
    this.decreaseVelocity();
};


var onBoundary = function (coord) {
    return coord <= entityConfig.BORDER_WIDTH || coord >= entityConfig.WIDTH - entityConfig.BORDER_WIDTH;
};

module.exports = Shard;