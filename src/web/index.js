var socket = io();
var canvas = document.getElementById("bigCanvas");
var ctx = canvas.getContext("2d");


var updateMap = function(data) {
    drawTiles(data);
    updatePositions(data);
};

var drawTiles = function (data) {
    ctx.clearRect(0, 0, 600, 600);
    var packet = data.tiles;
    for (var i = 0; i < packet.length; i++) {
        var tileInfo = packet[i];
        ctx.fillRect(tileInfo.x,tileInfo.y,tileInfo.length,tileInfo.length);
    }
};

var updatePositions = function (data) {
    var packet = data.positions;
    for (var i = 0; i < packet.length; i++) {
        var playerInfo = packet[i];
        ctx.fillText(playerInfo.playerName, playerInfo.x, playerInfo.y);
    }
};



socket.on('updateMap', updateMap);


document.onkeydown = function (event) {
    if (event.keyCode === 68 || event.keyCode === 39) { //d
        socket.emit('keyEvent', {id: 'right', state: true});
    }
    if (event.keyCode === 83 || event.keyCode === 40) { //s
        socket.emit('keyEvent', {id: 'down', state: true});
    }
    if (event.keyCode === 65 || event.keyCode === 37) { //a
        socket.emit('keyEvent', {id: 'left', state: true});
    }
    if (event.keyCode === 87 || event.keyCode === 38) { //w
        socket.emit('keyEvent', {id: 'up', state: true});
    }
};

document.onkeyup = function (event) {
    if (event.keyCode === 68 || event.keyCode === 39) { //d
        socket.emit('keyEvent', {id: 'right', state: false});
    }
    if (event.keyCode === 83 || event.keyCode === 40) { //s
        socket.emit('keyEvent', {id: 'down', state: false});
    }
    if (event.keyCode === 65 || event.keyCode === 37) { //a
        socket.emit('keyEvent', {id: 'left', state: false});
    }
    if (event.keyCode === 87 || event.keyCode === 38) { //w
        socket.emit('keyEvent', {id: 'up', state: false});
    }
};





