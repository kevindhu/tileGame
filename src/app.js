var express = require("express");
var app = express();
var server = require('http').Server(app);
var Entity = require('./entity');
var entityConfig = require('./entity/entityConfig');


/** INIT SERVER **/
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/web/index.html');
});
app.use('/', express.static(__dirname + '/web'));
server.listen(2000); //port number for listening
console.log('Started Server!');


var SOCKET_LIST = {};
var PLAYER_LIST = {};
var TILE_ARRAY = [];


/** INIT TILES **/
var tileWidth = entityConfig.WIDTH / Math.sqrt(entityConfig.TILES);
for (var i = 0; i < Math.sqrt(entityConfig.TILES); i++) {
    for (var j = 0; j < Math.sqrt(entityConfig.TILES); j++) {
        tileInfo = Tile.init();
        TILE_ARRAY[i][j] = new Tile();
    }
}


/** INIT WEBSOCKETS **/
var io = require('socket.io')(server, {});
io.sockets.on('connection', function (socket) {
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;
    console.log("Client # " + socket.id + " has joined the server");

    socket.emit("init", initPackage());

    var player = new Entity.Player(socket.id);
    PLAYER_LIST[socket.id] = player;

    socket.on('disconnect', function () {
        console.log("Client #" + socket.id + " has left the server");
        delete SOCKET_LIST[socket.id];
        delete PLAYER_LIST[socket.id];
    });

    socket.on('keyEvent', function (data) {
        if (data.id === "left") {
            player.pressingLeft = data.state;
        }
        if (data.id === "right") {
            player.pressingRight = data.state;
        }
        if (data.id === "up") {
            player.pressingUp = data.state;
        }
        if (data.id === "down") {
            player.pressingDown = data.state;
        }
    });
});


var initPackage = function () {
    var ret = {};
    var playerInfo = {};
    var tileInfo = {};

    for (var i in PLAYER_LIST) {
        var currPlayer = PLAYER_LIST[i];
        playerInfo.push({
            name: currPlayer.name,
            x: currPlayer.x,
            y: currPlayer.y
        })
    }

    for (var j = 0; j < TILE_ARRAY.length; j++) {
        for (k = 0; k < TILE_ARRAY[j].length; k++) {
            var currTile = TILE_LIST[j][k];
            tileInfo.push({
                name: currTile.name,
                x: currTile.x,
                y: currTile.y,
                owner: currTile.owner,
                color: currTile.color,
                health: currTile.health
            })
        }
    }
    ret['playerInfo'] = playerInfo;
    ret['tileInfo'] = tileInfo;
    return ret;
};


/** INIT SERVER LOOP **/
setInterval(update, 1000 / 25); //25 frames per second


var getTiles = function () {
    //returns activated tile ids
    var activated = [];
    for (var index in PLAYER_LIST) {
        var currPlayer = PLAYER_LIST[index];
        var xIndex = Math.floor(currPlayer.x / tileWidth);
        var yIndex = Math.floor(currPlayer.y / tileWidth);
        activated.push({
            x: xIndex * tileWidth,
            y: yIndex * tileWidth,
            length: tileWidth
        });
    }
    return activated;
};

var getCoords = function () {
    var positions = [];
    for (var index in PLAYER_LIST) {
        var currPlayer = PLAYER_LIST[index];
        currPlayer.updatePosition();
        positions.push({
            playerName: currPlayer.name,
            x: currPlayer.x,
            y: currPlayer.y
        });
    }
    return positions;
};


function update() {
    var positions = getCoords();
    var tiles = getTiles();


    //send packets
    for (var index in SOCKET_LIST) {
        var currSocket = SOCKET_LIST[index];
        currSocket.emit('updateEntities',
            {
                'players': positions,
                'tiles': tiles
            }
        );

    }

}

