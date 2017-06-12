var express = require("express");
var app = express();
var server = require('http').Server(app);
var Entity = require('./entity');
var entityConfig = require('./entity/entityConfig');


/** INIT PORT CONNECTION **/
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/web/index.html');
});
app.use('/', express.static(__dirname + '/web'));
server.listen(2000); //port number for listening
console.log('Started Server!');


var SOCKET_LIST = {};
var PLAYER_LIST = {};
var TILE_ARRAY = [];

var deletePacket = [];
var addPacket = [];




/** SERVER/CLIENT INIT METHODS **/

var initTiles = function () {
    for (var i = 0; i < Math.sqrt(entityConfig.TILES); i++) {
        var row = [];
        for (var j = 0; j < Math.sqrt(entityConfig.TILES); j++) {
            row[j] = new Entity.Tile(tileLength * i, tileLength * j);
        }
        TILE_ARRAY[i] = row;
    }
};

var initPacket = function () {
    var ret = {};
    var playerInfo = [];
    var tileInfo = [];

    for (var i in PLAYER_LIST) {
        var currPlayer = PLAYER_LIST[i];
        playerInfo.push({
            id: currPlayer.id,
            name: currPlayer.name,
            x: currPlayer.x,
            y: currPlayer.y
        })
    }

    for (var j = 0; j < TILE_ARRAY.length; j++) {
        for (k = 0; k < TILE_ARRAY[j].length; k++) {
            var currTile = TILE_ARRAY[j][k];
            tileInfo.push({
                id: currTile.id,
                x: currTile.x,
                y: currTile.y,
                length: currTile.length,
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



/** UPDATE METHODS **/

var addPlayerInfo = function (player) {
    return {
        id: player.id,
        name: player.name,
        x: player.x,
        y: player.y
    };
};

var updateTiles = function () {
    //returns activated tile ids
    var tilesPacket = [];
    for (var index in PLAYER_LIST) {
        var currPlayer = PLAYER_LIST[index];
        var xIndex = Math.floor(currPlayer.x / tileLength);
        var yIndex = Math.floor(currPlayer.y / tileLength);
        tilesPacket.push({
            id: TILE_ARRAY[xIndex][yIndex].id,
            color: currPlayer.color
        });
        TILE_ARRAY[xIndex][yIndex].color = currPlayer.color;
    }
    return tilesPacket;
};

var updateCoords = function () {
    var playersPacket = [];
    for (var index in PLAYER_LIST) {
        var currPlayer = PLAYER_LIST[index];
        currPlayer.updatePosition();
        playersPacket.push({
            id: currPlayer.id,
            x: currPlayer.x,
            y: currPlayer.y
        });
    }
    return playersPacket;
};

function update() {
    for (var index in SOCKET_LIST) {
        var currSocket = SOCKET_LIST[index];
        currSocket.emit('addEntities',
            {
                'playerInfo': addPacket
            });
        currSocket.emit('deleteEntities',
            {
                'playerIds': deletePacket
            });
        currSocket.emit('updateEntities',
            {
                'players': updateCoords(),
                'tiles': updateTiles()
            }
        );
    }
    addPacket = [];
    deletePacket = [];
}


/** INIT TILES **/
var tileLength = entityConfig.WIDTH / Math.sqrt(entityConfig.TILES);
initTiles();


/** START WEBSOCKET SERVICE **/

var io = require('socket.io')(server, {});
io.sockets.on('connection', function (socket) {
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;
    console.log("Client #" + socket.id + " has joined the server");

    var player = new Entity.Player(socket.id);
    PLAYER_LIST[socket.id] = player;
    addPacket.push(addPlayerInfo(player));

    socket.emit("init", initPacket());

    socket.on('disconnect', function () {
        console.log("Client #" + socket.id + " has left the server");
        delete SOCKET_LIST[socket.id];
        delete PLAYER_LIST[socket.id];
        deletePacket.push({id: socket.id});
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

/** START MAIN LOOP **/
setInterval(update, 1000 / 25);

