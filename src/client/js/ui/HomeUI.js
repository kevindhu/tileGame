function HomeUI(client,socket) {
    this.client = client;
    this.socket = socket;
    this.template = document.getElementById('home_ui');
    this.home = null;


}

HomeUI.prototype.open = function (home) {
    this.template.style.display = 'block';
    this.home = home;

    this.addTabListeners();
    this.openHomeInfo();
    this.openUpgradesPage();
    this.openColorPicker(colorPicker);
};

HomeUI.prototype.openHomeInfo = function () {
    document.getElementById('home_type').innerHTML = this.home.type;
    document.getElementById('home_level').innerHTML = this.home.level;
    document.getElementById('home_health').innerHTML = this.home.health;
    document.getElementById('home_power').innerHTML = this.home.power;
    document.getElementById('home_faction_name').innerHTML = this.home.faction;
};

HomeUI.prototype.openUpgradesPage = function () {
    var unitUpgrades = document.getElementById("unit_upgrades");
    var bldBaseHealthBtn = document.getElementById('bld_home_btn');
    var bldArmorBtn = document.getElementById('bld_armor');
    var bldSpeedBtn = document.getElementById('bld_speed');
    var bldDmgBtn = document.getElementById('bld_damage');

    bldBaseHealthBtn.upgType = "homeHealth";
    bldArmorBtn.upgType = "armor";
    bldSpeedBtn.upgType = "speed";
    bldDmgBtn.upgType = "dmg";

    var bldHome = function () {
        this.socket.emit('buildHome', {
            home: this.home.id,
            shards: SELECTED_SHARDS
        })
    }.bind(this);

    var upgUnit = function () {
        this.socket.emit('upgradeUnit', {
            home: this.home.id,
            type: this.upgType,
            shards: SELECTED_SHARDS
        });
    }.bind(this);

    this.resetButton(bldBaseHealthBtn, bldHome);

    if (this.home.type === "Barracks") {
        unitUpgrades.style.display = "block";
        this.resetButton(bldArmorBtn, upgUnit);
        this.resetButton(bldSpeedBtn, upgUnit);
        this.resetButton(bldDmgBtn, upgUnit);
    }
    else {
        unitUpgrades.style.display = "none";
    }


};

HomeUI.prototype.openCreatePage = function () {
    var createBot = document.getElementById("create_bot_container");
    var buildQueue = document.getElementById('build_queue');
    var makeBotsBtn = document.getElementById('make_bots_btn');

    var makeBots = function () {
        console.log(SELECTED_SHARDS);
        socket.emit('makeBots', {
            home: this.home.id,
            shards: SELECTED_SHARDS
        });
    };

    buildQueue.addEventListener('scroll', function (event) {
        this.client.LIST_SCROLL = true;
    });

    if (this.home.type === "Barracks") {
        console.log("RESETTING MAKE_BOTS");
        this.resetButton(makeBotsBtn, makeBots);
        createBot.style.display = "flex";
    } else {
        createBot.style.display = "none";
    }

    addQueueInfo(buildQueue, home);
};

HomeUI.prototype.openBotsPage = function () {
    var botsList = document.getElementById('bots_list');
    if (this.home.type === "Barracks") {
        addBots(botsList, home);
    }
};

HomeUI.prototype.openColorPicker = function (colorPicker, home) {
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
        this.socket.emit("newColor", {
            home: home.id,
            color: {
                r: img_data[0],
                g: img_data[1],
                b: img_data[2]
            }
        });
    });
};



HomeUI.prototype.addTabListeners = function () {
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
        this.openUpgradesPage();
    });

    createTab.addEventListener('click', function (evt) {
        upgradesPage.style.display = "none";
        createPage.style.display = "block";
        botsPage.style.display = "none";
        this.openCreatePage();
    });

    botsTab.addEventListener('click', function (evt) {
        upgradesPage.style.display = "none";
        createPage.style.display = "none";
        botsPage.style.display = "block";
        this.openBotsPage();
    });
};


HomeUI.prototype.addShards = function (lists) {
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
};

HomeUI.prototype.addBots = function (list, home) {
    list.innerHTML = "";
    for (var i = 0; i < home.bots.length; i++) {
        var botInfo = home.bots[i];
        var entry = document.createElement('li');
        entry.appendChild(document.createTextNode(
            botInfo.name + " -- LEVEL:" + botInfo.level));
        list.appendChild(entry);
    }
};

HomeUI.prototype.resetButton = function (button, callback) {
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
                magnitude = this.home.power;
                break;
            case "dmg":
                magnitude = this.home.unitDmg;
                break;
            case "armor":
                magnitude = this.home.unitArmor;
                break;
            case "speed":
                magnitude = this.home.unitSpeed;
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
};

module.exports = openHomeUI;
