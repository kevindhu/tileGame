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

    this.updateHomePacket = [];
    this.updateTilesPacket = [];
    this.updateShardsPacket = [];
    this.updatePlayersPacket = [];
    this.updateFactionPacket = [];

    this.deletePlayerPacket = [];
    this.deleteShardPacket = [];
    this.deleteHomePacket = [];
    this.deleteFactionPacket = [];
    this.deleteUIPacket = [];
}

PacketHandler.prototype.sendInitPackets = function (socket) {
    var stage = socket.stage;
    if (stage === 0) {
        socket.emit('addEntities', this.createMainInitPacket(socket.id));
        socket.emit('addFactionsUI', this.createFactionsInitPacket());
    }
    if (stage === 1) {
        socket.emit('addEntities', this.createTileInitPacket(socket.id,
            [0, entityConfig.TILES / 4]));
    }
    if (stage === 2) {
        socket.emit('addEntities', this.createTileInitPacket(socket.id,
            [entityConfig.TILES / 4, entityConfig.TILES / 2]));
    }
    if (stage === 3) {
        socket.emit('addEntities', this.createTileInitPacket(socket.id,
            [entityConfig.TILES / 2, entityConfig.TILES * 3 / 4]));
    }
    if (stage === 4) {
        socket.emit('addEntities', this.createTileInitPacket(socket.id,
            [entityConfig.TILES * 3 / 4, entityConfig.TILES]));
    }
    socket.stage++;
};

PacketHandler.prototype.createMainInitPacket = function (id) {
    var playerPacket = [],
        shardPacket = [],
        homePacket = [],
        factionPacket = [],
        player,
        shard,
        home,
        i;

    for (i in this.gameServer.PLAYER_LIST) {
        player = this.gameServer.PLAYER_LIST[i];
        playerPacket.push(this.addPlayerPackets(player,true));
    }

    for (i in this.gameServer.STATIC_SHARD_LIST) {
        shard = this.gameServer.STATIC_SHARD_LIST[i];
        shardPacket.push(this.addShardPackets(shard,true));    
    }

    for (i in this.gameServer.PLAYER_SHARD_LIST) {
        shard = this.gameServer.PLAYER_SHARD_LIST[i];
        shardPacket.push(this.addShardPackets(shard,true));  
    }

    for (i in this.gameServer.HOME_SHARD_LIST) {
        shard = this.gameServer.HOME_SHARD_LIST[i];
        shardPacket.push(this.addShardPackets(shard,true));  
    }

    for (i in this.gameServer.HOME_LIST) {
        home = this.gameServer.HOME_LIST[i];
        homePacket.push(this.addHomePackets(home,true));  
    }

    for (i in this.gameServer.FACTION_LIST) {
        faction = this.gameServer.FACTION_LIST[i];
        factionPacket.push(this.addFactionPackets(faction,true));  
    }
    return {
        playerInfo: playerPacket,
        shardInfo: shardPacket,
        homeInfo: homePacket,
        factionInfo: factionPacket,
        selfId: id
    }
};

PacketHandler.prototype.createTileInitPacket = function (id, bound) {
    var ret = {},
        tilePacket = [],
        tile,
        i;

    var size = Object.size(this.gameServer.TILE_LIST);
    var count = 0;
    for (i in this.gameServer.TILE_LIST) {
        if (count >= bound[0] && count < bound[1]) {
            tile = this.gameServer.TILE_LIST[i];
            tilePacket.push({
                id: tile.id,
                x: tile.x,
                y: tile.y,
                color: tile.color,
                length: tile.length,
                alert: tile.alert
            });
        }
        count++;
    }

    return {
        tileInfo: tilePacket,
    }
}

PacketHandler.prototype.createFactionsInitPacket = function () {
    var ret = {};
    var factionsPacket = [];
    for (var i in this.gameServer.FACTION_LIST) {
        factionsPacket.push(i);
    }
    ret['factions'] = factionsPacket;
    return ret;
};




PacketHandler.prototype.addShardAnimationPackets = function (shard) {
    this.addAnimationPacket.push(
    {  
        id: shard.id,
        name: shard.name,
        x: shard.x,
        y: shard.y
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


PacketHandler.prototype.deleteUIPackets = function (id, action) {
	this.deleteUIPacket.push({
        id: id,
        action: action
    });
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
                'factionInfo': this.addFactionPacket
            });

        socket.emit('updateEntities',
            {
                'playerInfo': this.updatePlayersPacket,
                'tileInfo': this.updateTilesPacket,
                'shardInfo': this.updateShardsPacket,
                'homeInfo': this.updateHomePacket,
                'factionInfo': this.updateFactionPacket
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
                'UIInfo': this.deleteUIPacket,
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

    this.updateHomePacket = [];
    this.updateTilesPacket = [];
    this.updateShardsPacket = [];
    this.updatePlayersPacket = [];
    this.updateFactionPacket = [];

    this.deletePlayerPacket = [];
    this.deleteShardPacket = [];
    this.deleteHomePacket = [];
    this.deleteFactionPacket = [];
    this.deleteUIPacket = [];
};


module.exports = PacketHandler;