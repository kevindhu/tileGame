const entityConfig = require('./entity/entityConfig');
const Arithmetic = require('./modules/Arithmetic');
function PacketHandler(gameServer) {
    this.gameServer = gameServer;

    this.addPacket = [];
    this.updatePacket = [];
    this.deletePacket = [];
}

PacketHandler.prototype.sendInitPackets = function (socket) {
    var stage = socket.stage;
    if (stage === 0) {
        socket.emit('addFactionsUI', this.addFactionsUIPacket());
        socket.emit('addEntities', this.createInitPacket(stage, socket.id));
    }
    else {
        socket.emit('addEntities', this.createInitPacket(stage));
    }
    socket.stage ++;
};


PacketHandler.prototype.createInitPacket = function (stage,id) {
    var addPacket = [];
    var populate = function (packet, list, call, stage) {
        var size = Object.size(list);
        var count = 0;
        var bound = [size * stage/entityConfig.STAGES - 5,
            size * (stage + 1)/entityConfig.STAGES + 5];
        for (var i in list) {
            if (count >= bound[0] && count < bound[1]) { // delta of 5 for overlap
                var entity = list[i];
                packet.push(call(entity,true));
            }
            count ++;
        }
    };

    populate(addPacket,this.gameServer.CONTROLLER_LIST, this.addControllerPackets, stage);

    populate(addPacket,this.gameServer.HOME_SHARD_LIST, this.addShardPackets, stage);
    populate(addPacket,this.gameServer.PLAYER_SHARD_LIST, this.addShardPackets, stage);
    populate(addPacket,this.gameServer.STATIC_SHARD_LIST, this.addShardPackets, stage);

    populate(addPacket, this.gameServer.TILE_LIST, this.addTilePackets, stage);
    populate(addPacket,this.gameServer.HOME_LIST, this.addHomePackets, stage);
    populate(addPacket,this.gameServer.FACTION_LIST, this.addFactionPackets, stage);

    if (id) {
        console.log("THIS IS THE ID " + id);
        addPacket.push({
            class: "selfId",
            selfId: id
        });
    }
    return addPacket;
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
    this.addPacket.push(
        {
            class: "animationInfo",
            type: "shardDeath",
            id: shard.id,
            name: shard.name,
            x: shard.x,
            y: shard.y
        })
};

PacketHandler.prototype.removeHomeAnimationPackets = function (home) {
    this.addPacket.push(
        {
            class: "animationInfo",
            type: "removeShard",
            id: home.id,
            name: null,
            x: null,
            y: null
        });
};


PacketHandler.prototype.addHomeAnimationPackets = function (home) {
    this.addPacket.push(
        {
            class: "animationInfo",
            type: "addShard",
            id: home.id,
            name: null,
            x: null,
            y: null
        });
};

PacketHandler.prototype.addBracketPackets = function (player, tile) {
    this.addPacket.push({
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

	this.addPacket.push(
        {
            class: "UIInfo",
            playerId: player.id,
            homeId: homeId,
            action: action
        });
};

PacketHandler.prototype.addControllerPackets = function (controller, ifInit) {
    var info = {
        class: "controllerInfo",
        id: controller.id,
        name: controller.name,
        x: controller.x,
        y: controller.y,
        health: controller.health
    };
    if (ifInit) {
        return info;
    }
    else {
        this.addPacket.push(info);
    }
};

PacketHandler.prototype.addFactionPackets = function (faction, ifInit) {
    var info = {
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
        this.addPacket.push(info);
    }
};

PacketHandler.prototype.addShardPackets = function (shard, ifInit) {
	var info = {
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
        this.addPacket.push(info);
    }
};

PacketHandler.prototype.addTilePackets = function (tile, ifInit) {
    return {
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
    this.addPacket.push({
        class: "laserInfo",
        id: laser.id,
        owner: laser.owner,
        target: laser.target
    });
};


PacketHandler.prototype.addHomePackets = function (home, ifInit) {
	var info = {
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
        this.addPacket.push(info);
    }
};




PacketHandler.prototype.updateHomePackets = function (home) {
	this.updatePacket.push(
            {
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
    this.updatePacket.push({
        class: "factionInfo",
        id: faction.id,
        x: faction.x,
        y: faction.y,
        size: faction.homes.length
    });
};

PacketHandler.prototype.updateTilesPackets = function (tile) {
	this.updatePacket.push({
        class: "tileInfo",
        id: tile.id,
        color: tile.color,
        alert: tile.alert
    });
};

PacketHandler.prototype.updateControllersPackets = function (controller) {
	this.updatePacket.push({
        class: "controllerInfo",
        id: controller.id,
        x: controller.x,
        y: controller.y,
        health: controller.health
    });
};

PacketHandler.prototype.updateShardsPackets = function (shard) {
	this.updatePacket.push({
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
	this.deletePacket.push({
        class: "UIInfo",
        id: player.id,
        action: action
    });
};

PacketHandler.prototype.deleteBracketPackets = function (player) {
    this.deletePacket.push({class: "bracketInfo", id: player.id});
};

PacketHandler.prototype.deleteControllerPackets = function (controller) {
	this.deletePacket.push({class: "controllerInfo", id: controller.id});
};

PacketHandler.prototype.deleteLaserPackets = function (laser) {
    this.deletePacket.push({class: "laserInfo", id: laser.id});
};

PacketHandler.prototype.deleteFactionPackets = function (faction) {
    this.deletePacket.push({class: "factionInfo", id: faction.id});
};

PacketHandler.prototype.deleteHomePackets = function (home) {
	this.deletePacket.push({class: "homeInfo", id: home.id});
};


PacketHandler.prototype.deleteShardPackets = function (shard) {
	this.deletePacket.push({class: "shardInfo", id: shard.id});
};


PacketHandler.prototype.sendPackets = function () {
    for (var index in this.gameServer.SOCKET_LIST) {
        var socket = this.gameServer.SOCKET_LIST[index];

        socket.emit('addEntities', this.addPacket);
        socket.emit('deleteEntities', this.deletePacket);
        socket.emit('updateEntities', this.updatePacket);
        socket.emit('drawScene', {});
    }
    this.resetPackets();
};



PacketHandler.prototype.resetPackets = function () {
    this.addPacket = [];
    this.updatePacket = [];
    this.deletePacket = [];
};


module.exports = PacketHandler;