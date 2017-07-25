function Controller(controllerInfo, client) {
    this.id = controllerInfo.id;
    this.name = controllerInfo.name;
    this.x = controllerInfo.x;
    this.y = controllerInfo.y;
    this.health = controllerInfo.health;
    this.maxHealth = controllerInfo.maxHealth;
    this.selected = controllerInfo.selected;
    this.owner = controllerInfo.owner;
    this.theta = controllerInfo.theta;
    this.type = controllerInfo.type;
    this.level = controllerInfo.level;

    this.client = client;
}

Controller.prototype.update = function (controllerInfo) {
    this.x = controllerInfo.x;
    this.y = controllerInfo.y;
    this.health = controllerInfo.health;
    this.maxHealth = controllerInfo.maxHealth;
    this.selected = controllerInfo.selected;
    this.theta = controllerInfo.theta;
    this.level = controllerInfo.level;
};

Controller.prototype.show = function () {
    this.client.draftCtx.font = "20px Arial";
    this.client.draftCtx.strokeStyle = "#ff9d60";

    this.client.draftCtx.fillStyle = "rgba(123,0,0," + this.health / (4 * this.maxHealth) + ")";
    this.client.draftCtx.lineWidth = 10;
    this.client.draftCtx.beginPath();

    //draw player object
    if (this.type === "Player") {
        var radius = 30;
        this.client.draftCtx.moveTo(this.x + radius, this.y);
        for (i = Math.PI / 4; i <= 2 * Math.PI - Math.PI / 4; i += Math.PI / 4) {
            theta = i + getRandom(-(this.maxHealth / this.health) / 7, (this.maxHealth / this.health) / 7);
            x = radius * Math.cos(theta);
            y = radius * Math.sin(theta);
            this.client.draftCtx.lineTo(this.x + x, this.y + y);
        }
        this.client.draftCtx.lineTo(this.x + radius, this.y + 3);
        this.client.draftCtx.stroke();
        this.client.draftCtx.fill();
    } else { //bot
        var x, y, theta, startX, startY;
        var smallRadius = 12;
        var bigRadius = 20;

        theta = this.theta;
        startX = bigRadius * Math.cos(theta);
        startY = bigRadius * Math.sin(theta);
        this.client.draftCtx.moveTo(this.x + startX, this.y + startY);
        for (i = 1; i <= 2; i++) {
            theta = this.theta + 2 * Math.PI / 3 * i +
                getRandom(-this.maxHealth / this.health / 7, this.maxHealth / this.health / 7);
            x = smallRadius * Math.cos(theta);
            y = smallRadius * Math.sin(theta);
            this.client.draftCtx.lineTo(this.x + x, this.y + y);
        }
        this.client.draftCtx.lineTo(this.x + startX, this.y + startY);
        this.client.draftCtx.fill();
    }

    this.client.draftCtx.fillStyle = "#ff9d60";
    this.client.draftCtx.fillText(this.name, this.x, this.y + 70);
    if (this.selected && this.owner === this.client.SELFID) {
        this.client.draftCtx.lineWidth = 5;
        this.client.draftCtx.strokeStyle = "#1d55af";
        this.client.draftCtx.stroke();
    }
};


function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

module.exports = Controller;