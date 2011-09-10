$(function () {
    (function (playfield, fleet, score, lives, level, message) {
        var KEY_LEFT = 37;
        var KEY_RIGHT = 39;
        var KEY_SPACE = 32;
        var KEY_P = 80;
        var fleetInterval;
        var alienFireInterval;
        var bPaused = false;
        var bStarted = false;
        var nScore = 0;
        var nLives = 3;
        var nLevel = 0;
        var nFleetMoveInterval = 400;
        var nFleetMoveSpeed = 220;
        var nAlienFireInterval = 700;

        var nRowsOfAliens = 4;
        var nColumnsOfAliens = 6;

        var elIntersect = function (el1, el2) {
            var intersect = function (rect1, rect2) {
                return !(rect1.bottom < rect2.top || rect1.top > rect2.bottom ||
                     rect1.right < rect2.left || rect1.left > rect2.right);
            };
            var boundingRect = function (el) {
                var of = $(el).offset();
                return {
                    top: of.top,
                    left: of.left,
                    right: of.left + $(el).width(),
                    bottom: of.top + $(el).height()
                };
            };
            return intersect(boundingRect(el1), boundingRect(el2));
        };

        var shipbulletcollisions = {
            alien: { list: function (bullet) {
                return $('.alien').filter(function () { return !this.bIgnore && elIntersect(bullet, this); });
            },
                oncollide: function () {
                    this.bIgnore = true;
                    $(this).fadeTo('slow', 0.01, function () {
                        $(this).css({ visibility: 'hidden' });
                        if ($('.alien').filter(function () { return !this.bIgnore }).length < 1) { newLevel(); }
                    });
                    score.trigger('update', ++nScore);
                }
            },
            bunker: { list: function () { return []; }, oncollide: function () { } }
        };

        var $ship = $('<div id="shipmover"><div id="ship"></div></div>'); //outer div moves; inner div explodes
        playfield.append($ship);

        $.each([score, lives, level, message], function () {
            $(this).bind('update', function (event, text) {
                $(this).text(text);
            });
        });

        var bulletDone = function () {
            $(this).remove();
            $ship.nBullets -= 1;
        };
        var shipBulletStep = function () {
            var bullet = $(this), collided = [];
            for (var type in shipbulletcollisions) {
                if (shipbulletcollisions.hasOwnProperty(type)) {
                    collided = shipbulletcollisions[type].list(bullet);
                    if (collided.length > 0) {
                        collided.each(shipbulletcollisions[type].oncollide);
                        bullet.remove();
                    }
                }
            }
        };

        $ship.nBullets = 0; //nothing shooting at the moment
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
            if ($ship.nBullets < 5) {
                $ship.nBullets += 1;
                var b = $('<span class="bullet shipBullet"></span>');
                b.bind('pause', onBulletPause);
                b.bind('resume', onBulletResume);
                playfield.append(b.css({ left: $ship.position().left + 8 }));
                b.animate({ bottom: playfield.height() }, {
                    duration: 1500,
                    easing: 'linear',
                    complete: bulletDone,
                    step: shipBulletStep
                });
            }
        };
        $ship.bind('fire', onFire);

        var alienBulletStep = function () {
            if (!$ship.isDying) {
                var complete = false;
                var bullet = $(this);
                if (!elIntersect(bullet, $ship)) { return; }
                $ship.isDying = true;
                $ship.stop(true);
                bullet.stop(true);
                doPause('pause');
                message.trigger('update', " "); //suppress the paused message
                $ship.find('div#ship').animate({ opacity: 'hide' }, {
                    speed: 'slow',
                    complete: function () {
                        if (!complete) {
                            complete = true;
                            bullet.remove();
                            if (--nLives < 0) {
                                doPause('pause');
                                message.trigger('update', 'GAME OVER');
                                $(document).unbind('keydown.master');
                            }
                            else {
                                lives.trigger('update', nLives);
                                setTimeout(function () {
                                    $ship.find('div#ship').animate({ opacity: 'show' }, {
                                        speed: 'fast',
                                        queue: false,
                                        complete: function () {
                                            $ship.isDying = false;
                                            doPause('resume');
                                        }
                                    });
                                }, 1500);
                            }
                        }
                    }
                });
            }
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
            if ($ship.isDying) { return; }
            var pos = $(this).position();
            $(this).stop(true);
            $(this).animate({ left: dir > 0 ? (playfield.width()) : 0 }, {
                duration: 3000 * (dir > 0 ? playfield.width() - pos.left : pos.left) / playfield.width(),
                easing: 'linear'
            });
            event.preventDefault();
            event.stopPropagation();
        }
        $ship.bind('moveShip', moveShip);

        var doPause = function (force) {
            if (force) {
                bPaused = force !== 'pause'; //invert and follow on to the rest
            }

            if (!bPaused) {
                $('.bullet').trigger('pause');
                bPaused = true;
                message.trigger('update', 'Paused'); message.show();
            }
            else {
                bPaused = false;
                message.trigger('update', " "); message.hide();
                $('.bullet').trigger('resume');
            }
        };

        $(document).bind('keydown.master', function (ev) {
            if (!bStarted) {
                start();
                bStarted = true;
                message.hide();
                ev.preventDefault();
                return;
            }
            if (ev.which === KEY_LEFT && !bPaused) {
                $ship.trigger('moveShip', -1);
                ev.preventDefault();
            }
            else if (ev.which === KEY_RIGHT && !bPaused) {
                $ship.trigger('moveShip', 1);
                ev.preventDefault();
            }
            else if (ev.which === KEY_SPACE && !bPaused) {
                $ship.trigger('fire');
                ev.preventDefault();
            }
            else if (ev.which === KEY_P) {
                doPause();
                ev.preventDefault();
            }
        });
        $(document).bind('keyup', function (ev) {
            if ((ev.which === KEY_LEFT || ev.which === KEY_RIGHT) && !$ship.isDying) {
                $ship.stop();
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
            for (var y = 0; y < nRowsOfAliens; y++) {
                currentRow = row.clone();
                for (var x = 0; x < nColumnsOfAliens; x++) {
                    currentRow.append(alien.clone());
                }
                innerFleet.append(currentRow);
            }
        };

        var newLevel = function () {
            nLevel += 1;
            level.trigger('update', nLevel);
            nFleetMoveInterval *= 0.6;
            nFleetMoveSpeed *= 0.6;
            nAlienFireInterval *= 0.6;
            seedAliens();
        };

        var start = function () {
            bStarted = true;
            newLevel();
        }

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
                var aliens = $('.alien').filter(function () { return !this.bIgnore; }), num = aliens.length * 2;
                aliens.eq(Math.round(Math.random() * num)).trigger('fire'); //num is double, so eq only finds an element half the time, so they only fire half the time
            }
        };

        $(window).load(function () {
            fleetInterval = window.setInterval(moveFleet, nFleetMoveInterval);
            alienFireInterval = window.setInterval(alienFire, nAlienFireInterval);
        });

    })($('#pf'), $('table.fleet'), $('#score'), $('#lives'), $('#level'), $('#message'));
});