$(document).keydown(function(event) {
    if (event.ctrlKey==true && (event.which == '61' || event.which == '107' || event.which == '173' || event.which == '109'  || event.which == '187'  || event.which == '189'  ) ) {
        event.preventDefault();
    }
    // 107 Num Key  +
    // 109 Num Key  -
    // 173 Min Key  hyphen/underscor Hey
    // 61 Plus key  +/= key
});

$(window).bind('mousewheel DOMMouseScroll', function (event) {
    if (event.ctrlKey === true) {
        event.preventDefault();
    }
    if (shardListScroll) {
        return;
    }
    if(event.originalEvent.wheelDelta /120 > 0 && mainScaleFactor < 2) {
        mainScaleFactor += 0.2;
    }
    else if (mainScaleFactor > 0.7) {
        mainScaleFactor -= 0.2;
    }
});