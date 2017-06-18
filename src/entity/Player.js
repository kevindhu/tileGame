const randomWord = require('random-word');
const entityConfig = require('./entityConfig');
const Arithmetic = require('../modules/Arithmetic');
var lerp = require('lerp');

function Player(id) {
    this.id = id;
    this.x = entityConfig.WIDTH / 2;
    this.y = entityConfig.WIDTH / 2;

    this.pressingUp = false;
    this.pressingDown = false;
    this.pressingLeft = false;
    this.pressingRight = false;
    this.pressingSpace = false;
    this.pressingA = false;
    this.color = getRandomColor();
    this.name = randomWord();
    this.maxSpeed = 10;
    this.xSpeed = 0;
    this.ySpeed = 0;
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

};

var onBoundary = function (coord) {
    return coord <= entityConfig.BORDER_WIDTH || coord >= entityConfig.WIDTH - entityConfig.BORDER_WIDTH;
};


Player.prototype.getRandomShard = function () {
    var randomIndex = Arithmetic.getRandomInt(0,this.shards.length-1);
    return this.shards[randomIndex];
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
