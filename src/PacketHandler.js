const entityConfig = require('./entity/entityConfig');
const Arithmetic = require('./modules/Arithmetic');
function PacketHandler(gameServer) {
    this.gameServer = gameServer;

    this.addAnimationPacket = [];
    this.addPlayerPacket = [];
    this.addShardPacket = [];
    this.addHomePacket = [];
    this.addFactionPacket = [];
    this.addUIPacket = [];
    this.addBracketPacket = [];

    this.updateHomePacket = [];
    this.updateTilesPacket = [];
    this.updateShardsPacket = [];
    this.updatePlayersPacket = [];
    this.updateFactionPacket = [];

    this.deleteBracketPacket = [];
    this.deletePlayerPacket = [];
    this.deleteShardPacket = [];
    this.deleteHomePacket = [];
    this.deleteFactionPacket = [];
    this.deleteUIPacket = [];
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


PacketHandler.prototype.createInitPacket = function (stage,id) { //four total stages
    var playerPacket = [],
        shardPacket = [],
        homePacket = [],
        factionPacket = [],
        tilePacket = [],
        player,
        shard,
        home,
        i;

    var populate = function (packet,list, call, stage) {
        var size = Object.size(list);
        count = 0;
        bound = [size * stage/4 - 5, size * (stage + 1)/4 + 5]
        for (i in list) {
            if (count >= bound[0] && count < bound[1]) { // delta of 5 for overlap
                entity = list[i];
                packet.push(call(entity,true));
            }
            count ++;
        }
    };

    populate(playerPacket,this.gameServer.PLAYER_LIST, this.addPlayerPackets, stage);

    populate(shardPacket,this.gameServer.HOME_SHARD_LIST, this.addShardPackets, stage);
    populate(shardPacket,this.gameServer.PLAYER_SHARD_LIST, this.addShardPackets, stage);
    populate(shardPacket,this.gameServer.STATIC_SHARD_LIST, this.addShardPackets, stage);

    populate(tilePacket, this.gameServer.TILE_LIST, this.addTilePackets, stage);
    populate(homePacket,this.gameServer.HOME_LIST, this.addHomePackets, stage);
    populate(factionPacket,this.gameServer.FACTION_LIST, this.addFactionPackets, stage);

    return {
        playerInfo: playerPacket,
        shardInfo: shardPacket,
        homeInfo: homePacket,
        factionInfo: factionPacket,
        tileInfo: tilePacket,
        selfId: id
    }
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
    this.addAnimationPacket.push(
        {
            type: "shardDeath",
            id: shard.id,
            name: shard.name,
            x: shard.x,
            y: shard.y
        })
};

PacketHandler.prototype.removeHomeAnimationPackets = function (home) {
    this.addAnimationPacket.push(
        {
            type: "removeShard",
            id: home.id,
            name: null,
            x: null,
            y: null
        });
};


PacketHandler.prototype.addHomeAnimationPackets = function (home) {
    this.addAnimationPacket.push(
        {
            type: "addShard",
            id: home.id,
            name: null,
            x: null,
            y: null
        });
};

PacketHandler.prototype.addBracketPackets = function (player, tile) {
    this.addBracketPacket.push({
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


	this.addUIPacket.push(
        {
            playerId: player.id,
            homeId: homeId,
            action: action
        });
};

PacketHandler.prototype.addPlayerPackets = function (player, ifInit) {
    var info = {
        id: player.id,
        name: player.name,
        x: player.x,
        y: player.y,
        health: player.health
    }
    if (ifInit) {
        return info;
    }
    else {
        this.addPlayerPacket.push(info);
    }
};

PacketHandler.prototype.addFactionPackets = function (faction, ifInit) {
    var info = {
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
        this.addFactionPacket.push(info);
    }
};

PacketHandler.prototype.addShardPackets = function (shard, ifInit) {
	var info = {
        id: shard.id,
        x: shard.x,
        y: shard.y,
        name: null
    };
    if (ifInit) {
        return info;
    }
    else {
        this.addShardPacket.push(info);
    }
};

PacketHandler.prototype.addTilePackets = function (tile, ifInit) {
    return {
        id: tile.id,
        x: tile.x,
        y: tile.y,
        color: tile.color,
        length: tile.length,
        alert: tile.alert
    };
}


PacketHandler.prototype.addHomePackets = function (home, ifInit) {
	var info = {
            id: home.id,
            owner: home.owner.name,
            x: home.x,
            y: home.y,
            type: home.type,
            radius: home.radius,
            shards: home.shards,
            level: home.level,
            hasColor: home.hasColor,
            health: home.health
    };
    if (ifInit) {
        return info;
    }
    else {
        this.addHomePacket.push(info);
    }
};


PacketHandler.prototype.updateHomePackets = function (home) {
	this.updateHomePacket.push(
            {
                id: home.id,
                shards: home.shards,
                level: home.level,
                radius: home.radius,
                hasColor: home.hasColor,
                health: home.health
            }
        );
};

PacketHandler.prototype.updateFactionPackets = function (faction) {
    this.updateFactionPacket.push({
        id: faction.id,
        x: faction.x,
        y: faction.y,
        size: faction.homes.length
    });
};

PacketHandler.prototype.updateTilesPackets = function (tile) {
	this.updateTilesPacket.push({
        id: tile.id,
        color: tile.color,
        alert: tile.alert
    });
};

PacketHandler.prototype.updatePlayersPackets = function (player) {
	this.updatePlayersPacket.push({
        id: player.id,
        x: player.x,
        y: player.y,
        health: player.health
    });
};

PacketHandler.prototype.updateShardsPackets = function (shard) {
	this.updateShardsPacket.push({
        name: shard.name,
        id: shard.id,
        x: shard.x,
        y: shard.y
    });
}

PacketHandler.prototype.deleteUIPackets = function (player, action) {
    if (!player.id) {
        var meme = player.id.sdf;
    }
	this.deleteUIPacket.push({
        id: player.id,
        action: action
    });
};

PacketHandler.prototype.deleteBracketPackets = function (player) {
    this.deleteBracketPacket.push({id: player.id});
}

PacketHandler.prototype.deletePlayerPackets = function (player) {
	this.deletePlayerPacket.push({id: player.id});
};

PacketHandler.prototype.deleteFactionPackets = function (faction) {
    this.deleteFactionPacket.push({id: faction.id});
};

PacketHandler.prototype.deleteHomePackets = function (home) {
	this.deleteHomePacket.push({id: home.id});
};


PacketHandler.prototype.deleteShardPackets = function (shard) {
	this.deleteShardPacket.push({id: shard.id});
};


PacketHandler.prototype.sendPackets = function () {
    for (var index in this.gameServer.SOCKET_LIST) {
        var socket = this.gameServer.SOCKET_LIST[index];

        socket.emit('addEntities',
            {
                'playerInfo': this.addPlayerPacket,
                'shardInfo': this.addShardPacket,
                'homeInfo': this.addHomePacket,
                'factionInfo': this.addFactionPacket,
                'bracketInfo': this.addBracketPacket
            });

        socket.emit('updateEntities',
            {
                'playerInfo': this.updatePlayersPacket,
                'tileInfo': this.updateTilesPacket,
                'shardInfo': this.updateShardsPacket,
                'homeInfo': this.updateHomePacket,
                'factionInfo': this.updateFactionPacket
            });
        socket.emit('deleteEntities', 
            {
                'UIInfo': this.deleteUIPacket
            });
        socket.emit('addEntities',
            {
                'UIInfo': this.addUIPacket,
                'animationInfo': this.addAnimationPacket
            });
        socket.emit('deleteEntities',
            {
                'playerInfo': this.deletePlayerPacket,
                'shardInfo': this.deleteShardPacket,
                'homeInfo': this.deleteHomePacket,
                'bracketInfo': this.deleteBracketPacket,
                'factionInfo': this.deleteFactionPacket
            });
        socket.emit('drawScene', {});
    }
    this.resetPackets();
};



PacketHandler.prototype.resetPackets = function () {
    this.addAnimationPacket = [];
    this.addPlayerPacket = [];
    this.addShardPacket = [];
    this.addHomePacket = [];
    this.addFactionPacket = [];
    this.addUIPacket = [];
    this.addBracketPacket = [];

    this.updateHomePacket = [];
    this.updateTilesPacket = [];
    this.updateShardsPacket = [];
    this.updatePlayersPacket = [];
    this.updateFactionPacket = [];

    this.deleteBracketPacket = [];
    this.deletePlayerPacket = [];
    this.deleteShardPacket = [];
    this.deleteHomePacket = [];
    this.deleteFactionPacket = [];
    this.deleteUIPacket = [];
};


module.exports = PacketHandler;