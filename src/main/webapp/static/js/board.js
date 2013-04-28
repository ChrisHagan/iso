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
            id:0,
            radius:200,
            x:0,
            y:0,
            links:{}
        }
    }
};
function addRing(radius,parentId,arcExtent){
    var parent = graph.rings[parentId];
    var offset = parent.radius + radius;
    var id = _.keys(graph.rings).length;
    graph.rings[id] = {
        id:id,
        links:{},
        radius:radius,
        x:offset * Math.cos(arcExtent),
        y:offset * Math.sin(arcExtent)
    };
    var reflectedExtent = clampToCircle(arcExtent + degreesToRadians(180));
    graph.rings[id].links[parentId] = reflectedExtent;
    parent.links[id] = arcExtent;
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
        jumping:false,
        img:resources.boat,
        speed:degreesToRadians(2)
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
        c.strokeStyle = style.orbit;
        $.each(r.links,function(k,v){
            c.beginPath();
            c.arc(worldC.x,
                  worldC.y,
                  r.radius - 20,
                  v-0.1,
                  v+0.1);
            c.stroke();
        });
        c.fillStyle = "white";
        c.font = "bold 16px Arial";
        c.fillText(""+r.id,
                   worldC.x,
                   worldC.y - 30);
        c.drawImage(p,
                    worldC.x - side / 2,
                    worldC.y - side / 2,
                    side,
                    side);
    };
}
function ringChecker(player){
    var threshold = 20;
    return function(ring){
        return isAttainableRing(player,ring,threshold);
    };
}
function isConnected(r1,r2){
    return r2.id in r1.links;
}
function playerLocalCoords(player,pRing){
    return {
	x:pRing.x + pRing.radius * Math.cos(player.arcExtent),
	y:pRing.y + pRing.radius * Math.sin(player.arcExtent)
    };
}
function playerToRingDistance(player,pRing,ring){
    var playerCoords = playerLocalCoords(player,pRing);
    var xDelta = playerCoords.x - ring.x;
    var yDelta = playerCoords.y - ring.y;
    return Math.sqrt(Math.pow(xDelta,2) + Math.pow(yDelta,2));
}
function isAttainableRing(player,ring,threshold){
    var pRing = graph.rings[player.ring];
    var alternative = ring.id != player.ring;
    var contiguous = isConnected(pRing,ring);
    var distanceToRing = playerToRingDistance(player,pRing,ring);
    var close =  distanceToRing < ring.radius + threshold;
    var attainable = alternative && contiguous && close;
    return attainable;
}
function drawAttainableRing(c,p){
    var threshold = 100;
    return function(id){
        var r = graph.rings[id];
        if(isAttainableRing(p,r,threshold)){
            var attainableWorldCoords = localToWorld(r);
            var gradientToPlayerRing = r.links[p.ring];
            c.strokeStyle = style.orbit;
            c.beginPath();
            c.arc(
                attainableWorldCoords.x,
                attainableWorldCoords.y,
                r.radius,
                gradientToPlayerRing,
                gradientToPlayerRing - threshold);
            c.stroke();
        }
    };
}
var style = {
    orbit:"red"
};
function drawPlayer(c){
    return function(i,p){
        var pRing = graph.rings[p.ring];
        var local = playerLocalCoords(p,pRing);
        var playerWorldCoords = localToWorld(local);
        var focusWorldCoords = localToWorld(pRing);

        $.each(pRing.links,drawAttainableRing(c,p));

        c.drawImage(p.img,
                    playerWorldCoords.x - p.width / 2,
                    playerWorldCoords.y - p.height / 2,
                    p.width,
                    p.height);
    }
}
function clampToCircle(radians){
    return radians % degreesToRadians(360);
}
function tickPlayer(p){
    if(p.jumping){
        var attainableRings = _.values(graph.rings).filter(ringChecker(p));
        if(attainableRings.length > 0){
            var pRing = graph.rings[p.ring];
            var newRing = attainableRings[0];
            p.speed *= -1;
            p.arcExtent = newRing.links[p.ring];
            p.ring = newRing.id;
            p.jumping = false;
        }
    }
    p.arcExtent = clampToCircle(p.arcExtent + p.speed);
}
function draw(b){
    requestAnimationFrame(draw);
    var c = board[0].getContext("2d");
    c.fillStyle = "black";
    c.fillRect(0,0,view.width,view.height);

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
    for(var i = 0; i < 4; i++){
        addRing(100,0,i);
    }
    join("player",0,Math.PI);
    requestAnimationFrame(draw);
};
$(function(){
    var toReady = ["boat","planet"];
    resources.pending = toReady.length;
    $.each(toReady,function(i,r){
        readyResource(r);
    });
    $("body").on("keypress",function(k){
        switch(k.which){
        case 32://space
            graph.players.player.jumping = true;
            break;
        }
    });
});
