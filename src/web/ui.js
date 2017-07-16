document.documentElement.style.overflow = 'hidden';  // firefox, chrome
document.body.scroll = "no";

var nameBtn = document.getElementById("nameSubmit");
var playerNameInput = document.getElementById("playerNameInput");
var factionNameInput = document.getElementById("factionNameInput");
var playerNamer = document.getElementById("player_namer");
var shardNamerPrompt = document.getElementById('shard_namer_prompt');

var selectedShards = {};
var shardListScroll = false;
var HOME;

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
    mainCanvas.style.visibility = "visible";
    socket.emit("newPlayer",
        {
            name: playerNameInput.value,
            faction: factionNameInput.value
        });
    playerNamer.style.display = 'none';
});

playerNamer.style.display = "block";
playerNameInput.focus();

function openUI(info) {
    var action = info.action;

    if (action === "name shard") {
        openShardNamerUI();
    }
    if (action === "home info") {
        var home = HOME_LIST[info.homeId];
        openHomeUI(home);
    }
    if (action === "update queue") {
        var buildQueue = document.getElementById('build_queue');
        var home = HOME_LIST[info.homeId];
        addQueueInfo(buildQueue, home);
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

    shardNamer.style.display = 'block';

    document.addEventListener("keyup", focusEvent);
    textInput.addEventListener("keyup", function (event) {
        event.preventDefault();
        if (event.keyCode === 13) {
            sendShardName();
        }
    });
}

function openHomeUI(home) {
    var homeInfo = document.getElementById('home_ui');
    var buildQueue = document.getElementById('build_queue');
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
        console.log("OPENING UPGRADES UI");
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


    };

    shardsList.addEventListener('scroll', function (event) {
        shardListScroll = true;
    });

    buildQueue.addEventListener('scroll', function (event) {
        shardListScroll = true;
    });

    HOME = home;
    openHomeInfo();
    openUpgradesUI();
    addQueueInfo(buildQueue, home);
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
    ctx.clearRect(0, 0, 1000, 200);
    var magnitude = 0;
    ctx.fillStyle = "#FFFFFF";
    switch (button.upgType) {
        case "homeHealth":
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
    var shardNamer = document.getElementById('shard_namer_ui');
    var homeInfo = document.getElementById('home_ui');

    if (action === "name shard") {
        var textInput = document.getElementById("textInput");
        textInput.value = "";
        shardNamer.style.display = 'none';
    }
    if (action === "home info") {
        shardListScroll = false;
        homeInfo.style.display = 'none';
        socket.emit("removeViewer", {});
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

function addQueueInfo(list, home) {
    list.innerHTML = "";
    if (!home.queue) {
        return;
    }
    for (var i = 0; i < home.queue.length; i++) {
        var buildInfo = home.queue[i];
        var entry = document.createElement('li');
        entry.id = Math.random();

        (function (_id) {
            entry.addEventListener("click", function () {
                if (!this.clicked) {
                    this.clicked = true;
                    this.style.background = "#fffb22";
                }
                else {
                    this.clicked = false;
                    this.style.background = "#542fce";
                }
            });
        })(entry.id);

        entry.appendChild(document.createTextNode(
            buildInfo.shardName + " -- " + Math.floor(buildInfo.timer/1000) +
            ":" + Math.floor(buildInfo.timer%1000)));
        list.appendChild(entry);
    }
}

function addShards(list, home) {
    checkSelection();
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
                    checkSelection();
                }
                else {
                    this.clicked = false;
                    this.style.background = "#542fce";
                    delete selectedShards[_id];
                    checkSelection();
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

function checkSelection() {
    var bldBaseHealthBtn = document.getElementById('bld_home_btn');
    var makeBotsBtn = document.getElementById('make_bots_btn');
    var bldArmorBtn = document.getElementById('bld_armor');
    var bldSpeedBtn = document.getElementById('bld_speed');
    var bldDmgBtn = document.getElementById('bld_damage');

    if (Object.size(selectedShards) > 0) {
        bldBaseHealthBtn.disabled = false;
        bldArmorBtn.disabled = false;
        bldSpeedBtn.disabled = false;
        bldDmgBtn.disabled = false;
        makeBotsBtn.disabled = false;
    } else {
        bldBaseHealthBtn.disabled = "disabled";
        bldArmorBtn.disabled = "disabled";
        bldSpeedBtn.disabled = "disabled";
        bldDmgBtn.disabled = "disabled";
        makeBotsBtn.disabled = "disabled";
    }
}

function resetButton(button, callback) {
    button.removeEventListener('click', callback);
    button.addEventListener('click', callback);
    if (button.upgType) {
        setSkillMeter(button);
    }
}