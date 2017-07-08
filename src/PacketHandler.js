const entityConfig = require('./entity/entityConfig');
const Arithmetic = require('./modules/Arithmetic');
function PacketHandler(gameServer) {
    this.gameServer = gameServer;
    this.masterPacket = [];

}

PacketHandler.prototype.sendInitPackets = function (socket) {
    var stage = socket.stage;
    if (stage === 0) {
        socket.emit('addFactionsUI', this.addFactionsUIPacket()); //make more streamlined?
        socket.emit('updateEntities', this.createInitPacket(stage, socket.id));
    }
    else {
        socket.emit('updateEntities', this.createInitPacket(stage));
    }
    socket.stage++;
};


PacketHandler.prototype.createInitPacket = function (stage, id) {
    var initPacket = [];
    var populate = function (list, call, stage) {
        var size = Object.size(list);
        var count = 0;
        var bound = [size * stage / entityConfig.STAGES - 5,
            size * (stage + 1) / entityConfig.STAGES + 5];
        for (var i in list) {
            if (count >= bound[0] && count < bound[1]) { // delta of 5 for overlap
                var entity = list[i];
                initPacket.push(call(entity, true));
            }
            count++;
        }
    };

    populate(this.gameServer.CONTROLLER_LIST, this.addControllerPackets, stage);

    populate(this.gameServer.HOME_SHARD_LIST, this.addShardPackets, stage);
    populate(this.gameServer.PLAYER_SHARD_LIST, this.addShardPackets, stage);
    populate(this.gameServer.STATIC_SHARD_LIST, this.addShardPackets, stage);

    populate(this.gameServer.TILE_LIST, this.addTilePackets, stage);
    populate(this.gameServer.HOME_LIST, this.addHomePackets, stage);
    populate(this.gameServer.FACTION_LIST, this.addFactionPackets, stage);

    if (id) {
        initPacket.push({
            master: "add",
            class: "selfId",
            selfId: id
        });
    }
    return initPacket;
};


//TODO: optimize this with addUIPacket to make it cleaner
PacketHandler.prototype.addFactionsUIPacket = function () {
    var factionsPacket = [];
    for (var i in this.gameServer.FACTION_LIST) {
        factionsPacket.push(i);
    }
    return {factions: factionsPacket};
};

PacketHandler.prototype.addShardAnimationPackets = function (shard) {
    this.masterPacket.push(
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
    this.masterPacket.push(
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
    this.masterPacket.push(
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
    this.masterPacket.push({
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

    this.masterPacket.push(
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
        id: controller.id,
        name: controller.name,
        x: controller.x,
        y: controller.y,
        health: controller.health,
        selected: controller.selected
    };
    if (ifInit) {
        return info;
    }
    else {
        this.masterPacket.push(info);
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
        this.masterPacket.push(info);
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
        this.masterPacket.push(info);
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
    this.masterPacket.push({
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
        this.masterPacket.push(info);
    }
};


PacketHandler.prototype.updateHomePackets = function (home) {
    this.masterPacket.push(
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
    this.masterPacket.push({
        master: "update",
        class: "factionInfo",
        id: faction.id,
        x: faction.x,
        y: faction.y,
        size: faction.homes.length
    });
};

PacketHandler.prototype.updateTilesPackets = function (tile) {
    this.masterPacket.push({
        master: "update",
        class: "tileInfo",
        id: tile.id,
        color: tile.color,
        alert: tile.alert
    });
};

PacketHandler.prototype.updateControllersPackets = function (controller) {
    this.masterPacket.push({
        master: "update",
        class: "controllerInfo",
        id: controller.id,
        x: controller.x,
        y: controller.y,
        health: controller.health,
        selected: controller.selected
    });
};

PacketHandler.prototype.updateShardsPackets = function (shard) {
    this.masterPacket.push({
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
    this.masterPacket.push({
        master: "delete",
        class: "UIInfo",
        id: player.id,
        action: action
    });
};

PacketHandler.prototype.deleteBracketPackets = function (player) {
    this.masterPacket.push({
        master: "delete",
        class: "bracketInfo",
        id: player.id
    });
};

PacketHandler.prototype.deleteControllerPackets = function (controller) {
    this.masterPacket.push({
        master: "delete",
        class: "controllerInfo",
        id: controller.id
    });
};

PacketHandler.prototype.deleteLaserPackets = function (laser) {
    this.masterPacket.push({
        master: "delete",
        class: "laserInfo",
        id: laser.id
    });
};

PacketHandler.prototype.deleteFactionPackets = function (faction) {
    this.masterPacket.push({
        master: "delete",
        class: "factionInfo",
        id: faction.id
    });
};

PacketHandler.prototype.deleteHomePackets = function (home) {
    this.masterPacket.push({
        master: "delete",
        class: "homeInfo",
        id: home.id
    });
};


PacketHandler.prototype.deleteShardPackets = function (shard) {
    this.masterPacket.push({
        master: "delete",
        class: "shardInfo",
        id: shard.id
    });
};


PacketHandler.prototype.sendPackets = function () {
    for (var index in this.gameServer.SOCKET_LIST) {
        var socket = this.gameServer.SOCKET_LIST[index];

        socket.emit('updateEntities', this.masterPacket);
        socket.emit('drawScene', {});
    }
    this.resetPackets();
};


PacketHandler.prototype.resetPackets = function () {
    this.masterPacket = [];
};


module.exports = PacketHandler;