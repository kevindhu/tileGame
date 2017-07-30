const entityConfig = require('../entityConfig');
const Arithmetic = require('../../modules/Arithmetic');
var EntityFunctions = require('../EntityFunctions');
var Bot = require('./Bot');


function BoosterBot(player, barracks, faction, gameServer) {
    BoosterBot.super_.call(this, "BOOSTAHBOT", player, barracks, faction, gameServer);
    this.maxSpeed = 20;
    this.boosted = false;
    this.boostTimer = 0;
}

EntityFunctions.inherits(BoosterBot, Bot);


BoosterBot.prototype.update = function () {
    if (this.boosted) {
        this.boostTimer -= 1;
        if (this.boostTimer <= 0) {
            this.removeBoost();
        }
    }
    BoosterBot.super_.prototype.update.apply(this);
};

BoosterBot.prototype.onDeath = function () {
    var owner = this.gameServer.CONTROLLER_LIST[this.owner];
    owner.removeStealthBot(this);
    this.onDelete();
};

BoosterBot.prototype.shootShard = function (player) {
    //do nothing
};

BoosterBot.prototype.addBoost = function () {
    if (this.boosted) {
        return;
    }
    this.boostTimer = 100;
    this.boosted = true;

    var owner = this.gameServer.CONTROLLER_LIST[this.owner];
    var bot;

    owner.addSpeedBoost();
    owner.updateMaxSpeed();

    for (var i = 0; i<owner.bots.length; i++) {
        bot = this.gameServer.CONTROLLER_LIST[owner.bots[i]];
        bot.addSpeedBoost();
    }
};

BoosterBot.prototype.removeBoost = function () {
    this.boosted = false;

    var owner = this.gameServer.CONTROLLER_LIST[this.owner];
    var bot;

    owner.removeSpeedBoost();
    owner.updateMaxSpeed();

    for (var i = 0; i<owner.bots.length; i++) {
        bot = this.gameServer.CONTROLLER_LIST[owner.bots[i]];
        bot.removeSpeedBoost();
    }
};

module.exports = BoosterBot;
