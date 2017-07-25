function Shard(shardInfo) {
    this.id = shardInfo.id;
    this.x = shardInfo.x;
    this.y = shardInfo.y;
    this.name = shardInfo.name;
    this.visible = shardInfo.visible;
}

Shard.prototype.updateShards = function (shardInfo) {
    this.x = shardInfo.x;
    this.y = shardInfo.y;
    this.visible = shardInfo.visible;
    this.name = shardInfo.name;
};


Shard.prototype.show = function () {

};