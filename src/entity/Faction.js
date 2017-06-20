const entityConfig = require('./entityConfig');
const Arithmetic = require('../modules/Arithmetic');
var Player = require("./Player");

function Faction(name) {
    this.name = name;
    this.players = []; //contains player Ids
    this.x = Arithmetic.getRandomInt(250,1000);
    this.y = Arithmetic.getRandomInt(250,1000);
    this.headquarter = null;
}

Faction.prototype.addPlayer = function (id, playerName) {
    var player = new Player(id, playerName);
    player.x = this.x;
    player.y = this.y;
    player.faction = this;
    this.players.push(player.id);
    return player;
};



module.exports = Faction;