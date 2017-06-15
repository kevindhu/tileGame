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
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}


Player.prototype.updatePosition = function () {
    if (this.pressingDown) {
        if (!onBoundary(this.y+this.maxSpeed)) {
            this.y += this.maxSpeed;
        }
    }
    if (this.pressingUp) {
        if (!onBoundary(this.y-this.maxSpeed)) {
            this.y -= this.maxSpeed;
        }
    }
    if (this.pressingLeft) {
        if (!onBoundary(this.x-this.maxSpeed)) {
            this.x -= this.maxSpeed;
        }
    }
    if (this.pressingRight) {
        if (!onBoundary(this.x+this.maxSpeed)) {
            this.x += this.maxSpeed;
        }
    }
};

var onBoundary = function (coord) {
    return coord <= 0 || coord >= entityConfig.WIDTH;
};

Player.prototype.addEmptyShard = function(shard) {
    shard.owner = this;
    this.emptyShard = shard;
    shard.timer = 100;
};

Player.prototype.addShard = function(shard) {
    shard.owner = this;
    this.shards.push(shard);
};

Player.prototype.removeShard = function (shard) {
    var index = this.shards.indexOf(shard);
    this.shards.splice(index, 1);
};

module.exports = Player;
