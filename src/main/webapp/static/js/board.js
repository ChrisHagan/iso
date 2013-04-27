function px(i){
    return ""+i+"px";
}
function degreesToRadians(d){
    var dr = Math.PI / 180;
    return d * dr;
}
function radiansToDegrees(r){
    var rd = 180 / Math.PI;
    return r * rd;
}
function resizeBoard(b,w,h){
    b.attr("width",w)
        .attr("height",h)
        .css({
            width:px(w),
            height:px(h)
        });
}
var graph = {
    players:{},
    rings:{
        0:{
            radius:200,
            x:0,
            y:0
        }
    }
};
function addRing(radius,parentId,arcExtent){
    var offset = graph.rings[parentId].radius + radius;
    graph.rings[_.keys(graph.rings).length] = {
        radius:radius,
        arcExtent:arcExtent,
        parent:parentId,
        x:offset * Math.cos(arcExtent),
        y:offset * Math.sin(arcExtent)
    };
}
var board;
var view = {};
var resources = {
    pending:0
};
function join(name,ring,arcExtent){
    graph.players[name] = {
        id:name,
        ring:ring,
        arcExtent:arcExtent,
        width:100,
        height:36,
        img:resources.boat
    };
}
function localToWorld(d){
    return {
        x: d.x - view.x,
        y: d.y - view.y
    };
}
function drawRing(c){
    return function(i,r){
        var worldC = localToWorld(r);
        var p = resources.planet;
        var side = r.radius / 5;
        c.drawImage(p,
                    worldC.x - side / 2,
                    worldC.y - side / 2,
                    side,
                    side);
    };
}
function drawAttainableRing(c,p){
    var threshold = degreesToRadians(30);
    return function(i,r){
        if(r.parent == p.ring){
            if(Math.abs(p.arcExtent - r.arcExtent) < threshold){
                var attainableWorldCoords = localToWorld(r);
		var reflectionOffset = degreesToRadians(180);
                c.beginPath();
                c.arc(
                    attainableWorldCoords.x,
                    attainableWorldCoords.y,
                    r.radius,
                    p.arcExtent - threshold / 2 + reflectionOffset,
                    p.arcExtent + threshold / 2 + reflectionOffset);
                c.stroke();
            }
        };
    }
}
function drawPlayer(c){
    return function(i,p){
        var r = graph.rings[p.ring];
        var local = {
            x:r.radius * Math.cos(p.arcExtent),
            y:r.radius * Math.sin(p.arcExtent)
        };
        var playerWorldCoords = localToWorld(local);
        var focus = graph.rings[p.ring];
        var focusWorldCoords = localToWorld(focus);

        var orbitExtent = degreesToRadians(30);
        c.strokeStyle = "black";
        c.beginPath();
        c.arc(
            focusWorldCoords.x,
            focusWorldCoords.y,
            r.radius,
            p.arcExtent - orbitExtent,
            p.arcExtent + orbitExtent
        );
        c.stroke();

        $.each(graph.rings,drawAttainableRing(c,p));

        c.drawImage(p.img,
                    playerWorldCoords.x - p.width / 2,
                    playerWorldCoords.y - p.height / 2,
                    p.width,
                    p.height);
    }
}
function tickPlayer(p){
    p.arcExtent = (p.arcExtent += 0.05) % degreesToRadians(360);
}
function draw(b){
    requestAnimationFrame(draw);
    var c = board[0].getContext("2d");
    c.clearRect(0,0,view.width,view.height);

    $.map(graph.players,tickPlayer);
    $.each(graph.rings,drawRing(c));
    $.each(graph.players,drawPlayer(c));
}
function readyResource(name){
    var img = new Image();
    img.onload = function(){
        resources[name] = img;
        if(--resources.pending == 0){
            resources.ready();
        }
    };
    img.src = _.str.sprintf("/static/images/%s.png",name);
}

resources.ready = function(){
    board = $("#board");
    board.css({
        border:"1px solid black"
    });
    resizeBoard(board,1000,800);
    view.x = board.width() / -2;
    view.y = board.height() / -2;
    view.width = board.width();
    view.height = board.height();
    addRing(200,0,1);
    addRing(100,0,4);
    join("player",0,Math.PI);
    requestAnimationFrame(draw);
};
$(function(){
    var toReady = ["boat","planet"];
    resources.pending = toReady.length;
    $.each(toReady,function(i,r){
        readyResource(r);
    });
});
