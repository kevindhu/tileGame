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
    this.SHOOTING_SHARD_LIST = {};
    this.PLAYER_SHARD_LIST = {};
    this.HQ_SHARD_LIST = {};

    this.TILE_ARRAY = [];

    this.addPlayerPacket = [];
    this.addShardPacket = [];
    this.addHQPacket = [];
    this.addUIPacket = [];
    this.addSentinelPacket = [];

    this.updateHQPacket = [];
    this.updateTilesPacket = [];
    this.updateShardsPacket = [];
    this.updatePlayersPacket = [];

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

            var centerX = tile.x + this.tileLength / 2;
            var centerY = tile.y + this.tileLength / 2;

            tile.quadItem = {
                cell: tile,
                bound: {
                    minx: centerX - this.tileLength / 7,
                    miny: centerY - this.tileLength / 7,
                    maxx: centerX + this.tileLength / 7,
                    maxy: centerY + this.tileLength / 7
                }
            };
            this.tileTree.insert(tile.quadItem);
        }
        this.TILE_ARRAY[i] = row;
    }
};

GameServer.prototype.initShards = function () {
	this.shootingShardTree = new QuadNode({
        minx: 0,
        miny: 0,
        maxx: entityConfig.WIDTH,
        maxy: entityConfig.WIDTH
    });

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
    var ret = null;

    this.tileTree.find(playerBound, function (tile) {
        ret = tile;
    }.bind(this));
    if (ret !== null) {
    }
    return ret;

};

GameServer.prototype.checkShardCollision = function (shard) {
	var shardBound = {
        minx: shard.x - entityConfig.SHARD_WIDTH,
        miny: shard.y - entityConfig.SHARD_WIDTH,
        maxx: shard.x + entityConfig.SHARD_WIDTH,
        maxy: shard.y + entityConfig.SHARD_WIDTH
    };

	this.HQTree.find(shardBound, function (HQ) {
		if (shard.owner !== HQ.owner) {
			this.removeShootingShard(shard, "GLOBAL");
		}
		this.dropHQShard(HQ);
		
	}.bind(this))
}

GameServer.prototype.checkPlayerCollision = function (player) {
    var playerBound = {
        minx: player.x - entityConfig.SHARD_WIDTH,
        miny: player.y - entityConfig.SHARD_WIDTH,
        maxx: player.x + entityConfig.SHARD_WIDTH,
        maxy: player.y + entityConfig.SHARD_WIDTH
    };

    //normal shard collision
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

    //shooting shard collision
    this.shootingShardTree.find(playerBound, function (shard) {
    	if (player !== shard.owner) {
    		console.log("SHOT BITCH from " + shard.id);
    		this.removeShootingShard(shard, "GLOBAL");
    		this.addVoicePacket.push({
    			string: shard.name
    		});
    	}

    }.bind(this));

    //player-HQ collision
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
    for (var id in this.PLAYER_LIST) {
        var currPlayer = this.PLAYER_LIST[id];
        this.checkPlayerCollision(currPlayer);
    }
    for (var id in this.SHOOTING_SHARD_LIST) {
        var currShard = this.SHOOTING_SHARD_LIST[id];
        this.checkShardCollision(currShard);
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
    for (var index in this.PLAYER_LIST) {
        var currPlayer = this.PLAYER_LIST[index];
        currPlayer.updatePosition();
        this.updatePlayersPacket.push({
            id: currPlayer.id,
            x: currPlayer.x,
            y: currPlayer.y
        });
    }
};

GameServer.prototype.updateShards = function () {
    var id,
        currShard;

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

        this.updateShardsPacket.push({
            name: currShard.name,
            id: currShard.id,
            x: currShard.x,
            y: currShard.y
        });
    }

    for (id in this.SHOOTING_SHARD_LIST) {
        currShard = this.SHOOTING_SHARD_LIST[id];

        currShard.quadItem.bound = {
            minx: currShard.x - currShard.radius,
            miny: currShard.y - currShard.radius,
            maxx: currShard.x + currShard.radius,
            maxy: currShard.y + currShard.radius
        };
        this.shootingShardTree.remove(currShard.quadItem);
        this.shootingShardTree.insert(currShard.quadItem);

        if (currShard.xVel !== 0) { 
	        currShard.updatePosition();

	        this.updateShardsPacket.push({
	            name: currShard.name,
	            id: currShard.id,
	            x: currShard.x,
	            y: currShard.y
	        });
    	}
    	else {
    		this.removeShootingShard(currShard, "LOCAL");
    		this.addStaticShard(currShard);
    	}

    }

    for (id in this.HQ_SHARD_LIST) {
        currShard = this.HQ_SHARD_LIST[id];
        currShard.rotate();
        this.updateShardsPacket.push({
            name: currShard.name,
            id: currShard.id,
            x: currShard.x,
            y: currShard.y
        });
    }
};

