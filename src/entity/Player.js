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

    var randomName = randomWord();
    this.name = randomName;
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

module.exports = Player;
