var express = require("express");
var app = express();
var server = require('http').Server(app);
var Entity = require('./entity');
var QuadNode = require('./modules/QuadNode');
const entityConfig = require('./entity/entityConfig');
const Arithmetic = require('./modules/Arithmetic');


/** INIT PORT CONNECTION **/
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/web/index.html');
});
app.use('/', express.static(__dirname + '/web'));
server.listen(2000); //port number for listening
console.log('Started Server!');


var SOCKET_LIST = {};

/** ENTITIES STORAGE**/
var TILE_ARRAY = [];
var PLAYER_LIST = {};

var HQ_LIST = {};
var SHARD_LIST = {};
var MOVING_SHARD_LIST = {};


var addPlayerPacket = [];
var addShardPacket = [];
var addHQPacket = [];

var deletePlayerPacket = [];
var deleteShardPacket = [];
var deleteHQPacket = [];

var quadTree = null;

const tileLength = entityConfig.WIDTH / Math.sqrt(entityConfig.TILES);

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

var initShards = function () {
    quadTree = new QuadNode({
        minx: 0,
        miny: 0,
        maxx: entityConfig.WIDTH,
        maxy: entityConfig.WIDTH
    });

    for (var i = 0; i < entityConfig.SHARDS; i++) {
        createNewShard();
    }
};

