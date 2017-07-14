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
var selectedShards = {};
var HOME;

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
    HOME = home;
    var homeInfo = document.getElementById('home_ui');
    var shardsList = document.getElementById('shards_list');
    var colorPicker = document.getElementById('color_picker');

    var openHomeInfo = function () {
        homeInfo.style.display = 'block';

        document.getElementById('home_type').innerHTML = home.type;
        document.getElementById('home_level').innerHTML = home.level;
        document.getElementById('home_health').innerHTML = home.health;
        document.getElementById('home_power').innerHTML = home.power;
        document.getElementById('home_faction_name').innerHTML = home.faction;
    };
    var openUpgradesUI = function () {
        var upgradeOptions = document.getElementById('upgrade_options');
        var unitUpgrades = document.getElementById("unit_upgrades");

        var bldBaseHealthBtn = document.getElementById('bld_home_btn');
        var makeBotsBtn = document.getElementById('make_bots_btn');
        var bldArmorBtn = document.getElementById('bld_armor');
        var bldSpeedBtn = document.getElementById('bld_speed');
        var bldDmgBtn = document.getElementById('bld_damage');
        selectedShards = {};

        bldBaseHealthBtn.upgType = "homeHealth";
        bldArmorBtn.upgType = "armor";
        bldSpeedBtn.upgType = "speed";
        bldDmgBtn.upgType = "dmg";

        resetButton(bldBaseHealthBtn, bldHome);
        if (home.type === "Barracks") {
            unitUpgrades.style.display = "block";
            makeBotsBtn.style.display = "block";
            resetButton(bldArmorBtn, upgUnit);
            resetButton(bldSpeedBtn, upgUnit);
            resetButton(bldDmgBtn, upgUnit);

            resetButton(makeBotsBtn, makeBots);
        }
        else {
            unitUpgrades.style.display = "none";
            makeBotsBtn.style.display = "none";
        }

        if (home.shards.length !== 0) {
            bldBaseHealthBtn.style.visibility = "visible";
            bldArmorBtn.style.visibility = "visible";
            bldSpeedBtn.style.visibility = "visible";
            bldDmgBtn.style.visibility = "visible";

            upgradeOptions.style.display = "block";
        }
        else {
            bldBaseHealthBtn.style.visibility = "hidden";
            bldArmorBtn.style.visibility = "hidden";
            bldSpeedBtn.style.visibility = "hidden";
            bldDmgBtn.style.visibility = "hidden";
        }
    };

    shardsList.addEventListener('scroll', function () {

    });


    console.log("OPENING HOME INFO");
    openHomeInfo();
    openUpgradesUI();
    addShards(shardsList, home);
    addColorPicker(colorPicker, home);
}


var bldHome = function () {
    socket.emit('buildHome', {
        home: HOME.id,
        shards: selectedShards
    })
};

var makeBots = function () {
    console.log("MAKING BOTS");
    socket.emit('makeBots', {
        home: HOME.id,
        shards: selectedShards
    });
};

var upgUnit = function () {
    socket.emit('upgradeUnit', {
        home: HOME.id,
        type: this.upgType,
        shards: selectedShards
    });
};

function findChildCanvas(skillDiv) {
    for (var i = 0; i < skillDiv.childNodes.length; i++) {
        if (skillDiv.childNodes[i].nodeName.toLowerCase() === "canvas") {
            return skillDiv.childNodes[i];
        }
    }
    return null;
}

function setSkillMeter(button) {
    var canvas = findChildCanvas(button.parentNode);
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0,0,1000,200);
    var magnitude = 0;
    ctx.fillStyle = "#FFFFFF";
    switch (button.upgType) {
        case "homeHealth":
            console.log(HOME.power + " is the power of the home!")
            magnitude = HOME.power;
            break;
        case "dmg":
            magnitude = HOME.unitDmg;
            break;
        case "armor":
            magnitude = HOME.unitArmor;
            break;
        case "speed":
            magnitude = HOME.unitSpeed;
            break;

    }
    ctx.fillRect(0, 0, magnitude * 10, 200);
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
                if (!this.clicked) {
                    this.clicked = true;
                    this.style.background = "#fffb22";
                    selectedShards[_id] = _id;
                }
                else {
                    this.clicked = false;
                    this.style.background = "#542fce";
                    delete selectedShards[_id];
                }
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

function resetButton(button, callback) {
    button.removeEventListener('click', callback);
    button.addEventListener('click', callback);
    if (button.upgType) {
        setSkillMeter(button);
    }
}