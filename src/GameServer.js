var Entity = require('./entity');
var QuadNode = require('./modules/QuadNode');
var Chunk = require('./Chunk');
var PacketHandler = require('./PacketHandler');
const entityConfig = require('./entity/entityConfig');
const Arithmetic = require('./modules/Arithmetic');
const PORT = process.env.PORT || 2000;

function GameServer() {
    this.packetHandler = new PacketHandler(this);
    this.CHUNKS = {};

    this.SOCKET_LIST = {};
    this.INIT_SOCKET_LIST = {};

    this.CONTROLLER_LIST = {};

    this.STATIC_SHARD_LIST = {};
    this.SHOOTING_SHARD_LIST = {};
    this.PLAYER_SHARD_LIST = {};
    this.HOME_SHARD_LIST = {};

    this.FACTION_LIST = {};
    this.TILE_LIST = {};
    this.HOME_LIST = {};
    this.LASER_LIST = {};

    //these are all updaters (updated every tick of server loop until deleted)
    this.QUEUE_LIST = {};

    this.controllerTree = null;
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
    this.startTime = Date.now();
}

/** SERVER INIT METHODS **/
GameServer.prototype.initChunks = function () {
    for (var i = 0; i < entityConfig.CHUNKS; i++) {
        this.CHUNKS[i] = new Chunk(i, this);
    }
};

GameServer.prototype.initTiles = function () {
    this.tileTree = new QuadNode({
        minx: this.minx,
        miny: this.miny,
        maxx: this.maxx,
        maxy: this.maxy
    });
    for (var i = 0; i < Math.sqrt(entityConfig.TILES); i++) {
        for (var j = 0; j < Math.sqrt(entityConfig.TILES); j++) {
            new Entity.Tile(entityConfig.BORDER_WIDTH + this.tileLength * i,
                entityConfig.BORDER_WIDTH + this.tileLength * j, this);
        }
    }
};

GameServer.prototype.initControllers = function () {
    this.controllerTree = new QuadNode({
        minx: this.minx,
        miny: this.miny,
        maxx: this.maxx,
        maxy: this.maxy
    });
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

GameServer.prototype.initNewClients = function () {
    for (var id in this.INIT_SOCKET_LIST) {
        var socket = this.SOCKET_LIST[id];
        if (!socket) {
            delete this.INIT_SOCKET_LIST[id];
        }

        if (!socket.verified) { //verify new client socket
            socket.life -= 1;
            if (socket.life === 0) {
                console.log("DETECTED ROGUE CLIENT!");
                socket.disconnect();
            }
        }

        if (!socket.player) {
            return;
        }

        if (socket.timer !== 0) {
            socket.timer -= 1;
        }
        else if (socket.stage <= 8) {
            var rowLength = Math.sqrt(entityConfig.CHUNKS);
            var chunk = socket.player.chunk;
            var xIndex = socket.stage % 3 - 1;
            var yIndex = Math.floor(socket.stage / 3) - 1;

            while (!(chunk % rowLength + xIndex).between(0, rowLength - 1) ||
            !(Math.floor(chunk / rowLength) + yIndex).between(0, rowLength - 1)) {
                socket.stage++;
                if (socket.stage > 8) {
                    return;
                }
                xIndex = socket.stage % 3 - 1;
                yIndex = Math.floor(socket.stage / 3) - 1;
            }
            chunk += xIndex + rowLength * yIndex;
            this.packetHandler.sendChunkInitPackets(socket, chunk);
            socket.timer = 2;
            socket.stage++;
        }
        else {
            delete this.INIT_SOCKET_LIST[id];
        }
    }
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
        if (home.faction === shard.faction) {
            if (shard.owner) { //is shot by player
                home.addShard(shard);
            }
        }
        else if (shard.faction) { //not the same faction
            shard.onDelete();
            home.decreaseHealth(1);
        }
    }.bind(this));
};

