document.documentElement.style.overflow = 'hidden';  // firefox, chrome
document.body.scroll = "no";
var PlayerNamerUI = require('./PlayerNamerUI');
var ShardNamerUI = require('./ShardNamerUI');
var GameUI = require('./game/GameUI');
var HomeUI = require("./home/HomeUI");

function MainUI(client, socket) {
    this.client = client;
    this.socket = socket;



    this.playerNamerUI = new PlayerNamerUI(this.client, this.socket);
    this.gameUI = new GameUI(this.client, this.socket);
    this.shardNamerUI = new ShardNamerUI(this.client, this.socket);
    this.homeUI = new HomeUI(this.client, this.socket);
}

MainUI.prototype.open = function (info) {
    var action = info.action;
    var home;

    if (action === "name shard") {
        this.shardNamerUI.open();
    }
    if (action === "home info") {
        home = this.client.HOME_LIST[info.homeId];
        this.homeUI.open(home);
    }
};


MainUI.prototype.close = function (action) {
    if (action === "name shard") {
        this.shardNamerUI.close();
    }
    if (action === "home info") {
        this.LIST_SCROLL = false;
        this.homeUI.close();
        this.socket.emit("removeViewer", {});
    }
};


MainUI.prototype.updateLeaderBoard = function () {
    var leaderboard = document.getElementById("leaderboard");
    var FACTION_ARRAY = this.client.FACTION_ARRAY;


    var factionSort = function (a, b) {
        console.log(a,b);
        var factionA = this.client.FACTION_LIST[a];
        var factionB = this.client.FACTION_LIST[b];
        return factionA.size - factionB.size;
    }.bind(this);

    FACTION_ARRAY.sort(factionSort);
    leaderboard.innerHTML = "";

    for (var i = FACTION_ARRAY.length - 1; i >= 0; i--) {
        var faction = this.client.FACTION_LIST[FACTION_ARRAY[i]];

        var entry = document.createElement('li');
        entry.appendChild(document.createTextNode(faction.name + " - " + faction.size));
        leaderboard.appendChild(entry);
    }
};




/** DEPRECATED METHODS **/
MainUI.prototype.update = function (info) {
    var action = info.action;
    if (action === "update queue") {
        this.homeUI.buildPage.update();
        this.homeUI.botsPage.update();
        //this.homeUI.upgradesPage.update();
    }
};



module.exports = MainUI;