const entityConfig = require('../entityConfig');
const Arithmetic = require('../../modules/Arithmetic');
var EntityFunctions = require('../EntityFunctions');
var Bot = require('./Bot');


function StealthBot(player, barracks, faction, gameServer) {
    StealthBot.super_.call(this, "STEALTHBOTTTT", player, barracks, faction, gameServer);
    this.maxSpeed = 20;
    this.boosted = false;
    this.stealthTimer = 0;
    this.radius = 30;
    this.init();
}

EntityFunctions.inherits(StealthBot, Bot);


StealthBot.prototype.update = function () {
    if (this.stealthed) {
        this.stealthTimer -= 1;
        if (this.stealthTimer <= 0) {
            this.removeStealth();
        }
    }
    StealthBot.super_.prototype.update.apply(this);
};

StealthBot.prototype.onDeath = function () {
    var owner = this.gameServer.CONTROLLER_LIST[this.owner];
    owner.removeStealthBot(this);
    this.onDelete();
};

StealthBot.prototype.shootShard = function (player) {
    //do nothing
};

StealthBot.prototype.addStealth = function () {
    if (this.stealthed) {
        return;
    }
    this.stealthTimer = 100;
    this.stealthed = true;

    var owner = this.gameServer.CONTROLLER_LIST[this.owner];
    var bot;

    owner.addStealthPowerup();

    for (var i = 0; i<owner.bots.length; i++) {
        bot = this.gameServer.CONTROLLER_LIST[owner.bots[i]];
        bot.addStealthPowerup();
    }
};

StealthBot.prototype.removeStealth = function () {
    this.stealthed = false;

    var owner = this.gameServer.CONTROLLER_LIST[this.owner];
    var bot;

    owner.removeStealthPowerup();

    for (var i = 0; i<owner.bots.length; i++) {
        bot = this.gameServer.CONTROLLER_LIST[owner.bots[i]];
        bot.removeStealthPowerup();
    }
};


module.exports = StealthBot;