GameServer.prototype.checkControllerCollision = function (controller) {
    var controllerBound = {
        minx: controller.x - controller.radius,
        miny: controller.y - controller.radius,
        maxx: controller.x + controller.radius,
        maxy: controller.y + controller.radius
    };

    if (controller.type === "Player") {
        //player + static/player shard collision
        this.shardTree.find(controllerBound, function (shard) {
            if (controller.faction !== shard.faction && shard.timer <= 0) {
                //if shard already owned
                if (shard.owner !== null) {
                    var oldOwner = this.CONTROLLER_LIST[shard.owner];
                    oldOwner.removeShard(shard);
                }
                var home = this.HOME_LIST[controller.viewing];
                if (home) {
                    home.removeViewer(controller);
                }
                controller.addShard(shard);
            }
        }.bind(this));


        if (controller.type === "Player") {
            var homeCheck = null;
            this.homeTree.find(controllerBound, function (home) {
                homeCheck = home;
                if (controller.faction === home.faction && !controller.viewing) {
                    for (var i = controller.shards.length - 1; i >= 0; i--) {
                        var shard = this.PLAYER_SHARD_LIST[controller.shards[i]];
                        controller.removeShard(shard);
                        home.addShard(shard);
                    }
                    if (controller.pressingSpace) {
                        home.addViewer(controller);
                        controller.removeHomePrompt();
                    } else {
                        controller.addHomePrompt();
                    }
                }
            }.bind(this));
            if (!homeCheck) {
                controller.removeHomePrompt();
            }
        }
    }

    //controller + shooting shard collision
    this.shootingShardTree.find(controllerBound, function (shard) {
        if (controller.faction !== shard.faction) {
            shard.onDelete();
            controller.decreaseHealth(1);
        }
    }.bind(this));

    //controller + tower collision
    this.towerTree.find(controllerBound, function (tower) {
        if (controller.faction !== tower.faction) {
            tower.shootShard(controller);
        }
    }.bind(this));
};

GameServer.prototype.checkCollisions = function () {
    var id;
    for (id in this.CONTROLLER_LIST) {
        var controller = this.CONTROLLER_LIST[id];
        this.checkControllerCollision(controller);
    }
    for (id in this.SHOOTING_SHARD_LIST) {
        var shard = this.SHOOTING_SHARD_LIST[id];
        this.checkShardCollision(shard);
    }
};

GameServer.prototype.updateControllers = function () {
    for (var id in this.CONTROLLER_LIST) {
        var controller = this.CONTROLLER_LIST[id];
        controller.update();
    }
};

GameServer.prototype.updateProjectiles = function () {
    this.updateShards();
    this.updateLasers();
};

GameServer.prototype.updateQueues = function () {
    for (var id in this.QUEUE_LIST) {
        var home = this.QUEUE_LIST[id];
        home.updateQueue();
    }
};


