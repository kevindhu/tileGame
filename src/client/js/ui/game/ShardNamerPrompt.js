function GameMsgPrompt(parent) {
    this.template = document.getElementById('shard_namer_container');
    this.shardNamerPrompt = document.getElementById('shard_namer_prompt');
    this.parent = parent;

    this.shardNamerPrompt.addEventListener("click", function () {
        this.parent.parent.shardNamerUI.open();
    }.bind(this));
}

GameMsgPrompt.prototype.open = function (message) {
    this.template.style.display = "block";
};

GameMsgPrompt.prototype.close = function () {
    this.template.style.display = "none";
};

module.exports = GameMsgPrompt;
