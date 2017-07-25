function Faction(factionInfo) {
    this.id = factionInfo.id;
    this.name = factionInfo.name;
    this.x = factionInfo.x;
    this.y = factionInfo.y;
    this.size = factionInfo.size;
}

Faction.prototype.update = function (faction, factionInfo) {
    this.x = factionInfo.x;
    this.y = factionInfo.y;
    this.size = factionInfo.size;


    FACTION_ARRAY.sort(factionSort);
    drawLeaderBoard(); //change this
};