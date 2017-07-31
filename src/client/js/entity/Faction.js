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

};

Faction.prototype.show = function () {
    var ctx = this.client.draftCtx;
    ctx.beginPath();
    ctx.strokeStyle = "#2d3542";
    ctx.lineWidth = 2;
    ctx.fillStyle = "#FFFFFF";
    ctx.font = this.size * 60 + "px Arial";
    ctx.textAlign = "center";
    ctx.fillText(this.name, this.x, this.y);
    ctx.strokeText(this.name, this.x, this.y);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
};

module.exports = Faction;