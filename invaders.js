/// <reference path="scripts/jquery-1.4.2-vsdoc.js">
$(function () {
    (function (playfield, fleet, score, lives) {
        var KEY_LEFT = 37;
        var KEY_RIGHT = 39;
        var KEY_SPACE = 32;
        var KEY_P = 80;
        var fleetInterval;
        var alienFireInterval;
        var bPaused = false;
        var nScore = 0;
        var nLives = 3;
        var nLevel = 0;
        var nFleetMoveInterval = 400;
        var nFleetMoveSpeed = 120;
        var nAlienFireInterval = 1400;
        var ship = $('<div id="ship"></div>');
        playfield.append(ship);

        score.bind('update', function (event, nNewScore) {
            $(this).text(nNewScore);
        });

        lives.bind('update', function (event, nNewLives) {
            $(this).text(nNewLives);
        });

        var bulletDone = function () {
            $(this).remove();
            ship.nBullets -= 1;
        };
        var shipBulletStep = function () {
            var bullet = $(this);
            var pos = bullet.offset();
            pos.right = pos.left + bullet.width();
            pos.bottom = pos.top + bullet.height();
            $('.alien').filter(function(){return !this.bIgnore;}).each(function (ix) {
                var aPos = $(this).offset();
                aPos.right = aPos.left + $(this).width();
                aPos.bottom = aPos.top + $(this).height();
                if (pos.bottom < aPos.top || pos.top > aPos.bottom ||
                    pos.right < aPos.left || pos.left > aPos.right) return;
                $(this).fadeTo('slow', 0.01, function () {
                    $(this).css({ visibility: 'hidden' });
                    this.bIgnore = true;
                    if($('.alien').filter(function(){return !this.bIgnore;}).length < 1) newLevel();
                });
                score.trigger('update', ++nScore);
                bullet.remove();
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
        var alienBulletStep = function () {
            if (!ship.isDying) {
                var bullet = $(this);
                var pos = bullet.offset();
                pos.right = pos.left + bullet.width();
                pos.bottom = pos.top + bullet.height();
                var sPos = ship.offset();
                sPos.right = sPos.left + ship.width();
                sPos.bottom = sPos.top + ship.height();
                if (pos.bottom < sPos.top || pos.top > sPos.bottom ||
                pos.right < sPos.left || pos.left > sPos.right) return;
                ship.isDying = true;
                ship.stop(true);
                ship.animate({ opacity: 'hide' }, {
                    speed: 'slow',
                    queue: false,
                    complete: function () {
                        if (--nLives < 0) {
                            alert('game over!');
                            doPause();
                            $(document).unbind('keydown.master');
                        }
                        else {
                            lives.trigger('update', nLives);
                            doPause();
                            setTimeout(function () {
                                ship.animate({ opacity: 'show' }, {
                                    speed: 'fast',
                                    queue: false,
                                    complete: function () {
                                        ship.isDying = false;
                                        doPause();
                                    }
                                });
                            }, 1500);
                        }
                    }
                });
                bullet.remove();
            };
        };
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

        $(document).bind('keydown.master', function (ev) {
            if (ev.which === KEY_LEFT && !bPaused && !ship.isDying) {
                ship.trigger('moveShip', -1);
            }
            else if (ev.which === KEY_RIGHT && !bPaused && !ship.isDying) {
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
            if ((ev.which === KEY_LEFT || ev.which === KEY_RIGHT) && !ship.isDying) {
                ship.stop();
            }
        });

        var seedAliens = function () {
            fleet.css({ left: 10, top: 10 });
            bMovedDown = true;
            bRight = true;
            var alien = $('<span class="alien"></span>');
            var innerFleet = fleet.find('div.fleet');
            innerFleet.html('');
            var row = $('<div class="fleetRow"></div>');
            var currentRow;
            for (var y = 0; y < 2; y++) {
                currentRow = row.clone();
                for (var x = 0; x < 4; x++) {
                    currentRow.append(alien.clone());
                }
                innerFleet.append(currentRow);
            }
        };

        var newLevel = function () {
            alert("level " + ++nLevel);
            nFleetMoveInterval *= 0.9;
            nFleetMoveSpeed *= 0.9;
            nAlienFireInterval *= 0.9;
            seedAliens();
        };

        newLevel();

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

        var alienFire = function () {
            if (!bPaused) {
                var aliens = $('.alien').filter(function () { return !this.bIgnore; }), num = aliens.length;
                firingAlien = aliens.eq(Math.round(Math.random() * num));
                firingAlien.trigger('fire');
            }
        }
        $(window).load(function () {
            fleetInterval = window.setInterval(moveFleet, nFleetMoveInterval);
            alienFireInterval = window.setInterval(alienFire, nAlienFireInterval);
        });

    })($('#pf'), $('table.fleet'), $('#score'), $('#lives'));
});