var Entity = require('./entity');
var QuadNode = require('./modules/QuadNode');
const entityConfig = require('./entity/entityConfig');
const Arithmetic = require('./modules/Arithmetic');


function GameServer() {
    this.SOCKET_LIST = {};
    this.PLAYER_LIST = {};
    this.HQ_LIST = {};
    this.SENTINEL_LIST = {};
    this.STATIC_SHARD_LIST = {};
    this.PLAYER_SHARD_LIST = {};
    this.HQ_SHARD_LIST = {};

    this.TILE_ARRAY = [];

    this.addPlayerPacket = [];
    this.addShardPacket = [];
    this.addHQPacket = [];
    this.addUIPacket = [];
    this.addSentinelPacket = [];

    this.HQUpdatePacket = [];

    this.deletePlayerPacket = [];
    this.deleteShardPacket = [];
    this.deleteHQPacket = [];
    this.deleteUIPacket = [];
    this.deleteSentinelPacket = [];

    this.shardTree = null;
    this.HQTree = null;
    this.tileTree = null;

    this.tileLength = entityConfig.WIDTH / Math.sqrt(entityConfig.TILES);
}

/** SERVER ENTITY INIT METHODS **/
GameServer.prototype.initTiles = function () {
    this.tileTree = new QuadNode({
        minx: 0,
        miny: 0,
        maxx: entityConfig.WIDTH,
        maxy: entityConfig.WIDTH
    });
    for (var i = 0; i < Math.sqrt(entityConfig.TILES); i++) {
        var row = [];
        for (var j = 0; j < Math.sqrt(entityConfig.TILES); j++) {
            var tile = new Entity.Tile(this.tileLength * i, this.tileLength * j);
            row[j] = tile;

            tile.quadItem = {
                cell: tile,
                bound: {
                    minx: tile.x,
                    miny: tile.y,
                    maxx: tile.x + this.tileLength,
                    maxy: tile.y + this.tileLength
                }
            };
            this.tileTree.insert(tile.quadItem);
        }
        this.TILE_ARRAY[i] = row;
    }
};

GameServer.prototype.initShards = function () {
    this.shardTree = new QuadNode({
        minx: 0,
        miny: 0,
        maxx: entityConfig.WIDTH,
        maxy: entityConfig.WIDTH
    });

    for (var i = 0; i < entityConfig.SHARDS; i++) {
        this.createEmptyShard();
    }
};

GameServer.prototype.initHQs = function () {
    this.HQTree = new QuadNode({
        minx: 0,
        miny: 0,
        maxx: entityConfig.WIDTH,
        maxy: entityConfig.WIDTH
    });
};

/** CLIENT ENTITY INIT METHODS **/
GameServer.prototype.createClientInitPacket = function (id) {
    var i,
        ret = {},
        playerPacket = [],
        tilePacket = [],
        shardPacket = [],
        HQPacket = [],
        sentinelPacket = [],
        currPlayer,
        currTile,
        currShard,
        currHQ,
        currSentinel;

    for (i in this.PLAYER_LIST) {
        currPlayer = this.PLAYER_LIST[i];
        playerPacket.push({
            id: currPlayer.id,
            name: currPlayer.name,
            x: currPlayer.x,
            y: currPlayer.y
        })
    }

    for (i = 0; i < this.TILE_ARRAY.length; i++) {
        for (var j = 0; j < this.TILE_ARRAY[i].length; j++) {
            currTile = this.TILE_ARRAY[i][j];
            tilePacket.push({
                id: currTile.id,
                x: currTile.x,
                y: currTile.y,
                length: currTile.length,
                color: currTile.color
            });
        }
    }

    for (i in this.STATIC_SHARD_LIST) {
        currShard = this.STATIC_SHARD_LIST[i];
        shardPacket.push({
            name: currShard.name,
            id: currShard.id,
            x: currShard.x,
            y: currShard.y
        })
    }

    for (i in this.PLAYER_SHARD_LIST) {
        currShard = this.PLAYER_SHARD_LIST[i];
        shardPacket.push({
            name: currShard.name,
            id: currShard.id,
            x: currShard.x,
            y: currShard.y
        })
    }

    for (i in this.HQ_SHARD_LIST) {
        currShard = this.HQ_SHARD_LIST[i];
        shardPacket.push({
            name: currShard.name,
            id: currShard.id,
            x: currShard.x,
            y: currShard.y
        })
    }

    for (i in this.HQ_LIST) {
        currHQ = this.HQ_LIST[i];
        HQPacket.push({
            id: currHQ.id,
            owner: currHQ.owner.name,
            x: currHQ.x,
            y: currHQ.y,
            supply: currHQ.supply,
            shards: currHQ.shards
        })
    }

    for (i in this.SENTINEL_LIST) {
        currSentinel = this.SENTINEL_LIST[i];
        sentinelPacket.push({
            id: currSentinel.id,
            owner: currSentinel.owner.name,
            x: currSentinel.x,
            y: currSentinel.y,
            supply: currSentinel.supply,
            shards: currSentinel.shards
        })
    }

    ret['tileInfo'] = tilePacket;
    ret['playerInfo'] = playerPacket;
    ret['shardInfo'] = shardPacket;
    ret['HQInfo'] = HQPacket;
    ret['sentinelInfo'] = sentinelPacket;
    ret['selfId'] = id;

    return ret;
};

