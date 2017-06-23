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
    var shardNamer = document.getElementById('shard_namer');
    var action = info.action;

    if (action === "name shard") {
        shardNamer.style.display = 'block';
    }
    if (action === "home info") {
        var home = HOME_LIST[info.homeId];
        openHomeUI(home);
    }
}


function openHomeUI(home) {
    var homeInfo = document.getElementById('home_info');
    var homeLevel = document.getElementById('home_level');
    var homeHealth = document.getElementById('home_health');
    var homeFaction = document.getElementById('home_faction_name');
    homeLevel.innerHTML = "";
    homeHealth.innerHTML = "";
    homeFaction.innerHTML = "";

    homeLevel.innerHTML = home.level;
    homeHealth.innerHTML = home.health;
    homeFaction.innerHTML = home.id;

    homeInfo.style.display = 'block';

    var shardsList = document.getElementById('shards_list');
    var colorPicker = document.getElementById('color_picker');
    shardsList.innerHTML = "";
    colorPicker.innerHTML = "";

    addShards(shardsList, home);
    addColorPicker(colorPicker, home);

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




function sendShardName() {
    var text = document.getElementById("textInput").value;
    if (text !== null) {
        socket.emit('textInput',
            {
                id: selfId,
                word: text
            }
        )
    }
    closeUI("name shard");
}


function addShards(list, home) {
    for (var i = 0; i < home.shards.length; i++) {
        var entry = document.createElement('li');
        var shard = SHARD_LIST[home.shards[i]];
        entry.id = shard.id;

        (function (_id) {
            entry.addEventListener("click", function () {
                socket.emit("removeHomeShard", {id: _id});
            });
        })(entry.id);


        entry.appendChild(document.createTextNode(shard.name));
        list.appendChild(entry);
    }
}



function addColorPicker(colorPicker, home) {
    if (!home.hasColor && home.level > 1) {
        colorPicker.style.visibility = "visible";
    }
    else {
        console.log("CANT ADD COLOR!");
        colorPicker.style.visibility = "hidden";
        return;
    }

    var colorInput = document.createElement("input");
    var colorSubmitButton = document.createElement('button');
    colorPicker.appendChild(colorInput);
    colorPicker.appendChild(colorSubmitButton);
    
    colorInput.type = "text";
    colorSubmitButton.addEventListener("click", function () {
    socket.emit("newColor",
        {
            color: colorInput.value,
            home: home.id
        });
    colorInput.value = "";

    closeUI('home info');
});
}