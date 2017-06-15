var express = require("express");
var app = express();
var server = require('http').Server(app);
var Entity = require('./entity');
var QuadNode = require('./modules/QuadNode');
const entityConfig = require('./entity/entityConfig');
const Arithmetic = require('./modules/Arithmetic');


var SOCKET_LIST = {};

/** ENTITIES STORAGE**/
var TILE_ARRAY = [];
var PLAYER_LIST = {};
var HQ_LIST = {};
var STATIC_SHARD_LIST = {};
var PLAYER_SHARD_LIST = {};
var HQ_SHARD_LIST = {};


var addPlayerPacket = [];
var addShardPacket = [];
var addHQPacket = [];
var addUIPacket = [];

var HQUpdatePacket = [];

var deletePlayerPacket = [];
var deleteShardPacket = [];
var deleteHQPacket = [];

var shardTree = null;
var HQTree = null;

const tileLength = entityConfig.WIDTH / Math.sqrt(entityConfig.TILES);

/** SERVER ENTITY INIT METHODS **/

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
    shardTree = new QuadNode({
        minx: 0,
        miny: 0,
        maxx: entityConfig.WIDTH,
        maxy: entityConfig.WIDTH
    });

    for (var i = 0; i < entityConfig.SHARDS; i++) {
        createNewShard();
    }
};

var initHQs = function () {
    HQTree = new QuadNode({
        minx: 0,
        miny: 0,
        maxx: entityConfig.WIDTH,
        maxy: entityConfig.WIDTH
    });
};

/** CLIENT ENTITY INIT METHODS **/