/** UPDATE METHODS **/
GameServer.prototype.spawnShards = function () {
    if (Object.size(this.STATIC_SHARD_LIST) < entityConfig.SHARDS) {
        this.createEmptyShard();
    }
};

GameServer.prototype.getPlayerTile = function (player) {
    var playerBound = {
        minx: player.x - entityConfig.SHARD_WIDTH,
        miny: player.y - entityConfig.SHARD_WIDTH,
        maxx: player.x + entityConfig.SHARD_WIDTH,
        maxy: player.y + entityConfig.SHARD_WIDTH
    };
    var ret;

    this.tileTree.find(playerBound, function (tile) {
        //console.log("player is stepping on tile " + tile.id);
        ret = tile;
    });

    return ret;

};


GameServer.prototype.checkCollision = function (player) {
    var playerBound = {
        minx: player.x - entityConfig.SHARD_WIDTH,
        miny: player.y - entityConfig.SHARD_WIDTH,
        maxx: player.x + entityConfig.SHARD_WIDTH,
        maxy: player.y + entityConfig.SHARD_WIDTH
    };

    //shard collision
    this.shardTree.find(playerBound, function (shard) {
        if (player !== shard.owner && shard.timer === 0
            && player.emptyShard === null) {
            if (shard.owner === null) {
                this.removeStaticShard(shard, "LOCAL");
            } else {
                if (shard.name === null) {
                    this.deleteUIPacket.push({
                        id: shard.owner.id,
                        action: "name shard"
                    });
                }
                shard.owner.removeShard(shard);
            }
            if (shard.name === null) {
                this.deleteUIPacket.push({
                    id: player.id,
                    action: "hq info"
                });

                this.addUIPacket.push({
                    id: player.id,
                    action: "name shard"
                });
            }
            this.addPlayerShard(player, shard);
        }
    }.bind(this));

    //HQ collision
    this.HQTree.find(playerBound, function (HQ) {
            if (player === HQ.owner) {
                for (var i = 0; i < player.shards.length; i++) {
                    var shard = this.PLAYER_SHARD_LIST[player.shards[i]];
                    this.removePlayerShard(player, shard, "LOCAL");
                    this.addHQShard(HQ, shard);
                }
                if (player.pressingSpace) {
                    this.addUIPacket.push(
                        {
                            id: player.id,
                            action: "hq info"
                        }
                    );

                }
            }
        }.bind(this)
    );

};

GameServer.prototype.checkCollisions = function () {
    for (var index in this.PLAYER_LIST) {
        var currPlayer = this.PLAYER_LIST[index];
        this.checkCollision(currPlayer);
    }
};

