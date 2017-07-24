function Client() {
    this.selfId = null;
    this.rightClick = false;
    this.ARROW = null;
    this.BRACKET = null; // change some of this shit
    this.serverMap = null;
    this.mapTimer = 0;

    this.init();
}

Client.prototype.init = function () {
    this.initSocket();
    this.initLists();
    var mainCanvas = document.getElementById("main_canvas");
    var draftCanvas = document.createElement("canvas");
    var mMap = document.createElement("canvas");
    var mMapRot = document.createElement("canvas");

    mainCanvas.style.visibility = "hidden";
    draftCanvas.style.display = "none";
    mMap.style.display = "none";
    mMapRot.style.display = "none";

    draftCanvas.width = mainCanvas.width;
    draftCanvas.height = mainCanvas.height;
    mMap.width = 500;
    mMapRot.width = 500;
    mMap.height = 500;
    mMapRot.height = 500;

    this.mainCtx = mainCanvas.getContext("2d");
    this.draftCtx = draftCanvas.getContext("2d");
    this.mMapCtx = mMap.getContext("2d");
    this.mMapCtxRot = mMapRot.getContext("2d");
};

Client.prototype.initLists = function () {
    this.FACTION_LIST = {};
    this.FACTION_ARRAY = [];

    this.CONTROLLER_LIST = {};
    this.TILE_LIST = {};
    this.SHARD_LIST = {};
    this.LASER_LIST = {};
    this.HOME_LIST = {};
    this.ANIMATION_LIST = {};
};

Client.prototype.initSocket = function () {
    this.socket = io();
    this.socket.verified = false;
    this.socket.on('addFactionsUI', this.addFactionstoUI);
    this.socket.on('updateEntities', this.handlePacket());
    this.socket.on('drawScene', this.drawScene);
};


Client.prototype.handlePacket = function (data) {
    var packet, i;
    for (i = 0; i < data.length; i++) {
        packet = data[i];
        switch (packet.master) {
            case "add":
                addEntities(packet);
                break;
            case "delete":
                deleteEntities(packet);
                break;
            case "update":
                updateEntities(packet);
                break;
        }
    }
};