GameServer.prototype.update = function () {
    this.updatePlayers();
    this.updateShards();


    for (var index in this.SOCKET_LIST) {
        var currSocket = this.SOCKET_LIST[index];

        currSocket.emit('updateEntities',
            {
                'playerInfo': this.updatePlayersPacket,
                'tileInfo': this.updateTilesPacket,
                'shardInfo': this.updateShardsPacket,
                'HQInfo': this.updateHQPacket
            });

        currSocket.emit('addEntities',
            {
                'playerInfo': this.addPlayerPacket,
                'shardInfo': this.addShardPacket,
                'HQInfo': this.addHQPacket,
                'sentinelInfo': this.addSentinelPacket,
                'UIInfo': this.addUIPacket,
                'voiceInfo': this.addVoicePacket
            });

        currSocket.emit('deleteEntities',
            {
                'playerInfo': this.deletePlayerPacket,
                'shardInfo': this.deleteShardPacket,
                'HQInfo': this.deleteHQPacket,
                'UIInfo': this.deleteUIPacket
            });
    }
    this.resetPackets();
};

GameServer.prototype.resetPackets = function () {
    this.addPlayerPacket = [];
    this.addShardPacket = [];
    this.addHQPacket = [];
    this.addUIPacket = [];
    this.addVoicePacket = [];
    this.addVoicePacket = [];
    this.addSentinelPacket = [];

    this.updateHQPacket = [];
    this.updateTilesPacket = [];
    this.updateShardsPacket = [];
    this.updatePlayersPacket = [];

    this.deletePlayerPacket = [];
    this.deleteShardPacket = [];
    this.deleteHQPacket = [];
    this.deleteUIPacket = [];
    this.deleteSentinelPacket = [];
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
            switch (data.id) {
                case "left":
                    player.pressingLeft = data.state;
                    break;
                case "right":
                    player.pressingRight = data.state;
                    break;
                case "up":
                    player.pressingUp = data.state;
                    break;
                case "down":
                    player.pressingDown = data.state;
                    break;
                case "space":
                    player.pressingSpace = data.state;
                    this.createHeadquarters(player);
                    break;
                case "A":
                    if (data.state) {
                        this.createSentinel(player);
                    }
                    break;
            }
        }.bind(this));

        socket.on('textInput', function (data) {
            player.transformEmptyShard(data.word);
        }.bind(this));

        socket.on("arrowVector", function (data) {
        	if (player.getRandomShard()) {
	        	var shard = this.PLAYER_SHARD_LIST[player.getRandomShard()];
	        	this.removePlayerShard(player, shard, "LOCAL");
	        	shard.owner = player;
	        	this.addShootingShard(shard, data.x, data.y);
	        }
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
    setInterval(this.update.bind(this), 1000/25);

};

/** SERVER ADD EVENTS **/
GameServer.prototype.addStaticShard = function (shard) {
    this.STATIC_SHARD_LIST[shard.id] = shard;
    shard.owner = null;
    shard.quadItem.bound = {
            minx: shard.x - shard.radius,
            miny: shard.y - shard.radius,
            maxx: shard.x + shard.radius,
            maxy: shard.y + shard.radius
        };
    this.shardTree.insert(shard.quadItem);
};

GameServer.prototype.addPlayerShard = function (player, shard) {
    player.addShard(shard);
    this.PLAYER_SHARD_LIST[shard.id] = shard;
};

GameServer.prototype.addShootingShard = function (shard, xVel, yVel) {
	shard.addVelocity(xVel,yVel);
    this.SHOOTING_SHARD_LIST[shard.id] = shard;
};

GameServer.prototype.addHQShard = function (HQ, shard) {
    HQ.addShard(shard);
    this.HQ_SHARD_LIST[shard.id] = shard;

    this.updateHQPacket.push(
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
    if (tile !== null && tile.sentinel === null) {
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
        tile.setSentinel(sentinel);

        this.updateTilesPacket.push({
            id: tile.id,
            owner: tile.owner.name,
            health: tile.health,
            color: tile.color
        });
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

GameServer.prototype.removeShootingShard = function (shard, status) {
    this.shootingShardTree.remove(shard.quadItem);
    if (status === "GLOBAL") {
    	this.deleteShardPacket.push({id: shard.id});
    }
    delete this.SHOOTING_SHARD_LIST[shard.id];
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
        this.updateHQPacket.push(
            {
                id: HQ.id,
                supply: HQ.supply,
                shards: HQ.shards
            }
        );
    }
    delete this.HQ_SHARD_LIST[shard.id];
};


/** SPECIAL METHODS **/
GameServer.prototype.dropHQShard = function (HQ) {
	if (HQ.getRandomShard()) {
		var shard = this.HQ_SHARD_LIST[HQ.getRandomShard()];
		this.removeHQShard(HQ,shard,"LOCAL");
		this.addShootingShard(shard,
			Arithmetic.getRandomInt(-30,30),
			Arithmetic.getRandomInt(-30,30)
			);
	}
}

/** MISC METHODS **/
Object.size = function (obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};


module.exports = GameServer;