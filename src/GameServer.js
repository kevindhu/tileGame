var Entity = require('./entity');
var QuadNode = require('./modules/QuadNode');
const entityConfig = require('./entity/entityConfig');
const Arithmetic = require('./modules/Arithmetic');

function GameServer() {
    this.TILE_LIST = {};
    this.SOCKET_LIST = {};
    this.PLAYER_LIST = {};
    this.HQ_LIST = {};
    this.SENTINEL_LIST = {};

    this.STATIC_SHARD_LIST = {};
    this.SHOOTING_SHARD_LIST = {};
    this.PLAYER_SHARD_LIST = {};
    this.HOME_SHARD_LIST = {};

    this.addPlayerPacket = [];
    this.addShardPacket = [];
    this.addHQPacket = [];
    this.addUIPacket = [];
    this.addSentinelPacket = [];

    this.updateHQPacket = [];
    this.updateTilesPacket = [];
    this.updateShardsPacket = [];
    this.updatePlayersPacket = [];
    this.updateSentinelsPacket = [];

    this.deletePlayerPacket = [];
    this.deleteShardPacket = [];
    this.deleteHQPacket = [];
    this.deleteUIPacket = [];
    this.deleteSentinelPacket = [];

    this.shardTree = null;
    this.hQTree = null;
    this.tileTree = null;

    this.tileLength = (entityConfig.WIDTH - 2 * entityConfig.BORDER_WIDTH) / Math.sqrt(entityConfig.TILES);

    this.minx =  entityConfig.BORDER_WIDTH;
    this.miny =  entityConfig.BORDER_WIDTH;
    this.maxx =  entityConfig.WIDTH - entityConfig.BORDER_WIDTH;
    this.maxy =  entityConfig.WIDTH - entityConfig.BORDER_WIDTH
}

/** SERVER ENTITY INIT METHODS **/
GameServer.prototype.initTiles = function () {
    this.tileTree = new QuadNode({
        minx: this.minx,
        miny: this.miny,
        maxx: this.maxx,
        maxy: this.maxy
    });
    for (var i = 0; i < Math.sqrt(entityConfig.TILES); i++) {
        for (var j = 0; j < Math.sqrt(entityConfig.TILES); j++) {
            var tile = new Entity.Tile(entityConfig.BORDER_WIDTH + this.tileLength * i, 
            	entityConfig.BORDER_WIDTH + this.tileLength * j);
            this.TILE_LIST[tile.id] = tile;

            var centerX = tile.x + this.tileLength / 2;
            var centerY = tile.y + this.tileLength / 2;

            tile.quadItem = {
                cell: tile,
                bound: {
                    minx: centerX - this.tileLength/7,
                    miny: centerY - this.tileLength/7,
                    maxx: centerX + this.tileLength/7,
                    maxy: centerY + this.tileLength/7 
                }
            };
            this.tileTree.insert(tile.quadItem);
        }
    }
};

GameServer.prototype.initShards = function () {
	this.shootingShardTree = new QuadNode({
        minx: this.minx,
        miny: this.miny,
        maxx: this.maxx,
        maxy: this.maxy
    });

    this.shardTree = new QuadNode({
        minx: this.minx,
        miny: this.miny,
        maxx: this.maxx,
        maxy: this.maxy
    });
    
    for (var i = 0; i < entityConfig.SHARDS; i++) {
        this.createEmptyShard();
    }
};

GameServer.prototype.initHQs = function () {
    this.hQTree = new QuadNode({
        minx: this.minx,
        miny: this.miny,
        maxx: this.maxx,
        maxy: this.maxy
    });
};

