var Entity = require('./entity');
var QuadNode = require('./modules/QuadNode');
var PacketHandler = require('./PacketHandler');
const entityConfig = require('./entity/entityConfig');
const Arithmetic = require('./modules/Arithmetic');

function GameServer() {
    this.packetHandler = new PacketHandler(this);

    this.TILE_LIST = {};
    this.SOCKET_LIST = {};
    this.PLAYER_LIST = {};
    this.FACTION_LIST = {};
    this.HOME_LIST = {};

    this.STATIC_SHARD_LIST = {};
    this.SHOOTING_SHARD_LIST = {};
    this.PLAYER_SHARD_LIST = {};
    this.HOME_SHARD_LIST = {};

    this.shardTree = null;
    this.homeTree = null;
    this.tileTree = null;
    this.towerTree = null;

    this.minx = entityConfig.BORDER_WIDTH;
    this.miny = entityConfig.BORDER_WIDTH;
    this.maxx = entityConfig.WIDTH - entityConfig.BORDER_WIDTH;
    this.maxy = entityConfig.WIDTH - entityConfig.BORDER_WIDTH;

    this.tileLength = (entityConfig.WIDTH - 2 * entityConfig.BORDER_WIDTH) /
        Math.sqrt(entityConfig.TILES);
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
                entityConfig.BORDER_WIDTH + this.tileLength * j, this);
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

GameServer.prototype.initHomes = function () {
    this.homeTree = new QuadNode({
        minx: this.minx,
        miny: this.miny,
        maxx: this.maxx,
        maxy: this.maxy
    });
};

GameServer.prototype.initTowers = function () {
    this.towerTree = new QuadNode({
        minx: this.minx,
        miny: this.miny,
        maxx: this.maxx,
        maxy: this.maxy
    });
};

/** UPDATE METHODS **/
GameServer.prototype.spawnShards = function () {
    if (Object.size(this.STATIC_SHARD_LIST) < entityConfig.SHARDS) {
        this.createEmptyShard();
    }
};

GameServer.prototype.getEntityTile = function (entity) {
    var entityBound = {
        minx: entity.x - entityConfig.SHARD_WIDTH,
        miny: entity.y - entityConfig.SHARD_WIDTH,
        maxx: entity.x + entityConfig.SHARD_WIDTH,
        maxy: entity.y + entityConfig.SHARD_WIDTH
    };
    var ret = null;

    this.tileTree.find(entityBound, function (tile) {
        ret = tile;
    }.bind(this));
    return ret;

};

GameServer.prototype.checkShardCollision = function (shard) {
    var shardBound = {
        minx: shard.x - entityConfig.SHARD_WIDTH,
        miny: shard.y - entityConfig.SHARD_WIDTH,
        maxx: shard.x + entityConfig.SHARD_WIDTH,
        maxy: shard.y + entityConfig.SHARD_WIDTH
    };

    //shard + home collision
    this.homeTree.find(shardBound, function (home) {
        if (shard.owner && shard.owner.faction !== home.owner) {
            shard.onDelete();

            //damage the home
            home.decreaseHealth(1);
            home.dropShard();
            var hq = home.owner.headquarter;
            if (hq !== home && hq.getSupply() > 0) {
                hq.giveShard(home);
            }
        }
    }.bind(this));
};

GameServer.prototype.checkPlayerCollision = function (player) {
    var playerBound = {
        minx: player.x - entityConfig.SHARD_WIDTH,
        miny: player.y - entityConfig.SHARD_WIDTH,
        maxx: player.x + entityConfig.SHARD_WIDTH,
        maxy: player.y + entityConfig.SHARD_WIDTH
    };

    //player + static shard collision
    this.shardTree.find(playerBound, function (shard) {
        if (player !== shard.owner && shard.timer === 0 &&
         player.emptyShard === null) {


            if (shard.owner !== null) {
                if (shard.name === null) {  
                    this.packetHandler.deleteUIPackets(shard.owner.id,"name shard");
                }
                shard.owner.removeShard(shard);
            }
            if (shard.name === null) {
                this.packetHandler.deleteUIPackets(player.id,"home info");
                this.packetHandler.addUIPackets(player, null, "name shard");
            }
            player.addShard(shard);
        }
    }.bind(this));

    //player + shooting shard collision
    this.shootingShardTree.find(playerBound, function (shard) {
        if (shard.owner && player.faction !== shard.owner.faction) {
            shard.onDelete();
            player.decreaseHealth(1);
        }
    }.bind(this));

    //player + home collision
    this.homeTree.find(playerBound, function (home) {
        if (player.faction === home.owner) {
            for (var i = player.shards.length - 1; i >= 0; i--) {
                var shard = this.PLAYER_SHARD_LIST[player.shards[i]];
                player.removeShard(shard);
                home.addShard(shard);
            }
            if (player.pressingSpace) {
                if (player.timer > 0) {
                    player.timer -= 1;
                    return;
                }
                else {
                    player.timer = 15;
                }
                this.packetHandler.addUIPackets(player,home,"home info");
            }
        }
    }.bind(this));


    //player + tower collision
    this.towerTree.find(playerBound, function (tower) {
        if (player.faction !== tower.owner) {
            //tower shoots at player
            tower.shootShard(player);
        }
    }.bind(this));
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
        player.update();

        //TODO: GHETTO CODE - PLEASE CHANGE SOON
        var socket = this.SOCKET_LIST[player.id];
        if (socket.timer !== 0) {
            socket.timer -= 1;
        }
        else if (socket.stage !== 5) {
            this.packetHandler.sendInitPackets(socket);
            socket.timer = 20;
        }
    }
};

