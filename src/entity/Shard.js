const entityConfig = require('./entityConfig');
var lerp = require('lerp');

function Shard(x, y, id) {
    this.name = null;
    this.id = id;
    this.x = x;
    this.y = y;

    this.xVel = 0;
    this.yVel = 0;
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
        var radius = this.home.radius;
        this.x = this.home.x + radius * Math.cos(this.theta);
        this.y = this.home.y + radius * Math.sin(this.theta);
        this.theta += Math.PI / 50;
    }
};

Shard.prototype.addVelocity = function (x,y) {
    this.xVel = x;
    this.yVel = y;

    this.xSwitched = false;
    this.ySwitched = false;
};


Shard.prototype.updatePosition = function () {
    if (this.xVel > -0.1 && this.xVel < 0.1) {
        this.xVel = 0;
        this.yVel = 0;
    }

    if (onBoundary(this.x) && !this.xSwitched) {
        this.xVel = -this.xVel;
        this.xSwitched = true;
    }
    if (onBoundary(this.y) && !this.ySwitched) {
        this.yVel = -this.yVel;
        this.ySwitched = true;
    }

    this.x += this.xVel;
    this.y += this.yVel;

    this.xVel = lerp(this.xVel,0,0.2);
    this.yVel = lerp(this.yVel,0,0.2);
};

Shard.prototype.addQuadItem = function () {
    this.quadItem = {
        cell: this,
        bound: {
            minx: this.x - this.radius,
            miny: this.y - this.radius,
            maxx: this.x + this.radius,
            maxy: this.y + this.radius
        }
    };
};

Shard.prototype.updateQuadItem = function () {
    this.quadItem.bound = {
        minx: this.x - this.radius,
        miny: this.y - this.radius,
        maxx: this.x + this.radius,
        maxy: this.y + this.radius
    }
};


var onBoundary = function (coord) {
    return coord <= entityConfig.BORDER_WIDTH || coord >= entityConfig.WIDTH - entityConfig.BORDER_WIDTH;
};

module.exports = Shard;