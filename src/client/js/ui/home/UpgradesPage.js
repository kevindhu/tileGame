var ListUI = require('./ListUI');

function UpgradesPage(homeUI) {
    this.template = document.getElementById("upgrades_page");
    this.unitUpgrades = document.getElementById("unit_upgrades");
    this.bldBaseHealthBtn = document.getElementById('bld_home_btn');
    this.bldArmorBtn = document.getElementById('bld_armor');
    this.bldSpeedBtn = document.getElementById('bld_speed');
    this.bldDmgBtn = document.getElementById('bld_damage');

    this.SELECTED_SHARDS = {};

    this.shardsUI = new ListUI(document.getElementById("upgrades_shards_list"),homeUI, this);
    this.homeUI = homeUI;

    this.shardsUI.addShards();
}

UpgradesPage.prototype.open = function () {
    this.template.style.display = "block";
    this.bldBaseHealthBtn.upgType = "homeHealth";
    this.bldArmorBtn.upgType = "armor";
    this.bldSpeedBtn.upgType = "speed";
    this.bldDmgBtn.upgType = "dmg";

    var bldHome = function () {
        this.socket.emit('buildHome', {
            home: this.homeUI.home.id,
            shards: this.SELECTED_SHARDS
        })
    }.bind(this);
    var upgUnit = function () {
        this.socket.emit('upgradeUnit', {
            home: this.homeUI.home.id,
            type: this.upgType,
            shards: SELECTED_SHARDS
        });
    }.bind(this);


    this.bldBaseHealthBtn = this.homeUI.resetButton(this.bldBaseHealthBtn, bldHome);

    if (this.homeUI.home.type === "Barracks") {
        this.unitUpgrades.style.display = "block";
        this.bldArmorBtn = this.homeUI.resetButton(this.bldArmorBtn, upgUnit);
        this.bldSpeedBtn = this.homeUI.resetButton(this.bldSpeedBtn, upgUnit);
        this.bldDmgBtn = this.homeUI.resetButton(this.bldDmgBtn, upgUnit);
    }
    else {
        this.unitUpgrades.style.display = "none";
    }
};


UpgradesPage.prototype.close = function () {
    this.template.style.display = "none";
};


module.exports = UpgradesPage;