GameServer.prototype.updateShards = function () {
    var id, shard;
    this.spawnShards();
    this.checkCollisions();

    for (id in this.PLAYER_SHARD_LIST) {
        shard = this.PLAYER_SHARD_LIST[id];
        shard.updatePosition();
    }

    for (id in this.SHOOTING_SHARD_LIST) {
        shard = this.SHOOTING_SHARD_LIST[id];
        shard.updatePosition();
    }

    for (id in this.HOME_SHARD_LIST) {
        shard = this.HOME_SHARD_LIST[id];
        shard.updatePosition();
    }
};

GameServer.prototype.update = function () {
    this.updatePlayers();
    this.updateShards();
    this.packetHandler.sendPackets();
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
    this.initHomes();
    this.initTowers();

    /** START WEBSOCKET SERVICE **/
    var io = require('socket.io')(server, {});

    io.sockets.on('connection', function (socket) {
        var player; 

        socket.id = Math.random();
        this.SOCKET_LIST[socket.id] = socket;
        console.log("Client #" + socket.id + " has joined the server");

        socket.stage = 0;
        socket.timer = 20;
        this.packetHandler.sendInitPackets(socket);
        socket.on('newPlayer', function (data) {
            player = this.createPlayer(socket, data);
        }.bind(this));

        socket.on('newColor', function (data) {
            home = this.HOME_LIST[data.home];
            if (home.level < 2 && home.hasColor === true) { //prevent cheating
                return;
            }

            var tile = this.getEntityTile(home);
            if (tile.owner) {
                tile.setColor(data.color);
                home.hasColor = true;
                this.packetHandler.updateHomePackets(home);
            }
        }.bind(this));

        socket.on('keyEvent', function x(data) {
            if (!player) {
                return;
            }
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
                    break;
                case "Z":
                    if (data.state) {
                        player.faction.addSentinel(player);
                    }
                    break;
                case "X":
                    if (data.state) {
                        player.faction.addTower(player);
                    }
            }
        }.bind(this));

        socket.on('textInput', function (data) {
            if (player) {
                player.transformEmptyShard(data.word);
            }
        }.bind(this));


        socket.on("arrowVector", function (data) {
            if (!player) {
                return;
            }
            if (player.getRandomShard()) {
                var shard = this.PLAYER_SHARD_LIST[player.getRandomShard()];
                player.removeShard(shard);
                shard.owner = player;
                shard.becomeShooting(player, data.x, data.y);
            }
        }.bind(this));

        socket.on('removeHomeShard', function (data) {
            var shard = this.HOME_SHARD_LIST[data.id];
            var HQ = shard.home;

            HQ.removeShard(shard);
            player.addShard(shard);
            this.packetHandler.addUIPackets(player,HQ,"home info");
        }.bind(this));

        socket.on('disconnect', function () {
            console.log("Client #" + socket.id + " has left the server");
            if (player) {
                player.onDelete();
            }
            delete this.SOCKET_LIST[socket.id];
        }.bind(this));
    }.bind(this));

    /** START MAIN LOOP **/
    setInterval(this.update.bind(this), 1000 / 25);
};



/** SERVER CREATION EVENTS **/
GameServer.prototype.createPlayer = function (socket, info) {
    var faction = this.FACTION_LIST[info.faction];
    if (!faction) {
        faction = new Entity.Faction(info.faction, this);
    }

    var player = faction.addPlayer(socket.id, info.name);
    return player;
};

GameServer.prototype.createEmptyShard = function () {
    var shard = new Entity.Shard(
        Arithmetic.getRandomInt(entityConfig.BORDER_WIDTH, entityConfig.WIDTH - entityConfig.BORDER_WIDTH),
        Arithmetic.getRandomInt(entityConfig.BORDER_WIDTH, entityConfig.WIDTH - entityConfig.BORDER_WIDTH),
        this
    );
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
