const entityConfig = require('./entity/entityConfig');
const Arithmetic = require('./modules/Arithmetic');
function PacketHandler(gameServer) {
    this.gameServer = gameServer;
    this.CHUNK_PACKETS = {};
    this.masterPacket = [];
    this.initChunkPackets();
}

PacketHandler.prototype.initChunkPackets = function () {
    for (var i = 0; i < entityConfig.CHUNKS; i++) {
        this.CHUNK_PACKETS[i] = [];
    }
};

PacketHandler.prototype.sendInitPackets = function (socket) {
    socket.emit('addFactionsUI', this.addFactionsUIPacket()); //make more streamlined?
};

//TODO: optimize this with addUIPacket to make it cleaner
PacketHandler.prototype.addFactionsUIPacket = function () {
    var factionsPacket = [];
    for (var i in this.gameServer.FACTION_LIST) {
        factionsPacket.push(i);
    }
    return {factions: factionsPacket};
};

PacketHandler.prototype.sendChunkInitPackets = function (socket, chunk) {
    socket.emit('updateEntities', this.createChunkPacket(chunk, socket.id));
};


PacketHandler.prototype.createChunkPacket = function (chunk, id) {
    var initPacket = [];
    var populate = function (list, call) {
        var count = 0;
        for (var i in list) {
            var entity = list[i];
            initPacket.push(call(entity, true));
            count++;
        }
    };

    populate(this.gameServer.CHUNKS[chunk].CONTROLLER_LIST, this.addControllerPackets);

    populate(this.gameServer.CHUNKS[chunk].HOME_SHARD_LIST, this.addShardPackets);
    populate(this.gameServer.CHUNKS[chunk].PLAYER_SHARD_LIST, this.addShardPackets);
    populate(this.gameServer.CHUNKS[chunk].STATIC_SHARD_LIST, this.addShardPackets);

    populate(this.gameServer.CHUNKS[chunk].TILE_LIST, this.addTilePackets);
    populate(this.gameServer.CHUNKS[chunk].HOME_LIST, this.addHomePackets);
    populate(this.gameServer.CHUNKS[chunk].FACTION_LIST, this.addFactionPackets);

    if (id) {
        initPacket.push({
            master: "add",
            class: "selfId",
            selfId: id
        });
    }
    return initPacket;

};


PacketHandler.prototype.addShardAnimationPackets = function (shard) {
    this.CHUNK_PACKETS[shard.chunk].push(
        {
            master: "add",
            class: "animationInfo",
            type: "shardDeath",
            id: shard.id,
            name: shard.name,
            x: shard.x,
            y: shard.y
        })
};

PacketHandler.prototype.removeHomeAnimationPackets = function (home) {
    this.CHUNK_PACKETS[home.chunk].push(
        {
            master: "delete",
            class: "animationInfo",
            type: "removeShard",
            id: home.id,
            name: null,
            x: null,
            y: null
        });
};

PacketHandler.prototype.addHomeAnimationPackets = function (home) {
    this.CHUNK_PACKETS[home.chunk].push(
        {
            master: "add",
            class: "animationInfo",
            type: "addShard",
            id: home.id,
            name: null,
            x: null,
            y: null
        });
};

PacketHandler.prototype.addBracketPackets = function (player, tile) {
    this.CHUNK_PACKETS[tile.chunk].push({
        master: "add",
        class: "bracketInfo",
        playerId: player.id,
        tileId: tile.id
    })
};

PacketHandler.prototype.addUIPackets = function (player, home, action) {
    var homeId;
    if (home === null) {
        homeId = null;
    }
    else {
        homeId = home.id;
    }

    this.CHUNK_PACKETS[player.chunk].push(
        {
            master: "add",
            class: "UIInfo",
            playerId: player.id,
            homeId: homeId,
            action: action
        });
};


PacketHandler.prototype.addControllerPackets = function (controller, ifInit) {
    var info = {
        master: "add",
        class: "controllerInfo",
        owner: controller.owner,
        id: controller.id,
        type: controller.type,
        name: controller.name,
        x: controller.x,
        y: controller.y,
        health: controller.health,
        selected: controller.selected,
        theta: controller.theta
    };
    if (ifInit) {
        return info;
    }
    else {
        this.CHUNK_PACKETS[controller.chunk].push(info);
    }
};

PacketHandler.prototype.addFactionPackets = function (faction, ifInit) {
    var info = {
        master: "add",
        class: "factionInfo",
        id: faction.id,
        name: faction.name,
        x: faction.x,
        y: faction.y,
        size: faction.homes.length
    };
    if (ifInit) {
        return info;
    }
    else {
        this.CHUNK_PACKETS[faction.chunk].push(info);
    }
};

PacketHandler.prototype.addShardPackets = function (shard, ifInit) {
    var info = {
        master: "add",
        class: "shardInfo",
        id: shard.id,
        x: shard.x,
        y: shard.y,
        name: null,
        visible: true
    };
    if (ifInit) {
        return info;
    }
    else {
        this.CHUNK_PACKETS[shard.chunk].push(info);
    }
};

PacketHandler.prototype.addTilePackets = function (tile, ifInit) {
    return {
        master: "add",
        class: "tileInfo",
        id: tile.id,
        x: tile.x,
        y: tile.y,
        color: tile.color,
        length: tile.length,
        alert: tile.alert
    };
};

