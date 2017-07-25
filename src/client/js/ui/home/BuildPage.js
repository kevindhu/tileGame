var ListUI = require('./ListUI');


function BuildPage(homeUI) {
    this.template = document.getElementById("create_page");
    this.createBot = document.getElementById("create_bot_container");
    this.makeBotsBtn = document.getElementById('make_bots_btn');

    this.buildQueueUI = new ListUI(document.getElementById('build_queue'), homeUI);
    this.shardsUI = new ListUI(document.getElementById('build_shards_list'), homeUI);
    this.homeUI = homeUI;
}


BuildPage.prototype.open = function () {
    console.log("OPENING BUILDS PAGE");
    this.template.style.display = "block";
    var makeBots = function () {
        console.log(SELECTED_SHARDS);
        socket.emit('makeBots', {
            home: this.home.id,
            shards: SELECTED_SHARDS
        });
    };

    if (this.homeUI.home.type === "Barracks") {
        this.homeUI.resetButton(makeBotsBtn, makeBots);
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

