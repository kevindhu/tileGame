var Entity = require('./entity');
var QuadNode = require('./modules/QuadNode');
var PacketHandler = require('./PacketHandler');
const entityConfig = require('./entity/entityConfig');
const Arithmetic = require('./modules/Arithmetic');

function GameServer() {
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
    this.maxy = entityConfig.WIDTH - entityConfig.BORDER_WIDTH
    this.tileLength = (entityConfig.WIDTH - 2 * entityConfig.BORDER_WIDTH) /
        Math.sqrt(entityConfig.TILES);

    this.packetHandler = new PacketHandler(this);
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

            tile.addQuadItem();
            this.tileTree.insert(tile.quadItem);
            this.TILE_LIST[tile.id] = tile;
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

            var tile = this.getEntityTile(shard);
            tile.alert = true;
            this.packetHandler.updateTilesPackets(tile);

            this.removeShootingShard(shard, "GLOBAL");

            //damage the home
            this.decreaseHomeHealth(home, 1);
            this.dropHomeShard(home);
            var hq = home.owner.headquarter;
            if (hq !== home && hq.supply() > 0) {
                this.transferHomeShards(hq,home);
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
        if (player !== shard.owner && shard.timer === 0
            && player.emptyShard === null) {
            if (shard.owner === null) {
                this.removeStaticShard(shard, "LOCAL");
            } else {
                if (shard.name === null) {
                    this.packetHandler.deleteUIPackets(shard.owner.id,"name shard");
                }
                shard.owner.removeShard(shard);
            }
            if (shard.name === null) {
                this.packetHandler.deleteUIPackets(player.id,"home info");
                this.packetHandler.addUIPackets(player, null, "name shard");
            }
            this.addPlayerShard(player, shard);
        }
    }.bind(this));

    //player + shooting shard collision
    this.shootingShardTree.find(playerBound, function (shard) {
        if (shard.owner && player.faction !== shard.owner.faction) {
            this.removeShootingShard(shard, "GLOBAL");
            this.decreasePlayerHealth(player, 1);
        }
    }.bind(this));

    //player + home collision
    this.homeTree.find(playerBound, function (home) {
        if (player.faction === home.owner) {
            for (var i = player.shards.length - 1; i >= 0; i--) {
                var shard = this.PLAYER_SHARD_LIST[player.shards[i]];
                this.removePlayerShard(player, shard, "LOCAL");
                this.addHomeShard(home, shard);
            }
            if (player.pressingSpace) {
                if (player.timer > 0) {
                    return;
                }
                else {
                    player.timer = 100;
                }
                this.packetHandler.addUIPackets(player,home,"home info");
                player.timer -= 1;
            }
        }
    }.bind(this));


    //player + tower collision
    this.towerTree.find(playerBound, function (tower) {
        if (player.faction !== tower.owner) {
            //tower shoots at player
            this.shootTowerShard(tower, player);
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
        player.updatePosition();

        if (player.timer > 0) {
            player.timer -= 1;
        }

        var tile = this.getEntityTile(player);
        if (tile) {
            if (tile.owner === player.faction) {
                player.increaseHealth(0.1);
            }
            else if (tile.owner !== null) {
                this.decreasePlayerHealth(player, 0.1);
            }
        }

        this.packetHandler.updatePlayersPackets(player);

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
        shard.x = shard.owner.x ;//+ Arithmetic.getRandomInt(-5, 5);
        shard.y = shard.owner.y ;//+ Arithmetic.getRandomInt(-5, 5);

        if (shard.timer > 0) {
            shard.timer -= 1;
        }
        //update quad Tree
        shard.updateQuadItem();
        this.shardTree.remove(shard.quadItem);
        this.shardTree.insert(shard.quadItem);
        this.packetHandler.updateShardsPackets(shard);
    }

    for (id in this.SHOOTING_SHARD_LIST) {
        shard = this.SHOOTING_SHARD_LIST[id];

        shard.updateQuadItem();
        this.shootingShardTree.remove(shard.quadItem);
        this.shootingShardTree.insert(shard.quadItem);

        if (shard.xVel !== 0) {
            shard.updatePosition();
            this.packetHandler.updateShardsPackets(shard);
        }
        else {
            this.removeShootingShard(shard, "LOCAL");
            this.addStaticShard(shard);
        }

    }

    for (id in this.HOME_SHARD_LIST) {
        shard = this.HOME_SHARD_LIST[id];
        shard.rotate();
        this.packetHandler.updateShardsPackets(shard);
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
                this.setTileColor(tile, data.color);
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
                        this.createSentinel(player);
                    }
                    break;
                case "X":
                    if (data.state) {
                        this.createTower(player);
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
                this.removePlayerShard(player, shard, "LOCAL");
                shard.owner = player;
                this.addShootingShard(shard, data.x, data.y);
            }
        }.bind(this));

        socket.on('removeHomeShard', function (data) {
            var shard = this.HOME_SHARD_LIST[data.id];
            var HQ = shard.home;

            this.removeHomeShard(HQ, shard, "LOCAL");
            this.addPlayerShard(player, shard);

            this.packetHandler.addUIPackets(player,HQ,"home info");
            this.packetHandler.updateHomePackets(HQ);
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
GameServer.prototype.addStaticShard = function (shard) { //now is becomeStatic()
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

GameServer.prototype.addPlayerShard = function (player, shard) { //now just player.addShard()
    player.addShard(shard);
    this.PLAYER_SHARD_LIST[shard.id] = shard;
};

GameServer.prototype.addShootingShard = function (shard, xVel, yVel) { //now becomeShooting()
    shard.addVelocity(xVel, yVel);
    this.SHOOTING_SHARD_LIST[shard.id] = shard;
};

GameServer.prototype.addHomeShard = function (home, shard) { //now just home.addShard()
    home.addShard(shard);
    this.HOME_SHARD_LIST[shard.id] = shard;

    this.packetHandler.updateHomePackets(home);
};


/** SERVER CREATION EVENTS **/
GameServer.prototype.createPlayer = function (socket, info) { //now just faction.addPlayer()
    var faction = this.FACTION_LIST[info.faction];
    if (!faction) {
        faction = this.createFaction(info.faction);
    }

    var player = faction.addPlayer(socket.id, info.name);
    this.PLAYER_LIST[socket.id] = player;
    this.packetHandler.addPlayerPackets(player);
    return player;
};

GameServer.prototype.createEmptyShard = function () { //now just new Shard()
    var id = Math.random();
    var shard = new Entity.Shard(
        Arithmetic.getRandomInt(entityConfig.BORDER_WIDTH, entityConfig.WIDTH - entityConfig.BORDER_WIDTH),
        Arithmetic.getRandomInt(entityConfig.BORDER_WIDTH, entityConfig.WIDTH - entityConfig.BORDER_WIDTH),
        id
    );
    
    shard.addQuadItem();
    this.shardTree.insert(shard.quadItem);
    this.STATIC_SHARD_LIST[id] = shard;
    this.packetHandler.addShardPackets(shard);
    return shard;
};

GameServer.prototype.createHeadquarters = function (faction) { //now just faction.addHeadquarter()
    if (faction.headquarter === null) {
        var headquarter = new Entity.Headquarter(faction, faction.x, faction.y);
        var tile = this.getEntityTile(headquarter);
        tile.setHome(headquarter);

        this.HOME_LIST[headquarter.id] = headquarter;
        headquarter.addQuadItem();
        this.homeTree.insert(headquarter.quadItem);
        this.packetHandler.addHomePackets(headquarter);


        faction.headquarter = headquarter;
    }
};

GameServer.prototype.createSentinel = function (player) { //now just faction.addSentinel(player)
    var tile = this.getEntityTile(player);
    if (tile !== null && tile.home === null &&
        Math.abs(tile.x + tile.length / 2 - player.x) < (tile.length / 8) &&
        Math.abs(tile.y + tile.length / 2 - player.y) < (tile.length / 8) &&
        player.shards.length >= 2) {

        var sentinel = new Entity.Sentinel(player, tile.x + tile.length/2, 
            tile.y + tile.length/2);

        sentinel.addQuadItem();
        this.homeTree.insert(sentinel.quadItem);

        for (var i = player.shards.length - 1; i >= 0; i--) {
            var shard = this.PLAYER_SHARD_LIST[player.shards[i]];
            this.removePlayerShard(player, shard, "LOCAL");
            this.addHomeShard(sentinel, shard);
        }
        tile.setHome(sentinel);

        this.HOME_LIST[sentinel.id] = sentinel;
        this.packetHandler.addHomePackets(sentinel);
        this.packetHandler.updateTilesPackets(tile);
    }
};

GameServer.prototype.createTower = function (player) { //now just faction.addTower(player)
    var tile = this.getEntityTile(player);
    if (tile !== null &&
        tile.home !== null &&
        tile.owner === player.faction &&
        player.shards.length >= 2) {

        var tower = new Entity.Tower(player, player.x, player.y);
        tower.addQuadItem();
        tower.addBigQuadItem();
        this.homeTree.insert(tower.quadItem);
        this.towerTree.insert(tower.bigQuadItem);

        for (var i = player.shards.length - 1; i >= 0; i--) {
            var shard = this.PLAYER_SHARD_LIST[player.shards[i]];
            this.removePlayerShard(player, shard, "LOCAL");
            this.addHomeShard(tower, shard);
        }

        this.HOME_LIST[tower.id] = tower;
        this.packetHandler.addHomePackets(tower);
    }
}

GameServer.prototype.createFaction = function (name) { //now just new Faction(name)
    var tile = null;
    var coords = {};
    while (tile === null || tile.owner !== null) {
        coords['x'] = Arithmetic.getRandomInt(250,1000);
        coords['y'] = Arithmetic.getRandomInt(250,1000);
        tile = this.getEntityTile(coords);
    }
    coords['x'] = tile.x + tile.length/2;
    coords['y'] = tile.y + tile.length/2;

    var faction = new Entity.Faction(name, coords, this);

    this.createHeadquarters(faction);
    this.FACTION_LIST[faction.name] = faction;
    return faction;
};

/** SERVER REMOVE EVENTS **/
GameServer.prototype.removePlayer = function (player) {
    if (!player) {
        return;
    }
    for (var i = player.shards.length - 1; i >= 0; i--) {
        var shard = this.PLAYER_SHARD_LIST[player.shards[i]];
        this.removePlayerShard(player, shard, "GLOBAL");
    }
    if (player.emptyShard !== null) {
        this.removePlayerShard(player, player.emptyShard, "GLOBAL");
    }
    this.packetHandler.deletePlayerPackets(player.id);
    delete this.PLAYER_LIST[player.id];
};

GameServer.prototype.removeHome = function (home) {
    this.homeTree.remove(home.quadItem);
    for (var i = home.shards.length - 1; i >= 0; i--) {
        this.dropHomeShard(home);
    }

    this.packetHandler.deleteHomePackets(home.id);
    delete this.HOME_LIST[home.id];
};

GameServer.prototype.removeStaticShard = function (shard, status) {
    if (status === "GLOBAL") {
        this.packetHandler.deleteShardPackets(shard.id);
    }
    delete this.STATIC_SHARD_LIST[shard.id];
};

GameServer.prototype.removeShootingShard = function (shard, status) {
    this.shootingShardTree.remove(shard.quadItem);
    if (status === "GLOBAL") {
        this.packetHandler.deleteShardPackets(shard.id);
    }
    delete this.SHOOTING_SHARD_LIST[shard.id];
};

GameServer.prototype.removePlayerShard = function (player, shard, status) {
    player.removeShard(shard);
    this.shardTree.remove(shard.quadItem);

    if (status === "GLOBAL") {
        this.packetHandler.deleteShardPackets(shard.id);
    }
    delete this.PLAYER_SHARD_LIST[shard.id];
};

GameServer.prototype.removeHomeShard = function (home, shard, status) {
    home.removeShard(shard);

    if (status === "GLOBAL") {
        this.packetHandler.deleteShardPackets(shard.id);
    }
    else {
        this.packetHandler.updateHomePackets(home);
    }

    delete this.HOME_SHARD_LIST[shard.id];
};


/** SPECIAL METHODS **/
GameServer.prototype.shootTowerShard = function (tower, player) {
    if (tower.getSupply() > 0) {
        var shard = this.HOME_SHARD_LIST[tower.getRandomShard()];
        this.removeHomeShard(tower, shard, "LOCAL");
        shard.owner = this.PLAYER_LIST[tower.owner.getRandomPlayer()];
        this.addShootingShard(shard, (player.x - tower.x) / 4, (player.y - tower.y) / 4);
    }
    this.packetHandler.updateHomePackets(tower);
}


GameServer.prototype.resetPlayer = function (player) {
    for (var i = player.shards.length; i >= 0; i--) {
        this.dropPlayerShard(player);
    }
    player.reset();
};

GameServer.prototype.decreasePlayerHealth = function (player, amount) {
    if (!amount) {
        throw "NO AMOUNT SPECIFIED";
    }
    player.decreaseHealth(amount);
    if (player.health <= 0) {
        this.resetPlayer(player);
    }
    this.packetHandler.updatePlayersPackets(player);
};

GameServer.prototype.decreaseHomeHealth = function (home, amount) {
    home.decreaseHealth(amount);
    if (home.health <= 0) {
        this.removeHome(home);
    }
    this.packetHandler.updateHomePackets(home);
};

GameServer.prototype.dropPlayerShard = function (player) {
    if (player.getRandomShard()) {
        var shard = this.PLAYER_SHARD_LIST[player.getRandomShard()];
    }
    else if (player.emptyShard) {
        var shard = player.emptyShard;
        this.packetHandler.deleteUIPackets(shard.owner.id,"name shard");
    }
    else {
        return;
    }
    this.removePlayerShard(player, shard, "LOCAL");
    this.addShootingShard(shard,
        Arithmetic.getRandomInt(-30, 30),
        Arithmetic.getRandomInt(-30, 30)
    );
};

GameServer.prototype.dropHomeShard = function (home) {
    if (home.getRandomShard())   {
        var shard = this.HOME_SHARD_LIST[home.getRandomShard()];
        this.removeHomeShard(home, shard, "LOCAL");
        this.addShootingShard(shard,
            Arithmetic.getRandomInt(-30, 30),
            Arithmetic.getRandomInt(-30, 30)
        );
    }
};

GameServer.prototype.transferHomeShards = function (h1, h2) {
    var shard = this.HOME_SHARD_LIST[h1.getRandomShard()];
    this.removeHomeShard(h1,shard,"LOCAL");
    this.addHomeShard(h2,shard);
};

GameServer.prototype.setTileColor = function (tile, color) {
    if (color !== "" && color !== undefined && color !== null) {
        console.log(tile.id + " is being colored " + color);
        tile.setColor(color);
        this.packetHandler.updateTilesPackets(tile);
    }
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
