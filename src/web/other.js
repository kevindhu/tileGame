var canvas = document.getElementById("bigCanvas");
var ctx = canvas.getContext("2d");

canvas.style.visibility = "hidden";
var nameButton = document.getElementById("nameSubmit");
var nameInput = document.getElementById("nameInput");
var playerNamer = document.getElementById("player_namer");


playerNamer.style.display = "block";

nameButton.addEventListener("click", function () {
    canvas.style.visibility = "visible";
    socket.emit("playerName",
        {
            name: nameInput.value
        });
    playerNamer.style.display = 'none';
});


function openUI(action) {
    var shardNamer = document.getElementById('shard_namer');
    var HQInfo = document.getElementById('HQ_info');

    if (action === "name shard") {
        shardNamer.style.display = 'block';
    }
    if (action === "hq info") {
        HQInfo.style.display = 'block';
        var list = document.getElementById('shards_list');
        list.innerHTML = "";
        addShardsToList(list);
    }
}

function closeUI(action) {
    var shardNamer = document.getElementById('shard_namer');
    var HQInfo = document.getElementById('HQ_info');

    if (action === "name shard") {
        var textInput = document.getElementById("textInput");
        textInput.value = "";
        shardNamer.style.display = 'none';
    }
    if (action === "hq info") {
        HQInfo.style.display = 'none';
    }
}




