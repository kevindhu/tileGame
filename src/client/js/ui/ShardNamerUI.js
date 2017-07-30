function ShardNamerUI(client, socket) {
    this.template = document.getElementById('shard_namer_ui');
    this.textInput = document.getElementById("text_input");
    this.nameShardBtn = document.getElementById("name_shard_btn");

    this.client = client;
    this.socket = socket;

    this.textInput.addEventListener("keyup", function (event) {
        if (event.keyCode === 13) {
            this.submit();
        }
    }.bind(this));
    this.nameShardBtn.addEventListener("click", function (event) {
        this.submit();
    }.bind(this));
}

ShardNamerUI.prototype.open = function () {
    this.template.style.display = 'block';
    this.textInput.focus();
};


ShardNamerUI.prototype.submit = function () {
    var text = document.getElementById("text_input").value;
    if (text !== null && text !== "") {
        this.socket.emit('textInput',
            {
                id: this.client.SELFID,
                word: text
            }
        )
    }
    this.close();
};


ShardNamerUI.prototype.close = function () {
    this.textInput.value = "";
    this.template.style.display = 'none';
};

module.exports = ShardNamerUI;
