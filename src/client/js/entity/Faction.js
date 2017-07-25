function Faction(factionInfo, client) {
    this.id = factionInfo.id;
    this.name = factionInfo.name;
    this.x = factionInfo.x;
    this.y = factionInfo.y;
    this.size = factionInfo.size;

    this.client = client;
}

Faction.prototype.update = function (factionInfo) {
    this.x = factionInfo.x;
    this.y = factionInfo.y;
    this.size = factionInfo.size;


    //FACTION_ARRAY.sort(factionSort);
    //drawLeaderBoard(); //change this
};

Faction.prototype.show = function () {
    var ctx = this.client.draftCtx;
    ctx.font = this.size * 30 + "px Arial";
    ctx.textAlign = "center";
    ctx.fillText(this.name, this.x, this.y);
};

module.exports = Faction;