document.documentElement.style.overflow = 'hidden';  // firefox, chrome
document.body.scroll = "no";

var SELECTED_SHARDS = {};
var LIST_SCROLL = false;
var HOME;

function openUI(info) {
    var action = info.action;
    var home;

    if (action === "name shard") {
        openShardNamerUI();
    }
    if (action === "home info") {
        home = HOME_LIST[info.homeId];
        openHomeUI(home);
    }
}

function updateUI(info) {
    var action = info.action;
    var home;
    if (action === "update queue") {
        var buildQueue = document.getElementById('build_queue');
        home = HOME_LIST[info.homeId];
        addQueueInfo(buildQueue, home);
    }
}


function openPlayerNamerUI() {
    var leaderboard = document.getElementById("leaderboard_container");
    var nameBtn = document.getElementById("nameSubmit");
    var playerNameInput = document.getElementById("playerNameInput");
    var factionNameInput = document.getElementById("factionNameInput");
    var playerNamer = document.getElementById("player_namer");

    playerNameInput.addEventListener("keyup", function (event) {
        event.preventDefault();
        if (event.keyCode === 13) {
            factionNameInput.focus();
        }
        drawLeaderBoard();
    });

    factionNameInput.addEventListener("keyup", function (event) {
        event.preventDefault();
        if (event.keyCode === 13) {
            nameBtn.click();
        }
    });

    nameBtn.addEventListener("click", function () {
        mainCanvas.style.visibility = "visible";
        leaderboard.style.visibility = "visible";
        socket.emit("newPlayer",
            {
                name: playerNameInput.value,
                faction: factionNameInput.value
            });
        playerNamer.style.display = 'none';
    });

    playerNamer.style.visibility = "visible";
    playerNameInput.focus();
    leaderboard.style.visibility = "hidden";
}

function openGameUI() {
    var shardNamerPrompt = document.getElementById('shard_namer_prompt');
    shardNamerPrompt.addEventListener("click", function () {
        openShardNamerUI();
    });
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
    });
}

