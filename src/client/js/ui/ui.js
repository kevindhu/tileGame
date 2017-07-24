document.documentElement.style.overflow = 'hidden';  // firefox, chrome
document.body.scroll = "no";

var HomeUI = require("./HomeUI");
var ShardNamerUI = require("./ShardNamerUI");


function MainUI(socket) {
    this.SELECTED_SHARDS = {};
    this.LIST_SCROLL = false;
}

MainUI.prototype.openUI = function (info) {
    var action = info.action;
    var home;

    if (action === "name shard") {
        openShardNamerUI();
    }
    if (action === "home info") {
        home = HOME_LIST[info.homeId];
        openHomeUI(home);
    }
};

MainUI.prototype.updateUI = function (info) {
    var action = info.action;
    var home;
    if (action === "update queue") {
        var buildQueue = document.getElementById('build_queue');
        home = HOME_LIST[info.homeId];
        addQueueInfo(buildQueue, home);
    }
};

MainUI.prototype.openPlayerNamerUI = function () {
    var leaderboard = document.getElementById("leaderboard_container");
    var nameBtn = document.getElementById("nameSubmit");
    var playerNameInput = document.getElementById("playerNameInput");
    var factionNameInput = document.getElementById("factionNameInput");
    var playerNamer = document.getElementById("player_namer");

    playerNameInput.addEventListener("keyup", function (event) {
        event.preventDefault();
        if (event.keyCode === 13) {
            factionNameInput.focus();
        }
        drawLeaderBoard();
    });

    factionNameInput.addEventListener("keyup", function (event) {
        event.preventDefault();
        if (event.keyCode === 13) {
            nameBtn.click();
        }
    });

    nameBtn.addEventListener("click", function () {
        mainCanvas.style.visibility = "visible";
        leaderboard.style.visibility = "visible";
        socket.emit("newPlayer",
            {
                name: playerNameInput.value,
                faction: factionNameInput.value
            });
        playerNamer.style.display = 'none';
    });

    playerNamer.style.visibility = "visible";
    playerNameInput.focus();
    leaderboard.style.visibility = "hidden";
};

MainUI.prototype.openGameUI = function () {
    var shardNamerPrompt = document.getElementById('shard_namer_prompt');
    shardNamerPrompt.addEventListener("click", function () {
        openShardNamerUI();
    });
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

/** GLOBAL FUNCTIONS **/
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

this.playerNamerUI.open();
this.gameUI.open();

module.exports = MainUI;