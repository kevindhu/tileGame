const entityConfig = require('./entityConfig');
const Arithmetic = require('../modules/Arithmetic');
var Home = require('./Home');


function Headquarter(faction, x, y, gameServer) {
    Headquarter.super_.call(this, faction, x, y, gameServer);
    this.timer = 0;
    this.isOpen = false;
    this.level = 2;
    this.hasColor = false;
}

EntityFunctions.inherits(Headquarter, Home);


module.exports = Headquarter;