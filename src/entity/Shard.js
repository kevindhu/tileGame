const entityConfig = require('./entityConfig');

function Shard(x, y, id) {
    this.name = null;
    this.id = id;
    this.x = x;
    this.y = y;
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


module.exports = Shard;