var initPacket = function () {
    var ret = {};
    var playerPacket = [];
    var tilePacket = [];
    var shardPacket = [];
    var HQPacket = [];

    for (var i in PLAYER_LIST) {
        var currPlayer = PLAYER_LIST[i];
        playerPacket.push({
            id: currPlayer.id,
            name: currPlayer.name,
            x: currPlayer.x,
            y: currPlayer.y
        })
    }

    for (var j = 0; j < TILE_ARRAY.length; j++) {
        for (k = 0; k < TILE_ARRAY[j].length; k++) {
            var currTile = TILE_ARRAY[j][k];
            tilePacket.push({
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

    for (var k in SHARD_LIST) {
        var currShard = SHARD_LIST[k];
        shardPacket.push({
            id: currShard.id,
            x: currShard.x,
            y: currShard.y
        })
    }

    for (var l in HQ_LIST) {
        var currHQ = HQ_LIST[l];
        HQPacket.push({
            id: currHQ.id,
            owner: currHQ.owner.name,
            x: currHQ.x,
            y: currHQ.y,
            supply: currHQ.supply
        })
    }

    ret['playerPacket'] = playerPacket;
    ret['tilePacket'] = tilePacket;
    ret['shardPacket'] = shardPacket;
    ret['HQPacket'] = HQPacket;
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
var checkCollisions = function () {
    for (var index in PLAYER_LIST) {
        var currPlayer = PLAYER_LIST[index];
        var playerBound = {
            minx: currPlayer.x - entityConfig.SHARD_WIDTH,
            miny: currPlayer.y - entityConfig.SHARD_WIDTH,
            maxx: currPlayer.x + entityConfig.SHARD_WIDTH,
            maxy: currPlayer.y + entityConfig.SHARD_WIDTH
        };

        quadTree.find(playerBound, function (shard) {
            if (currPlayer !== shard.owner && shard.timer === 0) {
                if (shard.owner !== null) {
                    //could be optimized
                    var index = shard.owner.shards.indexOf(shard);
                    shard.owner.shards.splice(index, 1);
                }
                currPlayer.shards.push(shard);
                shard.owner = currPlayer;
                shard.timer = 100;
                MOVING_SHARD_LIST[shard.id] = shard;
            }
        });
    }
};
var addShards = function () {
    if (Object.size(SHARD_LIST) < entityConfig.SHARDS + 2) {
        //console.log("shard added!");
        var shard = createNewShard();
        addShardPacket.push({
            id: shard.id,
            x: shard.x,
            y: shard.y
        });
    }
};

var updateTiles = function () {
    //returns activated tile ids
    var tilesPacket = [];
    for (var index in PLAYER_LIST) {
        var currPlayer = PLAYER_LIST[index];
        var xIndex = Math.floor(currPlayer.x / tileLength);
        var yIndex = Math.floor(currPlayer.y / tileLength);
        var tile = TILE_ARRAY[xIndex][yIndex];
        tile.updateOwner(currPlayer);

        tilesPacket.push({
            id: tile.id,
            owner: tile.owner,
            health: tile.health,
            color: tile.color
        });
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
var updateShards = function () {
    addShards();
    checkCollisions();

    var shardsPacket = [];
    for (var id in MOVING_SHARD_LIST) {
        var currShard = MOVING_SHARD_LIST[id];
        currShard.x = currShard.owner.x + Arithmetic.getRandomInt(-5, 5);
        currShard.y = currShard.owner.y + Arithmetic.getRandomInt(-5, 5);

        if (currShard.timer > 0) {
            currShard.timer -= 1;
        }
        //update quad Tree
        currShard.shardItem.bound = {
            minx: currShard.x - currShard.radius,
            miny: currShard.y - currShard.radius,
            maxx: currShard.x + currShard.radius,
            maxy: currShard.y + currShard.radius
        };
        quadTree.remove(currShard.shardItem);
        quadTree.insert(currShard.shardItem);


        shardsPacket.push({
            id: currShard.id,
            x: currShard.x,
            y: currShard.y
        });

    }
    return shardsPacket;
};
var updateHQ = function () {
    var HQPacket = [];
    //TODO: HQPacket update
    return HQPacket;
};

function update() {
    //console.log("sending packets");
    var playerUpdatePacket = updateCoords();
    var tileUpdatePacket = updateTiles();
    var shardsUpdatePacket = updateShards();
    var HQUpdatePacket = updateHQ();

    for (var index in SOCKET_LIST) {
        var currSocket = SOCKET_LIST[index];
        currSocket.emit('addEntities',
            {
                'playerInfo': addPlayerPacket,
                'shardInfo': addShardPacket,
                'HQInfo': addHQPacket
            });
        currSocket.emit('deleteEntities',
            {
                'playerInfo': deletePlayerPacket,
                'shardInfo': deleteShardPacket, //not yet used
                'HQInfo': deleteHQPacket //not yet used
            });
        currSocket.emit('updateEntities',
            {
                'players': playerUpdatePacket,
                'tiles': tileUpdatePacket,
                'shards': shardsUpdatePacket,
                'HQs': HQUpdatePacket //update health
            }
        );
    }
    //console.log("DONE sending packets");
    addShardPacket = [];
    deleteShardPacket = [];

    addPlayerPacket = [];
    deletePlayerPacket = [];

    addHQPacket = [];


}


/** INIT SERVER OBJECTS **/
initTiles();
initShards();


/** START WEBSOCKET SERVICE **/

var io = require('socket.io')(server, {});
io.sockets.on('connection', function (socket) {
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;
    console.log("Client #" + socket.id + " has joined the server");

    var player = new Entity.Player(socket.id);
    PLAYER_LIST[socket.id] = player;
    addPlayerPacket.push(addPlayerInfo(player));

    socket.emit('init', initPacket());

    socket.on('disconnect', function () {
        console.log("Client #" + socket.id + " has left the server");
        delete SOCKET_LIST[socket.id];
        dropShards(PLAYER_LIST[socket.id]);
        delete PLAYER_LIST[socket.id];
        deletePlayerPacket.push({id: socket.id});
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

        if (data.id === "space") {
            placeHeadquarters(player);
        }
    });
});

/** START MAIN LOOP **/
setInterval(update, 1000 / 25);


/** MISC METHODS **/

function createNewShard() {
    var id = Math.random();
    var shard = new Entity.Shard(
        Arithmetic.getRandomInt(0, entityConfig.WIDTH),
        Arithmetic.getRandomInt(0, entityConfig.WIDTH),
        id
    );
    shard.shardItem = {
        cell: shard,
        bound: {
            minx: shard.x - shard.radius,
            miny: shard.y - shard.radius,
            maxx: shard.x + shard.radius,
            maxy: shard.y + shard.radius
        }
    };
    quadTree.insert(shard.shardItem);
    SHARD_LIST[id] = shard;
    return shard;
}

Object.size = function (obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

/** Player Events **/

function dropShards(player) {
    for (var i = 0; i < player.shards.length; i++) {
        var shard = player.shards[i];
        shard.owner = null;
        shard.timer = 0;
        delete MOVING_SHARD_LIST[shard.id];
    }
}

function placeHeadquarters(player) {
    if (player.headquarter === null) {
        var headquarter = new Entity.Headquarter(player, player.x, player.y);
        player.headquarter = headquarter;
        HQ_LIST[headquarter.id] = headquarter;
        addHQPacket.push({
            id: headquarter.id,
            owner: headquarter.owner.name,
            x: headquarter.x,
            y: headquarter.y,
            supply: headquarter.supply
        });
        console.log('added HQ');
    }
}
