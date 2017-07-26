function ListUI(list, homeUI, parent) {
    this.list = list;
    this.homeUI = homeUI;
    this.client = homeUI.client;
    this.parent = parent;

    this.list.addEventListener('scroll', function (event) {
        this.homeUI.LIST_SCROLL = true;
    }.bind(this));
}

ListUI.prototype.addQueue = function () {
    var home = this.homeUI.home;
    this.list.innerHTML = "";
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
        this.list.appendChild(entry);
    }
};

ListUI.prototype.addBots = function () {
    var home = this.homeUI.home;
    this.list.innerHTML = "";
    if (!home.queue) {
        return;
    }
    for (var i = 0; i < home.bots.length; i++) {
        var botInfo = home.bots[i];
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
            botInfo.name + " -- " + "Level:" + botInfo.level));
        this.list.appendChild(entry);
    }
};

ListUI.prototype.addShards = function () {
    var home = this.homeUI.home;
    var SELECTED_SHARDS = this.parent.SELECTED_SHARDS;
    var checkSelection = function () {
        var bldBaseHealthBtn = document.getElementById('bld_home_btn');
        var makeBotsBtn = document.getElementById('make_bots_btn');
        var bldArmorBtn = document.getElementById('bld_armor');
        var bldSpeedBtn = document.getElementById('bld_speed');
        var bldDmgBtn = document.getElementById('bld_damage');

        if (Object.size(SELECTED_SHARDS) > 0) {
            bldBaseHealthBtn.disabled = false;
            bldArmorBtn.disabled = false;
            bldSpeedBtn.disabled = false;
            bldDmgBtn.disabled = false;
            makeBotsBtn.disabled = false;
        } else {
            bldBaseHealthBtn.disabled = "disabled";
            bldArmorBtn.disabled = "disabled";
            bldSpeedBtn.disabled = "disabled";
            bldDmgBtn.disabled = "disabled";
            makeBotsBtn.disabled = "disabled";
        }
    }.bind(this);
    checkSelection();
    this.list.innerHTML = "";
    for (var j = 0; j < home.shards.length; j++) {
        var entry = document.createElement('li');
        var shard = this.client.SHARD_LIST[home.shards[j]];
        entry.id = shard.id;

        (function (_id) {
            entry.addEventListener("click", function () {
                if (!this.clicked) {
                    this.clicked = true;
                    this.style.background = "#fffb22";
                    SELECTED_SHARDS[_id] = _id;
                    checkSelection();
                }
                else {
                    this.clicked = false;
                    this.style.background = "#542fce";
                    delete SELECTED_SHARDS[entry.id];
                    checkSelection();
                }
            });
        })(entry.id);

        entry.appendChild(document.createTextNode(shard.name));
        this.list.appendChild(entry);
    }
};


module.exports = ListUI;

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};