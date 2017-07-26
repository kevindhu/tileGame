var ListUI = require('./ListUI');


function BuildPage(homeUI) {
    this.template = document.getElementById("create_page");
    this.createBot = document.getElementById("create_bot_container");
    this.makeBotsBtn = document.getElementById('make_bots_btn');
    this.socket = homeUI.socket;

    this.SELECTED_SHARDS = {};

    this.buildQueueUI = new ListUI(document.getElementById('build_queue'), homeUI);
    this.shardsUI = new ListUI(document.getElementById('build_shards_list'), homeUI, this);
    this.homeUI = homeUI;
}


BuildPage.prototype.open = function () {
    this.template.style.display = "block";

    this.SELECTED_SHARDS = {};

    var makeBots = function () {
        this.socket.emit('makeBots', {
            home: this.home.id,
            shards: this.SELECTED_SHARDS
        });
    }.bind(this);

    if (this.homeUI.home.type === "Barracks") {
        this.homeUI.resetButton(this.makeBotsBtn, makeBots);
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


module.exports = BuildPage;

