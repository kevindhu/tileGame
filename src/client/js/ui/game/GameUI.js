var GameMsgPrompt = require('./GameMsgPrompt');
var ShardNamerPrompt = require('./ShardNamerPrompt');

function GameUI(client, socket, parent) {
    this.client = client;
    this.socket = socket;
    this.parent = parent;
    this.gameMsgPrompt = new GameMsgPrompt(this);
    this.shardNamerPrompt = new ShardNamerPrompt(this);
}

GameUI.prototype.open = function () {
    this.shardNamerPrompt.open();

};

module.exports =  GameUI;