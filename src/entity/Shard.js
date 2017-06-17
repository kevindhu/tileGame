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

    this.value = 0;
    this.owner = null;
    this.radius = entityConfig.SHARD_WIDTH;
    this.timer = 0;

    this.HQ = null;
    this.theta = 0;
}


Shard.prototype.rotate = function () {
    if (this.HQ !== null) {
        var radius = 20;
        this.x = this.HQ.x + radius * Math.cos(this.theta);
        this.y = this.HQ.y + radius * Math.sin(this.theta);
        this.theta += Math.PI / 50;
    }
};

Shard.prototype.addVelocity = function (x,y) {
    this.xVel = x;
    this.yVel = y;

    this.deltaX = x/5;
    this.deltaY = y/5;

    console.log(this.xVel);
    console.log(this.deltaX);
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
    this.x += this.xVel;
    this.y += this.yVel;
    this.decreaseVelocity();
};


module.exports = Shard;