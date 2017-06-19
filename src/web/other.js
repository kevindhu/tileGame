var canvas = document.getElementById("bigCanvas");
var ctx = canvas.getContext("2d");

canvas.style.visibility = "hidden";
var nameButton = document.getElementById("nameSubmit");
var playerNameInput = document.getElementById("playerNameInput");
var factionNameInput = document.getElementById("factionNameInput");
var playerNamer = document.getElementById("player_namer");


playerNamer.style.display = "block";

nameButton.addEventListener("click", function () {
    canvas.style.visibility = "visible";
    socket.emit("newPlayer",
        {
            name: playerNameInput.value,
            faction: factionNameInput.value
        });
    playerNamer.style.display = 'none';
});


function openUI(info) {
    var action = info.action;
    var shardNamer = document.getElementById('shard_namer');
    var homeInfo = document.getElementById('home_info');

    if (action === "name shard") {
        shardNamer.style.display = 'block';
    }
    if (action === "home info") {
        homeInfo.style.display = 'block';
        var list = document.getElementById('shards_list');
        list.innerHTML = "";
        addShardsToList(list, info.homeId);
    }
}

function closeUI(action) {
    var shardNamer = document.getElementById('shard_namer');
    var homeInfo = document.getElementById('home_info');

    if (action === "name shard") {
        var textInput = document.getElementById("textInput");
        textInput.value = "";
        shardNamer.style.display = 'none';
    }
    if (action === "home info") {
        homeInfo.style.display = 'none';
    }
}




