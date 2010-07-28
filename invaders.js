/// <reference path="scripts/jquery-1.4.2-vsdoc.js">
$(function () {
    (function (ship, playfield, fleet) {
        var KEY_LEFT = 37;
        var KEY_RIGHT = 39;
        var KEY_SPACE = 32;
        var KEY_P = 80;
        var fleetInterval;
        var bPaused = false;

        var bulletDone = function () {
            $(this).remove();
            ship.nBullets -= 1;
        };
        var shipBulletStep = function () {
            var pos = $(this).offset();
            pos.right = pos.left + $(this).width();
            pos.bottom = pos.top + $(this).height();
            var bullet = $(this);
            $('.alien').each(function (ix) {
                if (!this.bIgnore) {
                    var aPos = $(this).offset();
                    aPos.right = aPos.left + $(this).width();
                    aPos.bottom = aPos.top + $(this).height();
                    if (pos.left < aPos.left || pos.top < aPos.top || pos.right > aPos.right || pos.bottom > aPos.bottom) return;
                    $(this).fadeTo('slow', 0.01, function () { $(this).css({ visibility: 'hidden' }); this.bIgnore = true; });
                    bullet.remove();
                }
            });
        };
        ship.nBullets = 0; //nothing shooting at the moment
        var onFire = function () {
            if (ship.nBullets < 2) {
                ship.nBullets += 1;
                var b = $('<div class="bullet"></div>');
                ship.before(b.css({ left: ship.position().left + 8 }));
                b.animate({ bottom: 300 }, {
                    duration: 1500,
                    easing: 'linear',
                    complete: bulletDone,
                    step: shipBulletStep
                });
            }
        }
        ship.bind('fire', onFire);

        var moveShip = function (event, dir) {
            var pos = $(this).position();
            if (dir === -1 && pos.left < 16) return;
            if (dir === 1 && pos.left + 16 > playfield.width()) return;
            $(this).stop(true);
            $(this).animate({ left: "+=" + (dir * 16) });
        }
        ship.bind('move', moveShip);
        $(document).bind('keydown', function (ev) {
            console.log(ev.which);
            if (ev.which === KEY_LEFT) {
                ship.trigger('move', -1);
            }
            else if (ev.which === KEY_RIGHT) {
                ship.trigger('move', 1);
            }
            else if (ev.which === KEY_SPACE) {
                ship.trigger('fire');
            }
            else if (ev.which === KEY_P) {
                if (!bPaused) {
                    window.clearInterval(fleetInterval);
                    //TODO stop bullets too
                    bPaused = true;
                }
                else {
                    fleetInterval = window.setInterval(moveFleet, 200);
                    bPaused = false;
                }
            }
        });

        var alien = $('<div class="alien"></div>');
        var innerFleet = fleet.find('div.fleet');
        var row = $('<div class="fleetRow"></div>');
        var currentRow;
        for (var y = 0; y < 3; y++) {
            currentRow = row.clone();
            for (var x = 0; x < 8; x++) {
                currentRow.append(alien.clone());
            }
            innerFleet.append(currentRow);
        }

        var bMovedDown = false;
        var bRight = false;
        var moveFleet = function () {
            var pos = fleet.position();
            pos.right = pos.left + fleet.width();
            var nRight = 0;
            var nDown = 0;
            if (!bMovedDown && (pos.left < 16 || pos.right > playfield.width())) {
                nDown = 10;
                bMovedDown = true;
                bRight = !bRight;
            }
            else {
                nRight = 16;
                bMovedDown = false;
            }
            fleet.animate({ left: "+=" + (bRight ? "" : "-") + nRight, top: "+=" + nDown }, 60);
        };
        fleetInterval = window.setInterval(moveFleet, 200);

    })($('#ship'), $('#pf'), $('table.fleet'));
});