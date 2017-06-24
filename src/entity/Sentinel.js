const entityConfig = require('./entityConfig');
const Arithmetic = require('../modules/Arithmetic');
var EntityFunctions = require('./EntityFunctions');
var Home = require('./Home');



function Sentinel(faction, x, y, gameServer) {
    Sentinel.super_.call(this, faction, x, y, gameServer);
    this.type = "Sentinel";
    this.hasColor = false;
    this.radius = 10;
    this.health = 1;
    this.mainInit();
}

EntityFunctions.inherits(Sentinel, Home);



module.exports = Sentinel;
