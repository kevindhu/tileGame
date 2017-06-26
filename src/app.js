var ngrok = require('ngrok');
ngrok.connect(2000, function (err, url) {});


var GameServer = require("./GameServer");
var gameServer = new GameServer();
gameServer.start();
