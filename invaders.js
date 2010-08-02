/// <reference path="scripts/jquery-1.4.2-vsdoc.js">
$(function () {
    (function (playfield, fleet, score) {
        var KEY_LEFT = 37;
        var KEY_RIGHT = 39;
        var KEY_SPACE = 32;
        var KEY_P = 80;
        var fleetInterval;
        var bPaused = false;
        var nScore = 0;
        var nLives = 3;
        var nFleetMoveInterval = 200;
        var nFleetMoveSpeed = 60;
        var ship = $('<div id="ship"></div>');
        playfield.append(ship);

        score.bind('update', function (event, nNewScore) {
            $(this).text(nNewScore);
        });

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
                    if (pos.bottom < aPos.top || pos.top > aPos.bottom ||
                        pos.right < aPos.left || pos.left > aPos.right) return;
                    $(this).fadeTo('slow', 0.01, function () {
                        $(this).css({ visibility: 'hidden' });
                        this.bIgnore = true;
                    });
                    score.trigger('update', ++nScore);
                    bullet.remove();
                }
            });
        };
        ship.nBullets = 0; //nothing shooting at the moment
        var onBulletPause = function () {
            $(this).stop();
        };
        var onBulletResume = function (ev) {
            $(this).animate({ bottom: playfield.height() }, {
                duration: 1500 * (1 - $(this).css('bottom').replace(/px$/, "") / playfield.height()),
                easing: 'linear',
                complete: bulletDone,
                step: shipBulletStep
            });
        };
        var onFire = function (ev) {
            if (ship.nBullets < 2) {
                ship.nBullets += 1;
                var b = $('<span class="bullet shipBullet"></span>');
                b.bind('pause', onBulletPause);
                b.bind('resume', onBulletResume);
                playfield.append(b.css({ left: ship.position().left + 8 }));
                b.animate({ bottom: playfield.height() }, {
                    duration: 1500,
                    easing: 'linear',
                    complete: bulletDone,
                    step: shipBulletStep
                });
            }
        }
        ship.bind('fire', onFire);
        var alienBulletStep = function () { };
        var alienBulletResume = function () {
            $(this).animate({ top: playfield.height() }, {
                duration: 1500 * (1 - $(this).css('top').replace(/px$/, "") / playfield.height()),
                easing: 'linear',
                complete: function () { $(this).remove(); },
                step: alienBulletStep
            });
        };
        var onAlienFire = function (ev) {
            var b = $('<span class="bullet alienBullet"></span>');
            var alien = $(this);
            var aOffset = alien.offset();
            b.bind('pause', onBulletPause);
            b.bind('resume', alienBulletResume);
            playfield.before(b.css({ left: aOffset.left + 8, top: aOffset.top + alien.height() }));
            b.animate({ top: playfield.height() }, {
                duration: 1500,
                easing: 'linear',
                complete: function () { $(this).remove(); },
                step: alienBulletStep
            });
        };

        $('.alien').live('fire', onAlienFire);

        var moveShip = function (event, dir) {
            var pos = $(this).position();
            $(this).stop(true);
            $(this).animate({ left: dir > 0 ? (playfield.width()) : 0 }, {
                duration: 3000 * (dir > 0 ? playfield.width() - pos.left : pos.left) / playfield.width(),
                easing: 'linear'
            });
            event.preventDefault();
            event.stopPropagation();
        }
        ship.bind('moveShip', moveShip);

        var doPause = function () {
            if (!bPaused) {
                $('.bullet').trigger('pause');
                bPaused = true;
            }
            else {
                bPaused = false;
                $('.bullet').trigger('resume');
            }
        };

        $(document).bind('keydown', function (ev) {
            if (ev.which === KEY_LEFT && !bPaused) {
                ship.trigger('moveShip', -1);
            }
            else if (ev.which === KEY_RIGHT && !bPaused) {
                ship.trigger('moveShip', 1);
            }
            else if (ev.which === KEY_SPACE && !bPaused) {
                ship.trigger('fire');
            }
            else if (ev.which === KEY_P) {
                doPause();
            }
            else if (ev.which === 79) {
                $('.alien').eq(4).trigger('fire');
            }
        });
        $(document).bind('keyup', function (ev) {
            if (ev.which === KEY_LEFT || ev.which === KEY_RIGHT) {
                ship.stop();
            }
        });

        var seedAliens = function () {
            var alien = $('<span class="alien"></span>');
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
        };
        seedAliens();

        var bMovedDown = true;
        var bRight = true;
        var moveFleet = function () {
            var pos = fleet.position();
            pos.right = pos.left + fleet.width();
            var nRight = 0;
            var nDown = 0;
            if (!bPaused) {
                if (!bMovedDown && (pos.left < 16 || pos.right > playfield.width())) {
                    nDown = 10;
                    bMovedDown = true;
                    bRight = !bRight;
                }
                else {
                    nRight = 16;
                    bMovedDown = false;
                }
            }
            fleet.animate({ left: "+=" + (bRight ? "" : "-") + nRight, top: "+=" + nDown }, nFleetMoveSpeed);
        };
        $(window).load(function () { fleetInterval = window.setInterval(moveFleet, nFleetMoveInterval); });

    })($('#pf'), $('table.fleet'), $('#score'));
});