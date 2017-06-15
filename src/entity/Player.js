const randomWord = require('random-word');
const entityConfig = require('./entityConfig');

function Player(id) {
    this.id = id;
    this.x = entityConfig.WIDTH / 2;
    this.y = entityConfig.WIDTH / 2;
    this.maxSpeed = 10;
    this.pressingUp = false;
    this.pressingDown = false;
    this.pressingLeft = false;
    this.pressingRight = false;
    this.pressingSpace = false;

    var randomColor = getRandomColor();
    this.color = randomColor;

    var randomName = randomWord();
    this.name = randomName;

    this.emptyShard = null;
    this.shards = [];
    this.headquarter = null;
}


function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}


Player.prototype.updatePosition = function () {
    if (this.pressingDown) {
        if (!onBoundary(this.y + this.maxSpeed)) {
            this.y += this.maxSpeed;
        }
    }
    if (this.pressingUp) {
        if (!onBoundary(this.y - this.maxSpeed)) {
            this.y -= this.maxSpeed;
        }
    }
    if (this.pressingLeft) {
        if (!onBoundary(this.x - this.maxSpeed)) {
            this.x -= this.maxSpeed;
        }
    }
    if (this.pressingRight) {
        if (!onBoundary(this.x + this.maxSpeed)) {
            this.x += this.maxSpeed;
        }
    }
};

var onBoundary = function (coord) {
    return coord <= 0 || coord >= entityConfig.WIDTH;
};


Player.prototype.addShard = function (shard) {
    if (shard.name === null) {
        this.emptyShard = shard;
    }
    else {
        this.shards.push(shard.id);
    }
    shard.timer = 100;
    shard.owner = this;
};

Player.prototype.removeShard = function (shard) {
    if (shard === this.emptyShard) {
        this.emptyShard = null;
    }
    else {
        var index = this.shards.indexOf(shard.id);
        this.shards.splice(index, 1);
    }
    shard.owner = null;
    shard.timer = 0;
};

Player.prototype.transformEmptyShard = function (name) {
    if (this.emptyShard !== null) {
        this.emptyShard.name = name;
        this.addShard(this.emptyShard);
        this.emptyShard = null;
    }
};

module.exports = Player;