/** CLIENT ENTITY INIT METHODS **/
GameServer.prototype.createMainInitPacket = function (id) {
    var i,
        ret = {},
        playerPacket = [],
        tilePacket = [],
        shardPacket = [],
        HQPacket = [],
        sentinelPacket = [],
        player,
        shard,
        hq,
        sentinel;

    for (i in this.PLAYER_LIST) {
        player = this.PLAYER_LIST[i];
        playerPacket.push({
            id: player.id,
            name: player.name,
            x: player.x,
            y: player.y
        })
    }
    

    for (i in this.STATIC_SHARD_LIST) {
        shard = this.STATIC_SHARD_LIST[i];
        shardPacket.push({
            name: shard.name,
            id: shard.id,
            x: shard.x,
            y: shard.y
        })
    }

    for (i in this.PLAYER_SHARD_LIST) {
        shard = this.PLAYER_SHARD_LIST[i];
        shardPacket.push({
            name: shard.name,
            id: shard.id,
            x: shard.x,
            y: shard.y
        })
    }

    for (i in this.HOME_SHARD_LIST) {
        shard = this.HOME_SHARD_LIST[i];
        shardPacket.push({
            name: shard.name,
            id: shard.id,
            x: shard.x,
            y: shard.y
        })
    }

    for (i in this.HQ_LIST) {
        hq = this.HQ_LIST[i];
        HQPacket.push({
            id: hq.id,
            owner: hq.owner.name,
            x: hq.x,
            y: hq.y,
            supply: hq.supply,
            shards: hq.shards
        })
    }

    for (i in this.SENTINEL_LIST) {
        sentinel = this.SENTINEL_LIST[i];
        sentinelPacket.push({
            id: sentinel.id,
            owner: sentinel.owner.name,
            x: sentinel.x,
            y: sentinel.y,
            supply: sentinel.supply,
            shards: sentinel.shards
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



GameServer.prototype.createTileInitPacket = function (id, bound) {
    var i,
        ret = {},
        playerPacket = [],
        tilePacket = [],
        shardPacket = [],
        HQPacket = [],
        sentinelPacket = [],
        tile;

    var size = Object.size(this.TILE_LIST);
    var count = 0;
    for (i in this.TILE_LIST) {
        if (count >= bound[0] && count < bound[1]) {
            tile = this.TILE_LIST[i];
            tilePacket.push({
                id: tile.id,
                x: tile.x,
                y: tile.y,
                color: tile.color,
                length: tile.length
            }); 
        }
        count++;
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

	this.hQTree.find(shardBound, function (HQ) {
		if (shard.owner !== HQ.owner) {
			this.removeShootingShard(shard, "GLOBAL");
            this.dropHQShard(HQ);
		}
		
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
            console.log("SHOT A PLAYER!");
    		this.removeShootingShard(shard, "GLOBAL");
            player.decreaseHealth();
            if (player.health == 0) {
                this.resetPlayer(player);
            }
    	}

    }.bind(this));

    //player-HQ collision
    this.hQTree.find(playerBound, function (HQ) {   
            if (player === HQ.owner) {
                for (var i = player.shards.length-1; i >= 0; i--) {
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
        var player = this.PLAYER_LIST[id];
        this.checkPlayerCollision(player);
    }
    for (var id in this.SHOOTING_SHARD_LIST) {
        var shard = this.SHOOTING_SHARD_LIST[id];
        this.checkShardCollision(shard);
    }
};


GameServer.prototype.updatePlayers = function () {
    for (var index in this.PLAYER_LIST) {
        var player = this.PLAYER_LIST[index];
        player.updatePosition();
        this.updatePlayersPacket.push({
            id: player.id,
            x: player.x,
            y: player.y
        });

        var socket = this.SOCKET_LIST[player.id];
        if (socket.timer !== 0) {
            socket.timer -= 1;
        }
        else if (socket.stage != 5) {
            //console.log("COMMENCING STAGE " + socket.stage);
            this.sendInitPackets(socket);
            socket.timer = 20;
        };
    }
};

GameServer.prototype.updateShards = function () {
    var id, shard;
    this.spawnShards();
    this.checkCollisions();

    for (id in this.PLAYER_SHARD_LIST) {
        shard = this.PLAYER_SHARD_LIST[id];
        shard.x = shard.owner.x + Arithmetic.getRandomInt(-5, 5);
        shard.y = shard.owner.y + Arithmetic.getRandomInt(-5, 5);

        if (shard.timer > 0) {
            shard.timer -= 1;
        }
        //update quad Tree
        shard.quadItem.bound = {
            minx: shard.x - shard.radius,
            miny: shard.y - shard.radius,
            maxx: shard.x + shard.radius,
            maxy: shard.y + shard.radius
        };
        this.shardTree.remove(shard.quadItem);
        this.shardTree.insert(shard.quadItem);

        this.updateShardsPacket.push({
            name: shard.name,
            id: shard.id,
            x: shard.x,
            y: shard.y
        });
    }

    for (id in this.SHOOTING_SHARD_LIST) {
        shard = this.SHOOTING_SHARD_LIST[id];

        shard.quadItem.bound = {
            minx: shard.x - shard.radius,
            miny: shard.y - shard.radius,
            maxx: shard.x + shard.radius,
            maxy: shard.y + shard.radius
        };
        this.shootingShardTree.remove(shard.quadItem);
        this.shootingShardTree.insert(shard.quadItem);

        if (shard.xVel !== 0) { 
	        shard.updatePosition();

	        this.updateShardsPacket.push({
	            name: shard.name,
	            id: shard.id,
	            x: shard.x,
	            y: shard.y
	        });
    	}
    	else {
    		this.removeShootingShard(shard, "LOCAL");
    		this.addStaticShard(shard);
    	}

    }

    for (id in this.HOME_SHARD_LIST) {
        shard = this.HOME_SHARD_LIST[id];
        shard.rotate();
        this.updateShardsPacket.push({
            name: shard.name,
            id: shard.id,
            x: shard.x,
            y: shard.y
        });
    }
};

GameServer.prototype.update = function () {
    this.updatePlayers();
    this.updateShards();

    for (var index in this.SOCKET_LIST) {
        var socket = this.SOCKET_LIST[index];

        socket.emit('addEntities',
            {
                'playerInfo': this.addPlayerPacket,
                'shardInfo': this.addShardPacket,
                'HQInfo': this.addHQPacket,
                'sentinelInfo': this.addSentinelPacket,
                'voiceInfo': this.addVoicePacket
            }); 

        socket.emit('updateEntities',
            {
                'playerInfo': this.updatePlayersPacket,
                'tileInfo': this.updateTilesPacket,
                'shardInfo': this.updateShardsPacket,
                'HQInfo': this.updateHQPacket,
                'sentinelInfo': this.updateSentinelsPacket
            });

        socket.emit('addEntities',
            {
                'UIInfo': this.addUIPacket
            });
        socket.emit('deleteEntities',
            {
                'playerInfo': this.deletePlayerPacket,
                'shardInfo': this.deleteShardPacket,
                'HQInfo': this.deleteHQPacket,
                'UIInfo': this.deleteUIPacket
            });
        socket.emit('drawScene', {});
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
    this.updateSentinelsPacket = [];

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

        var player = this.createPlayer(socket);

        socket.stage = 0;
        socket.timer = 20;
        this.sendInitPackets(socket);


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
                case "Z":
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
            var shard = this.HOME_SHARD_LIST[data.id];
            var HQ = shard.home;

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
    this.HOME_SHARD_LIST[shard.id] = shard;

    this.updateHQPacket.push(
        {
            id: HQ.id,
            supply: HQ.supply,
            shards: HQ.shards
        }
    );
};


GameServer.prototype.addSentinelShard = function (sentinel, shard) {
    sentinel.addShard(shard);
    this.HOME_SHARD_LIST[shard.id] = shard;

    this.updateSentinelsPacket.push(
        {
            id: sentinel.id,
            supply: sentinel.supply,
            shards: sentinel.shards
        }
    );
};

/** SERVER CREATION EVENTS **/
GameServer.prototype.createPlayer = function (socket) {
    var player = new Entity.Player(socket.id);
        this.PLAYER_LIST[socket.id] = player;
        this.addPlayerPacket.push({
            id: player.id,
            name: player.name,
            x: player.x,
            y: player.y
        });
    return player;
}

GameServer.prototype.createEmptyShard = function () {
    var id = Math.random();
    var shard = new Entity.Shard(
        Arithmetic.getRandomInt(entityConfig.BORDER_WIDTH, entityConfig.WIDTH-entityConfig.BORDER_WIDTH),
        Arithmetic.getRandomInt(entityConfig.BORDER_WIDTH, entityConfig.WIDTH-entityConfig.BORDER_WIDTH),
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
        this.hQTree.insert(headquarter.quadItem);
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
    if (tile !== null && tile.sentinel === null && 
    	player.shards.length >= 2) {

        var sentinel = new Entity.Sentinel(player, player.x, player.y);
	    for (var i = player.shards.length - 1; i>=0; i--) {
	    	var shard = this.PLAYER_SHARD_LIST[player.shards[i]];
	    	this.removePlayerShard(player,shard, "LOCAL");
	    	this.addSentinelShard(sentinel,shard);
	    }

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
    for (var i = player.shards.length - 1; i >= 0; i--) {
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
    this.hQTree.remove(HQ.quadItem);
    for (var i = HQ.shards.length - 1; i >= 0; i--) {
        var shard = this.HOME_SHARD_LIST[HQ.shards[i]];
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
    delete this.HOME_SHARD_LIST[shard.id];
};


/** SPECIAL METHODS **/
GameServer.prototype.resetPlayer = function (player) {
    for (var i = player.shards.length-1; i>=0; i--) {
        this.dropPlayerShard(player);
    }
    player.reset();

}

GameServer.prototype.sendInitPackets = function (socket) {
    var stage = socket.stage;
    if (stage === 0) {
        socket.emit('init', this.createMainInitPacket(socket.id));
    }
    if (stage === 1) {
        socket.emit('init', this.createTileInitPacket(socket.id, [0,entityConfig.TILES/4]));
    }
    if (stage === 2) {
        socket.emit('init', this.createTileInitPacket(socket.id, [entityConfig.TILES/4, entityConfig.TILES/2]));
    }
    if (stage === 3) {
        socket.emit('init', this.createTileInitPacket(socket.id,[entityConfig.TILES/2, entityConfig.TILES*3/4]));
    }
    if (stage === 4) {
        socket.emit('init', this.createTileInitPacket(socket.id,[entityConfig.TILES*3/4, entityConfig.TILES]));
    }
    socket.stage ++;
}

GameServer.prototype.dropPlayerShard = function (player) {
    if (player.getRandomShard()) {
        var shard = this.PLAYER_SHARD_LIST[player.getRandomShard()];
        this.removePlayerShard(player,shard,"LOCAL");
        this.addShootingShard(shard,
            Arithmetic.getRandomInt(-30,30),
            Arithmetic.getRandomInt(-30,30)
            );
    }
}


GameServer.prototype.dropHQShard = function (HQ) {
	if (HQ.getRandomShard()) {
		var shard = this.HOME_SHARD_LIST[HQ.getRandomShard()];
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