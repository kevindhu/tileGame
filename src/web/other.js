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
    var homeInfo = document.getElementById('home_info');
    var action = info.action;
    var home = HOME_LIST[info.homeId];


    if (action === "name shard") {
        shardNamer.style.display = 'block';
    }
    if (action === "home info") {
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
        var list = document.getElementById('shards_list');
        list.innerHTML = "";

        addShardsToList(list, home);
        addColorPicker(home);
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




function defineMessage() {
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


function addShardsToList(list, home) {
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

var colorPicker = document.getElementById("color_picker");
var colorSubmitButton = document.getElementById("color_submit");
var colorInput = document.getElementById("color_input");


function addColorPicker(home) {
    if (!home.hasColor && home.level > 1) {
        colorPicker.style.visibility = "visible";
    }
    else {
        console.log("CANT ADD COLOR!");
        colorPicker.style.visibility = "hidden";
        return;
    }


    colorSubmitButton.addEventListener("click", function () {
    socket.emit("newColor",
        {
            color: colorInput.value,
            home: home.id
        });
    colorInput.value = "";
    closeUI('home info');

    var elClone = colorSubmitButton.cloneNode(true);
    colorSubmitButton.parentNode.replaceChild(elClone, colorSubmitButton);
});
}