PacketHandler.prototype.addLaserPackets = function (laser, ifInit) {
    this.CHUNK_PACKETS[laser.chunk].push({
        master: "add",
        class: "laserInfo",
        id: laser.id,
        owner: laser.owner,
        target: laser.target
    });
};


PacketHandler.prototype.addHomePackets = function (home, ifInit) {
    var info = {
        master: "add",
        class: "homeInfo",
        id: home.id,
        owner: home.faction.name,
        x: home.x,
        y: home.y,
        type: home.type,
        radius: home.radius,
        shards: home.shards,
        level: home.level,
        hasColor: home.hasColor,
        health: home.health,
        neighbors: home.neighbors
    };
    if (ifInit) {
        return info;
    }
    else {
        this.CHUNK_PACKETS[home.chunk].push(info);
    }
};


PacketHandler.prototype.updateHomePackets = function (home) {
    this.CHUNK_PACKETS[home.chunk].push(
        {
            master: "update",
            class: "homeInfo",
            id: home.id,
            shards: home.shards,
            level: home.level,
            radius: home.radius,
            hasColor: home.hasColor,
            health: home.health,
            neighbors: home.neighbors
        }
    );
};

PacketHandler.prototype.updateFactionPackets = function (faction) {
    this.CHUNK_PACKETS[faction.chunk].push({
        master: "update",
        class: "factionInfo",
        id: faction.id,
        x: faction.x,
        y: faction.y,
        size: faction.homes.length
    });
};

PacketHandler.prototype.updateTilesPackets = function (tile) {
    this.CHUNK_PACKETS[tile.chunk].push({
        master: "update",
        class: "tileInfo",
        id: tile.id,
        color: tile.color,
        alert: tile.alert
    });
};

PacketHandler.prototype.updateControllersPackets = function (controller) {
    this.CHUNK_PACKETS[controller.chunk].push({
        master: "update",
        class: "controllerInfo",
        id: controller.id,
        x: controller.x,
        y: controller.y,
        health: controller.health,
        selected: controller.selected,
        theta: controller.theta
    });
};

PacketHandler.prototype.updateShardsPackets = function (shard) {
    this.CHUNK_PACKETS[shard.chunk].push({
        master: "update",
        class: "shardInfo",
        name: shard.name,
        id: shard.id,
        x: shard.x,
        y: shard.y,
        visible: shard.visible
    });
};

PacketHandler.prototype.deleteUIPackets = function (player, action) {
    if (!player.id) {
        var meme = player.id.sdf;
    }
    this.CHUNK_PACKETS[player.chunk].push({
        master: "delete",
        class: "UIInfo",
        id: player.id,
        action: action
    });
};

PacketHandler.prototype.deleteBracketPackets = function (player) {
    this.CHUNK_PACKETS[player.chunk].push({
        master: "delete",
        class: "bracketInfo",
        id: player.id
    });
};

PacketHandler.prototype.deleteControllerPackets = function (controller) {
    this.CHUNK_PACKETS[controller.chunk].push({
        master: "delete",
        class: "controllerInfo",
        id: controller.id
    });
};

PacketHandler.prototype.deleteLaserPackets = function (laser) {
    this.CHUNK_PACKETS[laser.chunk].push({
        master: "delete",
        class: "laserInfo",
        id: laser.id
    });
};

PacketHandler.prototype.deleteFactionPackets = function (faction) {
    this.CHUNK_PACKETS[faction.chunk].push({
        master: "delete",
        class: "factionInfo",
        id: faction.id
    });
};

PacketHandler.prototype.deleteHomePackets = function (home) {
    this.CHUNK_PACKETS[home.chunk].push({
        master: "delete",
        class: "homeInfo",
        id: home.id
    });
};

PacketHandler.prototype.deleteShardPackets = function (shard) {
    this.CHUNK_PACKETS[shard.chunk].push({
        master: "delete",
        class: "shardInfo",
        id: shard.id
    });
};


PacketHandler.prototype.sendPackets = function () {
    for (var index in this.gameServer.SOCKET_LIST) {
        var socket = this.gameServer.SOCKET_LIST[index];
        if (socket.player) {
            var chunks = this.findChunks(socket);
            for (var i = 0; i < chunks.length; i++) {
                var packet = this.CHUNK_PACKETS[chunks[i]];
                socket.emit('updateEntities', packet);
            }
            socket.emit('drawScene', {});
        }
    }
    this.resetPackets();
};

PacketHandler.prototype.findChunks = function (socket) {
    var rowLength = Math.sqrt(entityConfig.CHUNKS);
    var chunks = [];

    for (var i = 0; i < 9; i++) {
        var chunk = socket.player.chunk;
        var xIndex = i % 3 - 1;
        var yIndex = Math.floor(i / 3) - 1;

        while (!(chunk % rowLength + xIndex).between(0, rowLength - 1) ||
        !(Math.floor(chunk / rowLength) + yIndex).between(0, rowLength - 1)) {
            i++;
            if (i > 8) {
                return chunks;
            }
            xIndex = i % 3 - 1;
            yIndex = Math.floor(i / 3) - 1;
        }
        chunk += xIndex + rowLength * yIndex;
        chunks.push(chunk);
    }
    return chunks;
};


PacketHandler.prototype.resetPackets = function () {
    var id;
    for (id in this.CHUNK_PACKETS) {
        this.CHUNK_PACKETS[id] = [];
    }
};


module.exports = PacketHandler;