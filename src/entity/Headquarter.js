const entityConfig = require('./entityConfig');
const Arithmetic = require('../modules/Arithmetic');
var Home = require('./Home');
var EntityFunctions = require('./EntityFunctions');


function Headquarter(faction, x, y, gameServer) {
    Headquarter.super_.call(this, faction, x, y, gameServer);
    this.timer = 0;
    this.isOpen = false;

    this.level = 2;
    this.radius = 50;
    this.health = 80;
    this.hasColor = false;
    this.mainInit();

}

EntityFunctions.inherits(Headquarter, Home);


module.exports = Headquarter;