var initPacket = function (id) {
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

    for (var i = 0; i < TILE_ARRAY.length; i++) {
        for (var j = 0; j < TILE_ARRAY[i].length; j++) {
            var currTile = TILE_ARRAY[i][j];
            tilePacket.push({
                id: currTile.id,
                x: currTile.x,
                y: currTile.y,
                length: currTile.length,
                color: currTile.color
            });
        }
    }

    for (var i in STATIC_SHARD_LIST) {
        var currShard = STATIC_SHARD_LIST[i];
        shardPacket.push({
            name: currShard.name,
            id: currShard.id,
            x: currShard.x,
            y: currShard.y
        })
    }

    for (var i in PLAYER_SHARD_LIST) {
        var currShard = PLAYER_SHARD_LIST[i];
        shardPacket.push({
            name: currShard.name,
            id: currShard.id,
            x: currShard.x,
            y: currShard.y
        })
    }

    for (var i in HQ_SHARD_LIST) {
        var currShard = HQ_SHARD_LIST[i];
        shardPacket.push({
            name: currShard.name,
            id: currShard.id,
            x: currShard.x,
            y: currShard.y
        })
    }

    for (var i in HQ_LIST) {
        var currHQ = HQ_LIST[i];
        HQPacket.push({
            id: currHQ.id,
            owner: currHQ.owner.name,
            x: currHQ.x,
            y: currHQ.y,
            supply: currHQ.supply,
            shards: currHQ.shards
        })
    }

    ret['tilePacket'] = tilePacket;
    ret['playerPacket'] = playerPacket;
    ret['shardPacket'] = shardPacket;
    ret['HQPacket'] = HQPacket;
    ret['selfId'] = id;

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

var checkCollision = function (player) {
    var playerBound = {
        minx: player.x - entityConfig.SHARD_WIDTH,
        miny: player.y - entityConfig.SHARD_WIDTH,
        maxx: player.x + entityConfig.SHARD_WIDTH,
        maxy: player.y + entityConfig.SHARD_WIDTH
    };
    //shard collision
    shardTree.find(playerBound, function (shard) {
        if (player !== shard.owner && shard.timer === 0
            && player.emptyShard === null) {
            if (shard.owner !== null) {
                shard.owner.removeShard(shard);
            }

            player.addEmptyShard(shard);
            PLAYER_SHARD_LIST[shard.id] = shard;

            addUIPacket.push({
                id: player.id,
                action: "name shard"
            });

            delete STATIC_SHARD_LIST[shard.id];

        }
    });

    //HQ collision
    HQTree.find(playerBound, function (HQ) {
            if (player === HQ.owner) {
                for (var i = 0; i < player.shards.length; i++) {
                    var shard = PLAYER_SHARD_LIST[player.shards[i]];
                    player.removeShard(shard);
                    shardTree.remove(shard.quadItem);

                    HQ.addShard(shard);
                    HQ_SHARD_LIST[shard.id] = shard;

                    HQUpdatePacket.push(
                        {
                            id: HQ.id,
                            supply: HQ.supply,
                            shards: HQ.shards
                        }
                    );

                    delete PLAYER_SHARD_LIST[shard.id];
                }
                if (player.pressingSpace) {
                    addUIPacket.push(
                        {
                            id: player.id,
                            action: "open hq"
                        }
                    );

                }
            }
        }
    );
};

var checkCollisions = function () {
    for (var index in PLAYER_LIST) {
        var currPlayer = PLAYER_LIST[index];
        checkCollision(currPlayer);
    }
};

var addShards = function () {
    if (Object.size(STATIC_SHARD_LIST) < entityConfig.SHARDS) {
        var shard = createNewShard();
        addShardPacket.push({
            id: shard.id,
            x: shard.x,
            y: shard.y,
            name: null
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

var updatePlayers = function () {
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
    var currShard = null;

    for (var id in PLAYER_SHARD_LIST) {
        currShard = PLAYER_SHARD_LIST[id];
        currShard.x = currShard.owner.x + Arithmetic.getRandomInt(-5, 5);
        currShard.y = currShard.owner.y + Arithmetic.getRandomInt(-5, 5);

        if (currShard.timer > 0) {
            currShard.timer -= 1;
        }
        //update quad Tree
        currShard.quadItem.bound = {
            minx: currShard.x - currShard.radius,
            miny: currShard.y - currShard.radius,
            maxx: currShard.x + currShard.radius,
            maxy: currShard.y + currShard.radius
        };
        shardTree.remove(currShard.quadItem);
        shardTree.insert(currShard.quadItem);


        shardsPacket.push({
            name: currShard.name,
            id: currShard.id,
            x: currShard.x,
            y: currShard.y
        });
    }

    for (var id in HQ_SHARD_LIST) {
        currShard = HQ_SHARD_LIST[id];
        currShard.rotate();
        shardsPacket.push({
            name: currShard.name,
            id: currShard.id,
            x: currShard.x,
            y: currShard.y
        });
    }
    return shardsPacket;
};

function update() {
    var playerUpdatePacket = updatePlayers();
    var tileUpdatePacket = updateTiles();
    var shardsUpdatePacket = updateShards();

    for (var index in SOCKET_LIST) {
        var currSocket = SOCKET_LIST[index];


        currSocket.emit('updateEntities',
            {
                'playerInfo': playerUpdatePacket,
                'tileInfo': tileUpdatePacket,
                'shardInfo': shardsUpdatePacket,
                'HQInfo': HQUpdatePacket
            });

        currSocket.emit('addEntities',
            {
                'playerInfo': addPlayerPacket,
                'shardInfo': addShardPacket,
                'HQInfo': addHQPacket,
                'UIInfo': addUIPacket
            });

        currSocket.emit('deleteEntities',
            {
                'playerInfo': deletePlayerPacket,
                'shardInfo': deleteShardPacket,
                'HQInfo': deleteHQPacket
            });
    }
    addShardPacket = [];
    deleteShardPacket = [];

    addPlayerPacket = [];
    deletePlayerPacket = [];

    addHQPacket = [];
    deleteHQPacket = [];
    HQUpdatePacket = [];

    addUIPacket = [];


}


/** INIT PORT CONNECTION **/
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/web/index.html');
});
app.use('/', express.static(__dirname + '/web'));
server.listen(2000); //port number for listening
console.log('Started Server!');

/** INIT SERVER OBJECTS **/
initTiles();
initShards();
initHQs();


/** START WEBSOCKET SERVICE **/

var io = require('socket.io')(server, {});
io.sockets.on('connection', function (socket) {
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;
    console.log("Client #" + socket.id + " has joined the server");

    var player = new Entity.Player(socket.id);
    PLAYER_LIST[socket.id] = player;
    addPlayerPacket.push(addPlayerInfo(player));

    socket.emit('init', initPacket(socket.id));


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
            player.pressingSpace = data.state;
            placeHeadquarters(player);
        }
    });

    socket.on('textInput', function (data) {
        var player = PLAYER_LIST[data.id];
        player.transformEmptyShard(data.word);
    });

    socket.on('removeShardHQ', function (data) {
        var shard = HQ_SHARD_LIST[data.id];
        var HQ = shard.HQ;

        HQ.removeShard(shard);
        player.addShard(shard);

        HQUpdatePacket.push(
            {
                id: HQ.id,
                supply: HQ.supply,
                shards: HQ.shards
            }
        );

        addUIPacket.push({
            id: player.id,
            action: "open hq"
        });

        PLAYER_SHARD_LIST[shard.id] = shard;
        delete HQ_SHARD_LIST[shard.id];
    });

    socket.on('disconnect', function () {
        console.log("Client #" + socket.id + " has left the server");

        dropShards(PLAYER_LIST[socket.id]);
        deletePlayerPacket.push({id: socket.id});
        deleteHQPacket.push({id: socket.id});
        if (player.headquarter !== null) {
            HQTree.remove(HQ_LIST[socket.id].quadItem);
            for (var i = 0; i < player.headquarter.shards.length; i++) {
                var shard = player.headquarter.shards[i];
                deleteShardPacket.push({id: shard.id});
                delete HQ_SHARD_LIST[shard.id];
            }
        }

        delete PLAYER_LIST[socket.id];
        delete SOCKET_LIST[socket.id];
        delete HQ_LIST[socket.id];
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
    shard.quadItem = {
        cell: shard,
        bound: {
            minx: shard.x - shard.radius,
            miny: shard.y - shard.radius,
            maxx: shard.x + shard.radius,
            maxy: shard.y + shard.radius
        }
    };
    shardTree.insert(shard.quadItem);
    STATIC_SHARD_LIST[id] = shard;
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
    var dropShard = function (shard) {
        player.removeShard(shard);
        delete PLAYER_SHARD_LIST[shard.id];
    };

    for (var i = 0; i < player.shards.length; i++) {
        var shard = PLAYER_SHARD_LIST[player.shards[i]];
        dropShard(shard);
    }

    //remove emptyShard
    if (player.emptyShard !== null) {
        dropShard(player.emptyShard);
    }
}

function placeHeadquarters(player) {
    if (player.headquarter === null) {
        var headquarter = new Entity.Headquarter(player, player.x, player.y);

        headquarter.quadItem = {
            cell: headquarter,
            bound: {
                minx: headquarter.x - headquarter.radius,
                miny: headquarter.y - headquarter.radius,
                maxx: headquarter.x + headquarter.radius,
                maxy: headquarter.y + headquarter.radius
            }
        };
        HQTree.insert(headquarter.quadItem);

        player.headquarter = headquarter;
        HQ_LIST[headquarter.id] = headquarter;
        addHQPacket.push({
            id: headquarter.id,
            owner: headquarter.owner.name,
            x: headquarter.x,
            y: headquarter.y,
            supply: headquarter.supply,
            shards: headquarter.shards
        });


        player.pressingSpace = false;
    }
}
