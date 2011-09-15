 var invaders = function(playfield, fleet, score, lives, level, message) {
        var KEY_LEFT = 37;
        var KEY_RIGHT = 39;
        var KEY_SPACE = 32;
        var KEY_P = 80;
        var KEY_N = 78;
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
        var doPause = function(force) {
                if (force) {
                    bPaused = force !== 'pause'; //invert and follow on to the rest
                }
                if (!bPaused) {
                    $('.bullet').trigger('pause');
                    bPaused = true;
                    message.trigger('update', 'Paused');
                    message.show();
                }
                else {
                    bPaused = false;
                    message.trigger('update', " ");
                    message.hide();
                    $('.bullet').trigger('resume');
                }
            };
        var $ship = $('<div id="shipmover"><div id="ship"></div></div>'); //outer div moves; inner div explodes
        playfield.append($ship);
        $ship.bind('moveShip', function(event, dir) {
            if ($ship.isDying) {
                return;
            }
            var pos = $(this).position();
            $(this).stop(true);
            $(this).animate({
                left: dir > 0 ? (playfield.width()) : 0
            }, {
                duration: 3000 * (dir > 0 ? playfield.width() - pos.left : pos.left) / playfield.width(),
                easing: 'linear'
            });
            event.preventDefault();
            event.stopPropagation();
        });
        $.each([score, lives, level, message], function() {
            $(this).bind('update', function(event, text) {
                $(this).text(text);
            });
        });
        var newShip = function() {
                $ship.find('div#ship').animate({
                    opacity: 'show'
                }, {
                    speed: 'fast',
                    queue: false,
                    complete: function() {
                        $ship.isDying = false;
                        doPause('resume');
                    }
                });
            };
        var killShip = function(bullet) {
                var complete = false;
                $ship.isDying = true;
                $ship.stop(true);
                bullet.stop(true);
                doPause('pause');
                message.trigger('update', " "); //suppress the paused message
                $ship.find('div#ship').animate({
                    opacity: 'hide'
                }, {
                    speed: 'slow',
                    complete: function() {
                        if (!complete) {
                            complete = true;
                            bullet.remove();
                            if (--nLives < 0) {
                                doPause('pause');
                                message.trigger('update', 'GAME OVER');
                            }
                            else {
                                lives.trigger('update', nLives);
                                setTimeout(newShip, 1500);
                            }
                        }
                    }
                });
            };
        var elIntersect = function(el1, el2) {
                var intersect = function(rect1, rect2) {
                        return !(rect1.bottom < rect2.top || rect1.top > rect2.bottom || rect1.right < rect2.left || rect1.left > rect2.right);
                    };
                var boundingRect = function(el) {
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
        var oFleet = (function() {
            var bMovedDown = true;
            var bRight = true;
            return {
                seed: function() {
                    fleet.css({
                        left: 10,
                        top: 10
                    });
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
                },
                move: function() {
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
                    fleet.animate({
                        left: "+=" + (bRight ? "" : "-") + nRight,
                        top: "+=" + nDown
                    }, nFleetMoveSpeed);
                }
            };
        }());
        var oShipBullet = (function() {
            var nShipBullets = 0;
            var shipbulletcollisions = {
                alien: {
                    list: function(bullet) {
                        return $('.alien').filter(function() {
                            return !this.bIgnore && elIntersect(bullet, this);
                        });
                    },
                    oncollide: function() {
                        this.bIgnore = true;
                        $(this).fadeTo('slow', 0.01, function() {
                            $(this).css({
                                visibility: 'hidden'
                            });
                            if ($('.alien').filter(function() {
                                return !this.bIgnore;
                            }).length < 1) {
                                newLevel();
                            }
                        });
                        score.trigger('update', ++nScore);
                    }
                },
                bunker: {
                    list: function() {
                        return [];
                    },
                    oncollide: function() {}
                }
            };
            var bulletDone = function() {
                    $(this).remove();
                    nShipBullets -= 1;
                };
            var step = function() {
                    var bullet = $(this),
                        collided = [];
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
            var animOpts = {
                easing: 'linear',
                complete: bulletDone,
                step: step
            };
            var pause = function() {
                    $(this).stop();
                };
            var resume = function(ev) {
                    $(this).animate({
                        bottom: playfield.height()
                    }, $.extend({
                        duration: 1500 * (1 - $(this).css('bottom').replace(/px$/, "") / playfield.height())
                    }, animOpts));
                };
            return {
                fire: function(ev) {
                    if (nShipBullets < 5) {
                        nShipBullets += 1;
                        var b = $('<span class="bullet shipBullet"></span>');
                        b.bind('pause', pause);
                        b.bind('resume', resume);
                        playfield.append(b.css({
                            left: $ship.position().left + 8
                        }));
                        b.animate({
                            bottom: playfield.height()
                        }, $.extend({duration:1500}, animOpts));
                    }
                }
            };
        }());
        $ship.bind('fire', oShipBullet.fire);
        var oAlienBullet = (function() {
            var step = function() {
                    if (!$ship.isDying) {
                        var bullet = $(this);
                        if (elIntersect(bullet, $ship)) {
                            killShip(bullet);
                        }
                    }
                };
            var complete = function() {
                    $(this).remove();
                };
            var animOpts = {
                easing: 'linear',
                complete: complete,
                step: step
            };
            var pause = function() {
                    $(this).stop();
                };
            var resume = function() {
                    $(this).animate({
                        top: playfield.height()
                    }, $.extend({
                        duration: 1500 * (1 - $(this).css('top').replace(/px$/, "") / playfield.height())
                    }, animOpts));
                };
            return {
                fire: function(ev) {
                    var b = $('<span class="bullet alienBullet"></span>');
                    var alien = $(this);
                    var aOffset = alien.offset();
                    b.bind('pause', pause);
                    b.bind('resume', resume);
                    playfield.before(b.css({
                        left: aOffset.left + 8,
                        top: aOffset.top + alien.height()
                    }));
                    b.animate({
                        top: playfield.height()
                    }, $.extend({duration:1500}, animOpts));
                }
            };
        }());
        $('.alien').live('fire', oAlienBullet.fire);
        $(document).bind('keydown.master', function(ev) {
            if (!bStarted || ev.which === KEY_N) {
                bStarted = true;
                newGame();
                message.hide();
                ev.preventDefault();
            }
            else if (ev.which === KEY_LEFT && !bPaused) {
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
        $(document).bind('keyup', function(ev) {
            if ((ev.which === KEY_LEFT || ev.which === KEY_RIGHT) && !$ship.isDying) {
                $ship.stop();
            }
        });
        var newLevel = function() {
                nLevel += 1;
                level.trigger('update', nLevel);
                lives.trigger('update', nLives);
                score.trigger('update', nScore);
                nFleetMoveInterval *= 0.6;
                nFleetMoveSpeed *= 0.6;
                nAlienFireInterval *= 0.6;
                oFleet.seed();
            };
        var newGame = function() {
                $('.bullet').remove();
                nScore = 0;
                nLives = 3;
                nLevel = 0;
                nFleetMoveInterval = 400;
                nFleetMoveSpeed = 220;
                nAlienFireInterval = 700;
                newLevel();
                newShip();
            };
        var alienFire = function() {
                if (!bPaused) {
                    var aliens = $('.alien').filter(function() {
                        return !this.bIgnore;
                    }),
                        num = aliens.length * 2;
                    aliens.eq(Math.round(Math.random() * num)).trigger('fire'); //num is double, so eq only finds an element half the time, so they only fire half the time
                }
            };
         fleetInterval = window.setInterval(oFleet.move, nFleetMoveInterval);
         alienFireInterval = window.setInterval(alienFire, nAlienFireInterval);
    };
     