var ListUI = require('./ListUI');


function BuildPage(homeUI) {
    this.template = document.getElementById("create_page");
    this.createBot = document.getElementById("create_bot_container");
    this.makeSoldierBotsBtn = document.getElementById('make_soldier_bots_btn');
    this.makeBoosterBotsBtn = document.getElementById('make_booster_bots_btn');
    this.makeStealthBotsBtn = document.getElementById('make_stealth_bots_btn');
    this.socket = homeUI.socket;

    this.SELECTED_SHARDS = {};
    this.buildQueueUI = new ListUI(document.getElementById('build_queue'), homeUI);
    this.shardsUI = new ListUI(document.getElementById('build_shards_list'), homeUI, this);
    this.homeUI = homeUI;
}


BuildPage.prototype.checkSelection = function (input) {
    var makeSoldierBotsBtn = document.getElementById('make_soldier_bots_btn');
    var makeBoosterBotsBtn = document.getElementById('make_booster_bots_btn');
    var makeStealthBotsBtn = document.getElementById('make_stealth_bots_btn');

    if (input > 0) {
        makeSoldierBotsBtn.disabled = false;
        makeBoosterBotsBtn.disabled = false;
        makeStealthBotsBtn.disabled = false;
    } else {
        makeSoldierBotsBtn.disabled = "disabled";
        makeBoosterBotsBtn.disabled = "disabled";
        makeStealthBotsBtn.disabled = "disabled";
    }
};

BuildPage.prototype.open = function () {
    this.template.style.display = "block";
    this.SELECTED_SHARDS = {};

    var makeSoldierBots = function () {
        this.socket.emit('makeBots', {
            botType: "soldier",
            home: this.homeUI.home.id,
            shards: this.SELECTED_SHARDS
        });
    }.bind(this);
    var makeBoosterBots = function () {
        this.socket.emit('makeBots', {
            botType: "booster",
            home: this.homeUI.home.id,
            shards: this.SELECTED_SHARDS
        })
    }.bind(this);
    var makeStealthBots = function () {
        this.socket.emit('makeBots', {
            botType: "stealth",
            home: this.homeUI.home.id,
            shards: this.SELECTED_SHARDS
        })
    }.bind(this);

    if (this.homeUI.home.type === "Barracks") {
        this.makeSoldierBotsBtn = this.homeUI.resetButton(this.makeSoldierBotsBtn, makeSoldierBots);
        this.makeBoosterBotsBtn = this.homeUI.resetButton(this.makeBoosterBotsBtn, makeBoosterBots);
        this.makeStealthBotsBtn = this.homeUI.resetButton(this.makeStealthBotsBtn, makeStealthBots);

        this.createBot.style.display = "flex";
        this.buildQueueUI.addQueue(this.homeUI.home);
    } else {
        this.createBot.style.display = "none";
    }
    this.shardsUI.addShards();
};

BuildPage.prototype.close = function () {
    this.template.style.display = "none";
};


BuildPage.prototype.update = function () {
    this.buildQueueUI.addQueue();
};

module.exports = BuildPage;

