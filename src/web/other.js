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




