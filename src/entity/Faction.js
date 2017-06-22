const entityConfig = require('./entityConfig');
const Arithmetic = require('../modules/Arithmetic');
var Player = require("./Player");

function Faction(name, coords) {
    this.name = name;
    this.players = []; //contains player Ids
    this.x = coords.x;
    this.y = coords.y;
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