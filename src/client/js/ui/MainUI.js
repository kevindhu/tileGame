document.documentElement.style.overflow = 'hidden';  // firefox, chrome
document.body.scroll = "no";
var PlayerNamerUI = require('./PlayerNamerUI');
var ShardNamerUI = require('./ShardNamerUI');
var GameUI = require('./GameUI');
var HomeUI = require("./HomeUI");


function MainUI(client, socket) {
    this.client = client;
    this.socket = socket;
    this.SELECTED_SHARDS = {};
    this.LIST_SCROLL = false;

    this.playerNamerUI = new PlayerNamerUI(this.client, this.socket);
    this.gameUI = new GameUI(this.client, this.socket);
    this.shardNamerUI = new ShardNamerUI(this.client, this.socket);
    this.homeUI = new HomeUI(this.client, this.socket);
}

MainUI.prototype.openUI = function (info) {
    var action = info.action;
    var home;

    if (action === "name shard") {
        this.shardNamerUI.open();
    }
    if (action === "home info") {
        home = HOME_LIST[info.homeId];
        this.homeUI.open();
    }
};


MainUI.prototype.closeUI = function (action) {
    var shardNamer = document.getElementById('shard_namer_ui');
    var homeInfo = document.getElementById('home_ui');

    if (action === "name shard") {
        shardNamer.close();
    }
    if (action === "home info") {
        LIST_SCROLL = false;
        homeInfo.style.display = 'none';
        socket.emit("removeViewer", {});
    }
};


MainUI.prototype.updateLeaderBoard = function () {
    var leaderboard = document.getElementById("leaderboard");
    leaderboard.innerHTML = "";
    for (var i = FACTION_ARRAY.length - 1; i >= 0; i--) {
        var faction = FACTION_ARRAY[i];

        var entry = document.createElement('li');
        entry.appendChild(document.createTextNode(faction.name));
        leaderboard.appendChild(entry);
    }
};




/** DEPRECATED METHODS **/
MainUI.prototype.updateUI = function (info) {
    var action = info.action;
    var home;
    if (action === "update queue") {
        var buildQueue = document.getElementById('build_queue');
        home = HOME_LIST[info.homeId];
        addQueueInfo(buildQueue, home);
    }
};

function addQueueInfo(list, home) {
    list.innerHTML = "";
    if (!home.queue) {
        return;
    }
    for (var i = 0; i < home.queue.length; i++) {
        var buildInfo = home.queue[i];
        var entry = document.createElement('li');
        entry.id = Math.random();

        (function (_id) {
            entry.addEventListener("click", function () {
                if (!this.clicked) {
                    this.clicked = true;
                    this.style.background = "#fffb22";
                }
                else {
                    this.clicked = false;
                    this.style.background = "#542fce";
                }
            });
        })(entry.id);

        entry.appendChild(document.createTextNode(
            buildInfo.shardName + " -- " + Math.floor(buildInfo.timer / 1000) +
            ":" + Math.floor(buildInfo.timer % 1000)));
        list.appendChild(entry);
    }
}


module.exports = MainUI;