const randomWord = require('random-word');
const entityConfig = require('./entityConfig');

function Player(id) {
    this.id = id;
    this.x = entityConfig.WIDTH/2;
    this.y = entityConfig.WIDTH/2;
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
        this.y += this.maxSpeed;
    }
    if (this.pressingUp) {
        this.y -= this.maxSpeed;
    }
    if (this.pressingLeft) {
        this.x -= this.maxSpeed;
    }
    if (this.pressingRight) {
        this.x += this.maxSpeed;
    }
};

module.exports = Player;