GameServer.prototype.updateShards = function () {
    var id, shard;
    //this.spawnShards();
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

GameServer.prototype.updateLasers = function () {
    var laser, id;
    for (id in this.LASER_LIST) {
        laser = this.LASER_LIST[id];
        laser.update();
    }
};

GameServer.prototype.update = function () {
    this.timeStamp = Date.now();
    this.initNewClients();
    this.updateControllers();
    this.updateProjectiles();
    this.updateQueues();
    this.packetHandler.sendPackets();
};

/** SERVER CREATION EVENTS **/
GameServer.prototype.start = function () {
    var express = require("express");
    var app = express();
    var server = require('http').Server(app);

    /** INIT PORT CONNECTION **/
    app.get('/', function (req, res) {
        res.sendFile(__dirname + '/client/index.html');
    });
    app.use('/', express.static(__dirname + '/client'));

    server.listen(PORT);
    console.log('Started Server!');

    /** INIT SERVER OBJECTS **/
    this.initChunks();
    this.initTiles();
    this.initShards();
    this.initControllers();
    this.initHomes();
    this.initTowers();

    /** START WEBSOCKET SERVICE **/
    var io = require('socket.io')(server, {});

    io.sockets.on('connection', function (socket) {
        var player;
        socket.id = Math.random();
        socket.timer = 0;
        socket.life = 10;
        socket.verified = false;
        socket.stage = 0;

        this.SOCKET_LIST[socket.id] = socket;
        this.INIT_SOCKET_LIST[socket.id] = socket;
        this.packetHandler.sendInitPackets(socket);

        console.log("Client #" + socket.id + " has joined the server");

        socket.on("verify", function (data) {
            if (!socket.verified) {
                console.log("Verified Client #" + socket.id);
            }
            socket.verified = true;
        }.bind(this));

        socket.on('newPlayer', function (data) {
            player = this.createPlayer(socket, data);
            socket.player = player;
            this.packetHandler.addChatPackets("SERVER", player.name + " has connected!");
        }.bind(this));

        socket.on('chatMessage', function (data) {
            var player = this.CONTROLLER_LIST[data.id];

            if (player) {
                this.packetHandler.addChatPackets(player.name, data.message);
            }
        }.bind(this));

        socket.on('newColor', function (data) {
            var home = this.HOME_LIST[data.home];
            if (home.level < 2 && home.hasColor === true) { //prevent cheating
                return;
            }

            var tile = this.getEntityTile(home);
            if (tile.faction) {
                tile.setColor(data.color);
                home.hasColor = true;
                this.packetHandler.updateHomePackets(home);
            }
        }.bind(this));

        socket.on('keyEvent', function (data) {
            if (!player) {
                return;
            }
            var faction = this.FACTION_LIST[player.faction];
            switch (data.id) {
                case 39:
                case 68:
                    player.pressingRight = data.state;
                    break;
                case 40:
                case 83:
                    player.pressingDown = data.state;
                    break;
                case 37:
                case 65:
                    player.pressingLeft = data.state;
                    break;
                case 38:
                case 87:
                    player.pressingUp = data.state;
                    break;
                case 32:
                    player.pressingSpace = data.state;
                    break;
                case 90: //z
                    if (data.state) {
                        faction.addSentinel(player);
                    }
                    break;
                case 88: //x
                    if (data.state) {
                        faction.addTower(player);
                    }
                    break;
                case 78: //n
                    if (data.state) {
                        faction.addBarracks(player);
                    }
                    break;
                case 86: //v
                    if (data.state) {
                        player.groupBots();
                    }
                    break;
                case 66: //b
                    if (data.state) {
                        player.attemptBoost();
                    }
                    break;
                case 80: //p
                    if (data.state) {
                        player.attemptStealth();
                    }
                    break;


            }

        }.bind(this));

        socket.on('textInput', function (data) {
            if (player) {
                player.addShardNamer(data.word);
            }
        }.bind(this));

        socket.on('removeViewer', function (data) {
            if (player && player.viewing) {
                var home = this.HOME_LIST[player.viewing];
                if (home) {
                    home.removeViewer(player);
                }
            }
        }.bind(this));

        socket.on("botCommand", function (data) {
            if (!player) {
                return;
            }
            player.moveBots(data.x, data.y);
        }.bind(this));

        socket.on("selectBots", function (data) {
            if (!player) {
                return;
            }
            player.resetSelect();
            var boundary = player.createBoundary(data);
            this.findBots(boundary);
        }.bind(this));

        socket.on('makeBots', function (data) {
            var barracks = this.HOME_LIST[data.home];
            var shard;
            for (var id in data.shards) {
                shard = this.HOME_SHARD_LIST[id];
                if (shard) {
                    barracks.startBot(data.botType, player, shard);
                }
            }
        }.bind(this));

        socket.on('buildHome', function (data) {
            var home = this.HOME_LIST[data.home];
            var shard;
            for (var id in data.shards) {
                shard = this.HOME_SHARD_LIST[id];
                if (shard) {
                    home.buildBase(shard);
                }
            }
        }.bind(this));

        socket.on('upgradeUnit', function (data) {
            var barracks = this.HOME_LIST[data.home];
            barracks.upgradeUnit(data);
        }.bind(this));

        socket.on('disconnect', function () {
            console.log("Client #" + socket.id + " has left the server");
            if (player) {
                player.onDelete();
            }
            delete this.SOCKET_LIST[socket.id];
            delete this.INIT_SOCKET_LIST[socket.id];
        }.bind(this));
    }.bind(this));

    /** START MAIN LOOP **/
    setInterval(this.update.bind(this), 1000 / 25);
};

GameServer.prototype.createPlayer = function (socket, info) {
    var checkName = function (name) {
        if (name === null || name === "") {
            return "default faction"
        }
        return name;
    };

    info.faction = checkName(info.faction);
    var faction = this.FACTION_LIST[info.faction];
    if (!faction) {
        faction = new Entity.Faction(info.faction, this);
    }

    return faction.addPlayer(socket.id, info.name);
};

GameServer.prototype.createEmptyShard = function () {
    return new Entity.Shard(
        Arithmetic.getRandomInt(entityConfig.BORDER_WIDTH, entityConfig.WIDTH - entityConfig.BORDER_WIDTH),
        Arithmetic.getRandomInt(entityConfig.BORDER_WIDTH, entityConfig.WIDTH - entityConfig.BORDER_WIDTH),
        this
    );
};

/** MISC METHODS **/
GameServer.prototype.findBots = function (boundary) {
    this.controllerTree.find(boundary, function (controller) {
        if (controller.type === "Bot" && controller.owner === boundary.player) {
            var player = this.CONTROLLER_LIST[boundary.player];
            player.selectBot(controller);
        }
    }.bind(this));
};

Object.size = function (obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

Number.prototype.between = function (min, max) {
    return this >= min && this <= max;
};

module.exports = GameServer;
