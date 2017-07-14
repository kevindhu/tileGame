$(document).ready(function () {
    document.documentElement.style.overflow = 'hidden';  // firefox, chrome
    document.body.scroll = "no";
});

var canvas = document.getElementById("bigCanvas");
canvas.style.visibility = "hidden";
var nameBtn = document.getElementById("nameSubmit");
var playerNameInput = document.getElementById("playerNameInput");
var factionNameInput = document.getElementById("factionNameInput");
var playerNamer = document.getElementById("player_namer");
var selectedShards = [];

playerNamer.style.display = "block";
playerNameInput.focus();

var shardNamerPrompt = document.getElementById('shard_namer_prompt');
shardNamerPrompt.addEventListener("click", function () {
    openShardNamerUI();
});


playerNameInput.addEventListener("keyup", function (event) {
    event.preventDefault();
    if (event.keyCode === 13) {
        factionNameInput.focus();
    }
});

factionNameInput.addEventListener("keyup", function (event) {
    event.preventDefault();
    if (event.keyCode === 13) {
        nameBtn.click();
    }
});

nameBtn.addEventListener("click", function () {
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

    if (action === "name shard") {
        openShardNamerUI();
    }
    if (action === "home info") {
        var home = HOME_LIST[info.homeId];
        openHomeUI(home);
    }
}

function openShardNamerUI() {
    var shardNamer = document.getElementById('shard_namer_ui');
    var textInput = document.getElementById("textInput");
    var nameShardBtn = document.getElementById("nameShardBtn");
    var focusEvent = function (event) {
        event.preventDefault();
        if (event.keyCode === 13) {
            textInput.focus();
            document.removeEventListener("keyup", focusEvent);
        }
    };
    document.addEventListener("keyup", focusEvent);
    textInput.addEventListener("keyup", function (event) {
        event.preventDefault();
        if (event.keyCode === 13) {
            sendShardName();
        }
    });

    shardNamer.style.display = 'block';
}

function openHomeUI(home) {
    var homeInfo = document.getElementById('home_ui');
    var shardsList = document.getElementById('shards_list');
    var colorPicker = document.getElementById('color_picker');

    var upgradeOptions = document.getElementById('upgrade_options');

    var bldArmorBtn= document.getElementById('bld_armor');
    var bldSpeedBtn = document.getElementById('bld_speed');
    var bldDmgBtn = document.getElementById('bld_damage');

    var bldBaseHealthBtn = document.getElementById('bld_home_btn');
    var makeBotsBtn = document.getElementById('make_bots_btn');

    homeInfo.style.display = 'block';

    document.getElementById('home_type').innerHTML = home.type;
    document.getElementById('home_level').innerHTML = home.level;
    document.getElementById('home_health').innerHTML = home.health;
    document.getElementById('home_power').innerHTML = home.power;
    document.getElementById('home_faction_name').innerHTML = home.faction;

    var bldHome = function () {
        console.log(selectedShards);
        socket.emit('buildHome', {
            home: home.id,
            shards: selectedShards
        })
    };

    var makeBots = function () {
        socket.emit('makeBots', {
            home: home.id,
            shards: selectedShards
        });
    };

    selectedShards = [];

    if (home.shards.length !== 0) {
        upgradeOptions.style.display = "block";
        if (home.type === "Barracks") {
            //add bot upgrades section
        }
    }
    else {
        upgradeOptions.style.display = "none";
    }

    addShards(shardsList, home);
    addColorPicker(colorPicker, home);
}


function closeUI(action) {
    var shardNamer = document.getElementById('shard_namer');
    var homeInfo = document.getElementById('home_ui');

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
    if (text !== null && text !== "") {
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
    list.innerHTML = "";
    for (var i = 0; i < home.shards.length; i++) {
        var entry = document.createElement('li');
        var shard = SHARD_LIST[home.shards[i]];
        entry.id = shard.id;

        (function (_id) {
            entry.addEventListener("click", function () {
                this.style.background = "#000000";
                selectedShards.push(_id);
            });
        })(entry.id);


        entry.appendChild(document.createTextNode(shard.name));
        list.appendChild(entry);
    }
}

function addColorPicker(colorPicker, home) {
    var colorCanvas = document.getElementById("color_canvas");
    var colorCtx = colorCanvas.getContext("2d");

    if (!home.hasColor && home.level > 1) {
        colorPicker.style.display = "block";
    }
    else {
        colorPicker.style.display = "none";
        return;
    }

    var colors = new Image();
    colors.src = 'colors.jpg';
    colors.onload = function () {
        colorCtx.fillStyle = "#333eee";
        colorCtx.fillRect(0, 0, colorCanvas.width / 2, colorCanvas.height / 2);
        colorCtx.fillStyle = "#623eee";
        colorCtx.fillRect(colorCanvas.width / 2, colorCanvas.height / 2, colorCanvas.width, colorCanvas.height);
    };

    colorCanvas.addEventListener('mouseup', function (event) {
        var rect = colorCanvas.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;
        var img_data = colorCtx.getImageData(x, y, 100, 100).data;
        socket.emit("newColor", {
            home: home.id,
            color: {
                r: img_data[0],
                g: img_data[1],
                b: img_data[2]
            }
        });
    });
}