GameServer.prototype.updateTiles = function () {
    var tilesPacket = [];
    for (var index in this.PLAYER_LIST) {
        var currPlayer = this.PLAYER_LIST[index];
        var xIndex = Math.floor(currPlayer.x / this.tileLength);
        var yIndex = Math.floor(currPlayer.y / this.tileLength);
        var tile = this.TILE_ARRAY[xIndex][yIndex];
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

GameServer.prototype.updatePlayers = function () {
    var playersPacket = [];
    for (var index in this.PLAYER_LIST) {
        var currPlayer = this.PLAYER_LIST[index];
        currPlayer.updatePosition();
        playersPacket.push({
            id: currPlayer.id,
            x: currPlayer.x,
            y: currPlayer.y
        });
    }
    return playersPacket;
};

GameServer.prototype.updateShards = function () {
    var shardsPacket = [];
    var currShard;
    var id;

    this.spawnShards();
    this.checkCollisions();


    for (id in this.PLAYER_SHARD_LIST) {
        currShard = this.PLAYER_SHARD_LIST[id];
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
        this.shardTree.remove(currShard.quadItem);
        this.shardTree.insert(currShard.quadItem);


        shardsPacket.push({
            name: currShard.name,
            id: currShard.id,
            x: currShard.x,
            y: currShard.y
        });
    }

    for (id in this.HQ_SHARD_LIST) {
        currShard = this.HQ_SHARD_LIST[id];
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

GameServer.prototype.update = function () {
    var playerUpdatePacket = this.updatePlayers();
    var tileUpdatePacket = this.updateTiles();
    var shardsUpdatePacket = this.updateShards();

    for (var index in this.SOCKET_LIST) {
        var currSocket = this.SOCKET_LIST[index];

        currSocket.emit('updateEntities',
            {
                'playerInfo': playerUpdatePacket,
                'tileInfo': tileUpdatePacket,
                'shardInfo': shardsUpdatePacket,
                'HQInfo': this.HQUpdatePacket
            });

        currSocket.emit('addEntities',
            {
                'playerInfo': this.addPlayerPacket,
                'shardInfo': this.addShardPacket,
                'HQInfo': this.addHQPacket,
                'sentinelInfo': this.addSentinelPacket,
                'UIInfo': this.addUIPacket
            });

        currSocket.emit('deleteEntities',
            {
                'playerInfo': this.deletePlayerPacket,
                'shardInfo': this.deleteShardPacket,
                'HQInfo': this.deleteHQPacket,
                'UIInfo': this.deleteUIPacket
            });
    }
    this.addShardPacket = [];
    this.addPlayerPacket = [];
    this.addHQPacket = [];
    this.addUIPacket = [];
    this.addSentinelPacket = [];

    this.deleteShardPacket = [];
    this.deletePlayerPacket = [];
    this.deleteHQPacket = [];
    this.deleteUIPacket = [];
    this.deleteSentinelPacket = [];

    this.updateHQPacket = [];

};


GameServer.prototype.start = function () {
    var express = require("express");
    var app = express();
    var server = require('http').Server(app);

    /** INIT PORT CONNECTION **/
    app.get('/', function (req, res) {
        res.sendFile(__dirname + '/web/index.html');
    });
    app.use('/', express.static(__dirname + '/web'));
    server.listen(2000); //port number for listening
    console.log('Started Server!');

    /** INIT SERVER OBJECTS **/
    this.initTiles();
    this.initShards();
    this.initHQs();

    /** START WEBSOCKET SERVICE **/
    var io = require('socket.io')(server, {});
    io.sockets.on('connection', function (socket) {
        socket.id = Math.random();
        this.SOCKET_LIST[socket.id] = socket;
        console.log("Client #" + socket.id + " has joined the server");


        var player = new Entity.Player(socket.id);
        this.PLAYER_LIST[socket.id] = player;
        this.addPlayerPacket.push({
            id: player.id,
            name: player.name,
            x: player.x,
            y: player.y
        });

        socket.emit('init', this.createClientInitPacket(socket.id));

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
                this.createHeadquarters(player);
            }
            if (data.id === "A") {
                player.pressingA = data.state;
                this.createSentinel(player);
            }

        }.bind(this));

        socket.on('textInput', function (data) {
            var player = this.PLAYER_LIST[data.id];
            player.transformEmptyShard(data.word);
        }.bind(this));

        socket.on('removeShardHQ', function (data) {
            var shard = this.HQ_SHARD_LIST[data.id];
            var HQ = shard.HQ;

            this.removeHQShard(HQ, shard, "LOCAL");
            this.addPlayerShard(player, shard);

            this.updateHQPacket.push(
                {
                    id: HQ.id,
                    supply: HQ.supply,
                    shards: HQ.shards
                }
            );

            this.addUIPacket.push({
                id: player.id,
                action: "hq info"
            });
        }.bind(this));

        socket.on('disconnect', function () {
            console.log("Client #" + socket.id + " has left the server");
            this.removePlayer(player);
            delete this.SOCKET_LIST[socket.id];
        }.bind(this));
    }.bind(this));

    /** START MAIN LOOP **/
    setInterval(this.update.bind(this), 1000 / 25);

};

/** SERVER ADD EVENTS **/
GameServer.prototype.addPlayerShard = function (player, shard) {
    player.addShard(shard);
    this.PLAYER_SHARD_LIST[shard.id] = shard;
};

GameServer.prototype.addHQShard = function (HQ, shard) {
    HQ.addShard(shard);
    this.HQ_SHARD_LIST[shard.id] = shard;

    this.HQUpdatePacket.push(
        {
            id: HQ.id,
            supply: HQ.supply,
            shards: HQ.shards
        }
    );
};

/** SERVER CREATION EVENTS **/
GameServer.prototype.createEmptyShard = function () {
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
    this.shardTree.insert(shard.quadItem);
    this.STATIC_SHARD_LIST[id] = shard;

    this.addShardPacket.push({
        id: shard.id,
        x: shard.x,
        y: shard.y,
        name: null
    });

    return shard;
};

GameServer.prototype.createHeadquarters = function (player) {
    if (player.headquarter === null) {
        var headquarter = new Entity.Headquarter(player, player.x, player.y);
        this.HQ_LIST[headquarter.id] = headquarter;
        headquarter.quadItem = {
            cell: headquarter,
            bound: {
                minx: headquarter.x - headquarter.radius,
                miny: headquarter.y - headquarter.radius,
                maxx: headquarter.x + headquarter.radius,
                maxy: headquarter.y + headquarter.radius
            }
        };
        this.HQTree.insert(headquarter.quadItem);
        player.headquarter = headquarter;
        this.addHQPacket.push({
            id: headquarter.id,
            owner: headquarter.owner.name,
            x: headquarter.x,
            y: headquarter.y,
            supply: headquarter.supply,
            shards: headquarter.shards
        });

        player.pressingSpace = false;
    }
};

GameServer.prototype.createSentinel = function (player) {
    var tile = this.getPlayerTile(player);
    console.log(tile);
    if (tile !== null && tile.sentinel === null) {
        console.log("ADDING SENTINEL");
        var sentinel = new Entity.Sentinel(player, player.x, player.y);
        this.SENTINEL_LIST[sentinel.id] = sentinel;
        this.addSentinelPacket.push(
            {
                id: sentinel.id,
                owner: sentinel.owner.name,
                x: sentinel.x,
                y: sentinel.y,
                supply: sentinel.supply,
                shards: sentinel.shards
            }
        );
        tile.sentinel = sentinel;
    }
};

/** SERVER REMOVE EVENTS **/
GameServer.prototype.removePlayer = function (player) {
    for (var i = 0; i < player.shards.length; i++) {
        var shard = this.PLAYER_SHARD_LIST[player.shards[i]];
        this.removePlayerShard(player, shard, "GLOBAL");
    }
    if (player.emptyShard !== null) {
        this.removePlayerShard(player, player.emptyShard, "GLOBAL");
    }
    if (player.headquarter !== null) {
        this.removeHQ(player.headquarter);
    }
    this.deletePlayerPacket.push({id: player.id});
    delete this.PLAYER_LIST[player.id];
};

GameServer.prototype.removeHQ = function (HQ) {
    this.HQTree.remove(HQ.quadItem);
    for (var i = 0; i < HQ.shards.length; i++) {
        var shard = this.HQ_SHARD_LIST[HQ.shards[i]];
        this.removeHQShard(HQ, shard, "GLOBAL");
    }
    this.deleteHQPacket.push({id: HQ.id});
    delete this.HQ_LIST[HQ.id];
};

GameServer.prototype.removeStaticShard = function (shard, status) {
    if (status === "GLOBAL") {
        this.deleteShardPacket.push({id: shard.id});
    }
    delete this.STATIC_SHARD_LIST[shard.id];
};

GameServer.prototype.removePlayerShard = function (player, shard, status) {
    player.removeShard(shard);
    this.shardTree.remove(shard.quadItem);

    if (status === "GLOBAL") {
        this.deleteShardPacket.push({id: shard.id});
    }
    delete this.PLAYER_SHARD_LIST[shard.id];
};

GameServer.prototype.removeHQShard = function (HQ, shard, status) {
    HQ.removeShard(shard);

    if (status === "GLOBAL") {
        this.deleteShardPacket.push({id: shard.id});
    }
    else {
        this.HQUpdatePacket.push(
            {
                id: HQ.id,
                supply: HQ.supply,
                shards: HQ.shards
            }
        );
    }
    delete this.HQ_SHARD_LIST[shard.id];
};


/** MISC METHODS **/

Object.size = function (obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};


module.exports = GameServer;