$(document).ready(function () {
    document.documentElement.style.overflow = 'hidden';  // firefox, chrome
    document.body.scroll = "no";
});

var canvas = document.getElementById("bigCanvas");
canvas.style.visibility = "hidden";
var nameButton = document.getElementById("nameSubmit");
var playerNameInput = document.getElementById("playerNameInput");
var factionNameInput = document.getElementById("factionNameInput");
var playerNamer = document.getElementById("player_namer");
var selectedShards = [];

playerNamer.style.display = "block";

var shardNamerPrompt = document.getElementById('shard_namer_prompt');
shardNamerPrompt.addEventListener("click", function () {
    console.log("SHARD NAMER PROMPT CLICKED!");
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
        nameButton.click();
    }
});

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

    if (action === "name shard") {
        openShardNamerUI();
    }
    if (action === "home info") {
        var home = HOME_LIST[info.homeId];
        openHomeUI(home);
    }
}

function openShardNamerUI() {
    var shardNamer = document.getElementById('shard_namer');
    var textInput = document.getElementById("textInput");
    var nameShardButton = document.getElementById("nameShardButton");
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
    var homeInfo = document.getElementById('home_info');
    var homeLevel = document.getElementById('home_level');
    var homeHealth = document.getElementById('home_health');
    var homePower = document.getElementById('home_power');
    var homeFaction = document.getElementById('home_faction_name');
    var homeType = document.getElementById('home_type');
    var buildBaseButton = document.getElementById('build_home_button');
    var makeBotsButton = document.getElementById('make_bots_button');
    var buildArmor = document.getElementById('build_armor');
    var buildSpeed = document.getElementById('build_speed');
    var buildDamage = document.getElementById('build_damage');
    var shardsList = document.getElementById('shards_list');
    var colorPicker = document.getElementById('color_picker');
    var buildHome = function () {
        console.log("BUILDING THE HOME");
        socket.emit('buildHome', {
            home: home.id,
            shards: selectedShards
        })
    };

    var makeBots = function () {
        console.log("MAKING BOTS");
        socket.emit('makeBots', {
            home: home.id,
            shards: selectedShards
        });
    };



    selectedShards = [];

    homeLevel.innerHTML = "";
    homeHealth.innerHTML = "";
    homeFaction.innerHTML = "";
    homePower.innerHTML = "";
    homeType.innerHTML = "";

    homeInfo.style.display = 'block';

    homeLevel.innerHTML = home.level;
    homeHealth.innerHTML = home.health;
    homeFaction.innerHTML = home.id;
    homePower.innerHTML = home.power;
    homeType.innerHTML = home.type;

    if (home.shards.length !== 0) {
        buildBaseButton = resetButton(buildBaseButton);
        if (home.type === "Barracks") {
            makeBotsButton = resetButton(makeBotsButton);
            buildArmor = resetButton(buildArmor);
            buildSpeed = resetButton(buildSpeed);
            buildDamage = resetButton(buildDamage);
        }

        buildBaseButton.addEventListener('click', buildHome);
        makeBotsButton.addEventListener('click', makeBots);
        buildArmor.addEventListener('click', buildBotArmor);
        buildSpeed.addEventListener('click', buildBotSpeed);
        buildDamage.addEventListener('click', buildBotDamage);
    }
    else {
        buildBaseButton.style.visibility = "hidden";
        makeBotsButton.style.visibility = "hidden";
    }

    addShards(shardsList, home);
    addColorPicker(colorPicker, home);

}

function resetButton(button) {
    var buttonNew = button.cloneNode(true);
    button.parentNode.replaceChild(buttonNew, button);
    button = buttonNew;
    button.style.visibility = "visible";
    return button;
}


function closeUI(action) {
    var shardNamer = document.getElementById('shard_namer');
    var homeInfo = document.getElementById('home_info');

    if (action === "name shard") {
        console.log("CLOSING SHARD INFO");
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
    var colorInput = document.getElementById("color_input");
    var colorSubmitButton = document.getElementById("color_submit_button");
    if (!home.hasColor && home.level > 1) {
        colorPicker.style.visibility = "visible";
    }
    else {
        colorPicker.style.visibility = "hidden";
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