function openHomeUI(home) {
    var homeUI = document.getElementById('home_ui');
    var shardsLists = document.getElementsByClassName('shards_list');
    var colorPicker = document.getElementById('color_picker');

    homeUI.style.display = 'block';

    var openHomeInfo = function () {
        document.getElementById('home_type').innerHTML = home.type;
        document.getElementById('home_level').innerHTML = home.level;
        document.getElementById('home_health').innerHTML = home.health;
        document.getElementById('home_power').innerHTML = home.power;
        document.getElementById('home_faction_name').innerHTML = home.faction;
    };
    var addTabListeners = function () {
        var upgradesPage = document.getElementById("upgrades_page");
        var createPage = document.getElementById("create_page");
        var botsPage = document.getElementById("bots_page");

        var upgradesTab = document.getElementById('upgrades_tab');
        var createTab = document.getElementById('create_tab');
        var botsTab = document.getElementById('bots_tab');

        upgradesTab.addEventListener('click', function (evt) {
            upgradesPage.style.display = "block";
            createPage.style.display = "none";
            botsPage.style.display = "none";
            openUpgradesPage();
        });

        createTab.addEventListener('click', function (evt) {
            upgradesPage.style.display = "none";
            createPage.style.display = "block";
            botsPage.style.display = "none";
            openCreatePage();
        });

        botsTab.addEventListener('click', function (evt) {
            upgradesPage.style.display = "none";
            createPage.style.display = "none";
            botsPage.style.display = "block";
            openBotsPage();
        });

    };

    var openUpgradesPage = function () {
        var unitUpgrades = document.getElementById("unit_upgrades");
        var bldBaseHealthBtn = document.getElementById('bld_home_btn');
        var bldArmorBtn = document.getElementById('bld_armor');
        var bldSpeedBtn = document.getElementById('bld_speed');
        var bldDmgBtn = document.getElementById('bld_damage');
        SELECTED_SHARDS = {};

        bldBaseHealthBtn.upgType = "homeHealth";
        bldArmorBtn.upgType = "armor";
        bldSpeedBtn.upgType = "speed";
        bldDmgBtn.upgType = "dmg";

        var bldHome = function () {
            socket.emit('buildHome', {
                home: HOME.id,
                shards: SELECTED_SHARDS
            })
        };
        var upgUnit = function () {
            socket.emit('upgradeUnit', {
                home: HOME.id,
                type: this.upgType,
                shards: SELECTED_SHARDS
            });
        };


        resetButton(bldBaseHealthBtn, bldHome);
        if (home.type === "Barracks") {
            unitUpgrades.style.display = "block";
            resetButton(bldArmorBtn, upgUnit);
            resetButton(bldSpeedBtn, upgUnit);
            resetButton(bldDmgBtn, upgUnit);
        }
        else {
            unitUpgrades.style.display = "none";
        }


    };
    var openCreatePage = function () {
        var createBot = document.getElementById("create_bot_container");
        var buildQueue = document.getElementById('build_queue');
        var makeBotsBtn = document.getElementById('make_bots_btn');

        var makeBots = function () {
            console.log(SELECTED_SHARDS);
            socket.emit('makeBots', {
                home: HOME.id,
                shards: SELECTED_SHARDS
            });
        };

        buildQueue.addEventListener('scroll', function (event) {
            LIST_SCROLL = true;
        });

        if (home.type === "Barracks") {
            console.log("RESETTING MAKE_BOTS");
            resetButton(makeBotsBtn, makeBots);
            createBot.style.display = "flex";
        } else {
            createBot.style.display = "none";
        }

        addQueueInfo(buildQueue, home);
    };
    var openBotsPage = function () {
        var botsList = document.getElementById('bots_list');
        if (home.type === "Barracks") {
            addBots(botsList, home);
        }
    };
    var openColorPicker = function (colorPicker, home) {
        var colorCanvas = document.getElementById("color_canvas");
        var colorCtx = colorCanvas.getContext("2d");

        colorCanvas.width = 100;
        colorCanvas.height = 100;

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
    };

    function addShards(lists, home) {
        var checkSelection = function () {
            var bldBaseHealthBtn = document.getElementById('bld_home_btn');
            var makeBotsBtn = document.getElementById('make_bots_btn');
            var bldArmorBtn = document.getElementById('bld_armor');
            var bldSpeedBtn = document.getElementById('bld_speed');
            var bldDmgBtn = document.getElementById('bld_damage');

            if (Object.size(SELECTED_SHARDS) > 0) {
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
        };
        for (var i = 0; i < lists.length; i++) {
            var list = lists[i];
            checkSelection();
            list.innerHTML = "";
            for (var j = 0; j < home.shards.length; j++) {
                var entry = document.createElement('li');
                var shard = SHARD_LIST[home.shards[j]];
                entry.id = shard.id;

                (function (_id) {
                    entry.addEventListener("click", function () {
                        if (!this.clicked) {
                            this.clicked = true;
                            this.style.background = "#fffb22";
                            SELECTED_SHARDS[_id] = _id;
                            checkSelection();
                        }
                        else {
                            this.clicked = false;
                            this.style.background = "#542fce";
                            delete SELECTED_SHARDS[_id];
                            checkSelection();
                        }
                    });
                })(entry.id);


                entry.appendChild(document.createTextNode(shard.name));
                list.appendChild(entry);
            }
            list.addEventListener('scroll', function (event) {
                LIST_SCROLL = true;
            });
        }
    }
    function addBots(list, home) {
        list.innerHTML = "";
        for (var i = 0; i < home.bots.length; i++) {
            var entry = document.createElement('li');
            entry.appendChild(document.createTextNode(home.bots[i]));
            list.appendChild(entry);
        }
    }
    function resetButton(button, callback) {
        var setSkillMeter = function (button) {
            var findChildCanvas = function (skillDiv) {
                for (var i = 0; i < skillDiv.childNodes.length; i++) {
                    if (skillDiv.childNodes[i].nodeName.toLowerCase() === "canvas") {
                        return skillDiv.childNodes[i];
                    }
                }
                return null;
            };

            var canvas = findChildCanvas(button.parentNode);
            canvas.width = 260;
            canvas.height = 100;
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
        };
        var newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        button = newButton;
        button.addEventListener('click', callback);
        if (button.upgType) {
            setSkillMeter(button);
        }
    }


    HOME = home;
    addTabListeners();
    openHomeInfo();
    openUpgradesPage();
    openColorPicker(colorPicker, home);

    addShards(shardsLists, home);
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
        LIST_SCROLL = false;
        homeInfo.style.display = 'none';
        socket.emit("removeViewer", {});
    }
}

/** GLOBAL FUNCTIONS **/
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
            buildInfo.shardName + " -- " + Math.floor(buildInfo.timer / 1000) +
            ":" + Math.floor(buildInfo.timer % 1000)));
        list.appendChild(entry);
    }
}


openPlayerNamerUI();
openGameUI();