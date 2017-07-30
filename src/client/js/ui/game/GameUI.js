function GameUI(client, socket, parent) {
    this.client = client;
    this.socket = socket;
    this.parent = parent;
}

GameUI.prototype.open = function () {
    var shardNamerPrompt = document.getElementById('shard_namer_prompt');
    shardNamerPrompt.addEventListener("click", function () {
        this.parent.shardNamerUI.open();
    }.bind(this));
};

module.exports =  GameUI;