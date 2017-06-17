var canvas = document.getElementById("bigCanvas");
var ctx = canvas.getContext("2d");

ctx.beginPath();
ctx.moveTo(canvas.width/2, canvas.width/2);
ctx.lineTo(canvas.width/2+124, canvas.width/2 + 124);
ctx.stroke();


function openUI(action) {
    var shardNamer = document.getElementById('shard_namer');
    var HQInfo = document.getElementById('HQ_info');

    if (action === "name shard") {
        shardNamer.style.display = 'block';
    }
    if (action === "hq info") {
        HQInfo.style.display = 'block';
        var list = document.getElementById('shards_list');
        list.innerHTML = "";
        addShardsToList(list);
    }
}

function closeUI(action) {
    var shardNamer = document.getElementById('shard_namer');
    var HQInfo = document.getElementById('HQ_info');

    if (action === "name shard") {
        var textInput = document.getElementById("textInput");
        textInput.value = "";
        shardNamer.style.display = 'none';
    }
    if (action === "hq info") {
        HQInfo.style.display = 'none';
    }
}




