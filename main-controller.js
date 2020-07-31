/**
 * Created 2020/06/29.
 *
 * Copyright 2020 Bit Lagoon, Inc.
 * All Rights Reserved
 * This software is distributed for use only by authorized licensees and their agents
 * This software may not be modified or used in any way not expressly granted by Bit Lagoon, Inc.
 * All Bit Lagoon Software is property of Bit Lagoon, Inc and may not be distributed without prior consent.
 * For More Information on Licensing and Usage please contact info@bitlagoon.com
 */


function MainController(arg) {
    window['autoload_fail_handler'] = Controller.prototype.on_submit_fail = function (data) {
        //previously logged in, verify status.

    };

    Controller.call(this, arg);

    var self = this;
    var modal = null;


    var debugmode = false;

    var states = Object.freeze({
        SplashScreen: 0,
        GameScreen: 1,
        ScoreScreen: 2
    });

    var currentstate;

    var gravity = 0.25;
    var velocity = 0;
    var position = 180;
    var rotation = 0;
    var jump = -4.6;
    var flyArea;

    var score = 0;

    var highscore = 0;

    var pipeheight = 200;
    var pipewidth = 52;
    var pipes = new Array();

    var replayclickable = false;

//sounds
    var volume = 30;
    var soundJump = null;
    var soundScore = null;
    var soundHit = null;
    var soundDie = null;
    var soundSwoosh =null;


//loops
    var loopGameloop;
    var loopPipeloop;

    function showSplash() {
        doEvent('show_splash', function () {


            currentstate = states.SplashScreen;

            //set the defaults (again)
            velocity = 0;
            position = 180;
            rotation = 0;
            score = 0;

            //update the player in preparation for the next game
            $("#player").css({y: 0, x: 0});
            updatePlayer($("#player"));

            if (soundSwoosh != null) {
                try {
                    soundSwoosh.stop();
                    soundSwoosh.play();
                } catch {

                }
            }
            //clear out all the pipes if there are any
            $(".pipe").remove();
            pipes = new Array();

            //make everything animated again
            $(".animated").css('animation-play-state', 'running');
            $(".animated").css('-webkit-animation-play-state', 'running');

            //fade in the splash
            $("#splash").animate({opacity: 1}, 2000, 'linear');
        });
    }

    function startGame() {
        doEvent('start', function () {
            currentstate = states.GameScreen;

            //fade out the splash
            $("#splash").stop();
            $("#splash").animate({opacity: 0}, 500, 'linear');

            //update the big score
            setBigScore();

            //debug mode?
            if (debugmode) {
                //show the bounding boxes
                $(".boundingbox").show();
            }

            //start up our loops
            var updaterate = 1000.0 / 60.0; //60 times a second
            loopGameloop = setInterval(gameloop, updaterate);
            loopPipeloop = setInterval(updatePipes, 1400);

            //jump from the start!
            playerJump();
        });
    }

    function updatePlayer(player) {
        //rotation
        rotation = Math.min((velocity / 10) * 90, 90);

        //apply rotation and position
        $(player).css({rotate: rotation, top: position});
    }

    function gameloop() {
        var player = $("#player");

        //update the player speed/position
        velocity += gravity;
        position += velocity;

        //update the player
        updatePlayer(player);

        //create the bounding box
        var box = document.getElementById('player').getBoundingClientRect();
        var origwidth = 34.0;
        var origheight = 24.0;

        var boxwidth = origwidth - (Math.sin(Math.abs(rotation) / 90) * 8);
        var boxheight = (origheight + box.height) / 2;
        var boxleft = ((box.width - boxwidth) / 2) + box.left;
        var boxtop = ((box.height - boxheight) / 2) + box.top;
        var boxright = boxleft + boxwidth;
        var boxbottom = boxtop + boxheight;

        //if we're in debug mode, draw the bounding box
        if (debugmode) {
            var boundingbox = $("#playerbox");
            boundingbox.css('left', boxleft);
            boundingbox.css('top', boxtop);
            boundingbox.css('height', boxheight);
            boundingbox.css('width', boxwidth);
        }

        //did we hit the ground?
        if (box.bottom >= $("#land").offset().top) {
            playerDead();
            return;
        }

        //have they tried to escape through the ceiling? :o
        var ceiling = $("#ceiling");
        if (boxtop <= (ceiling.offset().top + ceiling.height()))
            position = 0;

        //we can't go any further without a pipe
        if (pipes[0] == null)
            return;

        //determine the bounding box of the next pipes inner area
        console.log('calculate collision');
        var nextpipe = pipes[0];
        var nextpipeupper = nextpipe.children(".pipe_upper");
        console.log(nextpipe.data());
        //nextpipe.css('background-color', 'green');

        var width = nextpipe.data('width');
        var pipetop = nextpipeupper.offset().top + nextpipeupper.height();
        var pipeleft = nextpipeupper.offset().left - 2; // for some reason it starts at the inner pipes offset, not the outer pipes.
        var piperight = pipeleft + width;
        var pipebottom = pipetop + pipeheight;

        pipetop = nextpipe.data('topheight');
        pipebottom = flyArea - nextpipe.data('bottomheight');
        var gap_height = pipebottom - pipetop;


        if (debugmode) {
            var boundingbox = $("#pipebox");
            boundingbox.css('left', pipeleft);
            boundingbox.css('top', pipetop);
            boundingbox.css('height', gap_height);
            boundingbox.css('width', width);
            //
            // if (boxright > pipeleft) {
            //     $(".animated").css('animation-play-state', 'paused');
            //     $(".animated").css('-webkit-animation-play-state', 'paused');
            //     //debugger;
            //
            //     $(".animated").css('animation-play-state', 'running');
            //     $(".animated").css('-webkit-animation-play-state', 'running');
            // }
        }

        //have we gotten inside the pipe yet?
        if (boxright > pipeleft) {
            //we're within the pipe, have we passed between upper and lower pipes?
            if (boxtop > pipetop && boxbottom < pipebottom) {
                //yeah! we're within bounds

            } else {
                //no! we touched the pipe
                playerDead();
                return;
            }
        }


        //have we passed the imminent danger?
        if (boxleft > piperight) {
            //yes, remove it
            pipes.splice(0, 1);

            //and score a point
            playerScore();
        }
    }

    function screenClick() {
        if (currentstate == states.GameScreen) {
            playerJump();
        } else if (currentstate == states.SplashScreen) {
            if (soundSwoosh == null && !isIncompatible.any()) {
                soundJump = new buzz.sound("/Floppy/assets/sounds/sfx_wing_short.ogg");
                soundScore = new buzz.sound("/Floppy/assets/sounds/sfx_point.ogg");
                soundHit = new buzz.sound("/Floppy/assets/sounds/sfx_hit.ogg");
                soundDie = new buzz.sound("/Floppy/assets/sounds/sfx_die.ogg");
                soundSwoosh = new buzz.sound("/Floppy/assets/sounds/sfx_swooshing.ogg");
                buzz.all().setVolume(volume);
            }
            startGame();
        }
    }

    function doEvent(event, callback) {
        setTimeout(function () {
            var d = {
                velocity: velocity,
                gravity: gravity,
                jump: jump,
                event: event,
                position: position,
                rotation: rotation,
                score: score,
                pipeheight: pipeheight,
            }
            self.SubmitObject(d, 'api/do-event', function (rsp) {
                if (!rsp.response_code) {
                    playerDead();
                    if (typeof callback == 'function') {
                        callback(rsp);
                    }
                    return;
                }
                var data = rsp.data;
                gravity = data.gravity;
                jump = data.jump;
                score = data.score;
                pipeheight = data.pipeheight;
                highscore = data.highscore;
                if (data.game_message != null) {
                    playerDead();
                    var message = $(data.game_message);
                    $('#gamecontainer').replaceWith(message);
                }
                if (typeof callback == 'function') {
                    callback(rsp);
                }
            });
        }, 0);
    }

    function playerJump() {
        velocity = jump;
        //play jump sound
        try {
            if (!isIncompatible.any()) {
                soundJump.stop();
                soundJump.play();
            }
        } catch {
        }
        doEvent('jump', function (rsp) {

        });
    }

    function setBigScore(erase) {
        var elemscore = $("#bigscore");
        elemscore.empty();

        if (erase)
            return;

        var digits = score.toString().split('');
        for (var i = 0; i < digits.length; i++)
            elemscore.append("<img src='/Floppy/assets/font_big_" + digits[i] + ".png' alt='" + digits[i] + "'>");
    }

    function setSmallScore() {
        var elemscore = $("#currentscore");
        elemscore.empty();

        var digits = score.toString().split('');
        for (var i = 0; i < digits.length; i++)
            elemscore.append("<img src='/Floppy/assets/font_small_" + digits[i] + ".png' alt='" + digits[i] + "'>");
    }

    function setHighScore() {
        var elemscore = $("#highscore");
        elemscore.empty();

        var digits = highscore.toString().split('');
        for (var i = 0; i < digits.length; i++)
            elemscore.append("<img src='/Floppy/assets/font_small_" + digits[i] + ".png' alt='" + digits[i] + "'>");
    }

    function setMedal() {
        var elemmedal = $("#medal");
        elemmedal.empty();

        if (score < 10)
            //signal that no medal has been won
            return false;

        if (score >= 10)
            medal = "bronze";
        if (score >= 20)
            medal = "silver";
        if (score >= 30)
            medal = "gold";
        if (score >= 40)
            medal = "platinum";

        elemmedal.append('<img src="/Floppy/assets/medal_' + medal + '.png" alt="' + medal + '">');

        //signal that a medal has been won
        return true;
    }

    function plasfsdfsdfsdfyerDead() {
        if (currentstate == states.GameScreen) {
            //stop animating everything!
            $(".animated").css('animation-play-state', 'paused');
            $(".animated").css('-webkit-animation-play-state', 'paused');

            //drop the bird to the floor
            var playerbottom = $("#player").position().top + $("#player").width(); //we use width because he'll be rotated 90 deg
            var floor = flyArea;
            var movey = Math.max(0, floor - playerbottom);
            $("#player").animate({y: movey + 'px', rotate: 90}, 1000, 'linear');

            //it's time to change states. as of now we're considered ScoreScreen to disable left click/flying
            currentstate = states.ScoreScreen;

            //destroy our gameloops
            clearInterval(loopGameloop);
            clearInterval(loopPipeloop);
            loopGameloop = null;
            loopPipeloop = null;

            doEvent('dead', function () {
                //mobile browsers don't support buzz bindOnce event
                if (isIncompatible.any()) {
                    //skip right to showing score
                    showScore();
                } else {
                    //play the hit sound (then the dead sound) and then show score
                    try {
                        soundHit.play().bindOnce("ended", function () {
                            soundDie.play().bindOnce("ended", function () {
                                showScore();
                            });
                        });
                    } catch {
                        showScore();
                    }
                }
            });
        }
    }

    function showScore() {
        //unhide us
        var scoreboard = $("#scoreboard");
        if(scoreboard.length == 0) return;
        scoreboard.css("display", "block");

        //remove the big score
        setBigScore(true);

        //have they beaten their high score?
        if (score > highscore) {
            //yeah!
            highscore = score;
        }

        //update the scoreboard
        setSmallScore();
        setHighScore();
        var wonmedal = setMedal();

        //SWOOSH!
        if (soundSwoosh != null) {
            try {
                if (!isIncompatible.any()) {
                    soundSwoosh.stop();
                    soundSwoosh.play();
                }
            } catch (e) {

            }
        }

        //show the scoreboard
        $("#scoreboard").css({y: '40px', opacity: 0}); //move it down so we can slide it up
        $("#replay").css({y: '40px', opacity: 0});
        $("#scoreboard").animate({y: '0px', opacity: 1}, 600, 'linear', function () {
            //When the animation is done, animate in the replay button and SWOOSH!
            if (soundSwoosh != null) {
                try {
                    if (!isIncompatible.any()) {
                        soundSwoosh.stop();
                        soundSwoosh.play();
                    }
                } catch (e) {

                }
            }
            $("#replay").animate({y: '0px', opacity: 1}, 600, 'linear');

            //also animate in the MEDAL! WOO!
            if (wonmedal) {
                $("#medal").css({scale: 2, opacity: 0});
                $("#medal").animate({opacity: 1, scale: 1}, 1200, 'linear');
            }
        });

        //make the replay button clickable
        replayclickable = true;
    }

    //record players score
    function playerScore() {

        setTimeout(function () {
            try {
                if (!isIncompatible.any()) {
                    soundScore.stop();
                    soundScore.play();
                }
            } catch (e) {

            }
        }, 0);

        doEvent('score', function () {
            setBigScore();
        });
    }

    function updatePipes() {
        //Do any pipes need removal?
        $(".pipe").filter(function () {
            return $(this).position().left <= -100;
        }).remove()

        //add a new pipe (top height + bottom height  + pipeheight == flyArea) and put it in our tracker
        console.log('update pipes');
        var padding = 80;
        var constraint = flyArea - pipeheight - (padding * 2); //double padding (for top and bottom)
        var topheight = Math.floor((Math.random() * constraint) + padding); //add lower padding
        var bottomheight = (flyArea - pipeheight) - topheight;
        var newpipe = $('<div class="pipe animated">' +
            '<div class="pipe_upper" style="height: ' + topheight + 'px;"></div>' +
            '<div class="pipe_lower" style="height: ' + bottomheight + 'px;"></div></div>');
        newpipe.data('topheight', topheight);
        newpipe.data('bottomheight', bottomheight);
        newpipe.data('width', pipewidth);
        $("#flyarea").append(newpipe);
        pipes.push(newpipe);
    }

    var isIncompatible = {
        Android: function () {
            return navigator.userAgent.match(/Android/i);
        },
        BlackBerry: function () {
            return navigator.userAgent.match(/BlackBerry/i);
        },
        iOS: function () {
            return navigator.userAgent.match(/iPhone|iPad|iPod/i);
        },
        Opera: function () {
            return navigator.userAgent.match(/Opera Mini/i);
        },
        Safari: function () {
            return (navigator.userAgent.match(/OS X.*Safari/) && !navigator.userAgent.match(/Chrome/));
        },
        Windows: function () {
            return navigator.userAgent.match(/IEMobile/i);
        },
        any: function () {
            return (isIncompatible.Android() || isIncompatible.BlackBerry() || isIncompatible.iOS() || isIncompatible.Opera() || isIncompatible.Safari() || isIncompatible.Windows());
        }
    };

    var initialized = false;

    this.on_show = function () {
        if (initialized) return;
        flyArea = $("#flyarea").height();

        $("#replay").click(function () {
            //make sure we can only click once
            if (!replayclickable)
                return;
            else
                replayclickable = false;
            //SWOOSH!
            if (soundSwoosh != null) {
                soundSwoosh.stop();
                soundSwoosh.play();
            }

            //fade out the scoreboard
            $("#scoreboard").animate({y: '-40px', opacity: 0}, 1000, 'linear', function () {
                //when that's done, display us back to nothing
                $("#scoreboard").css("display", "none");

                //start the game over!
                showSplash();
            });
        });
        //Handle space bar
        $(document).keydown(function (e) {
            //space bar!
            if (e.keyCode == 32) {
                //in ScoreScreen, hitting space should click the "replay" button. else it's just a regular spacebar hit
                if (currentstate == states.ScoreScreen)
                    $("#replay").click();
                else
                    screenClick();
            }
        });

        //Handle mouse down OR touch start
        if ("ontouchstart" in window)
            $(document).on("touchstart", screenClick);
        else
            $(document).on("mousedown", screenClick);

        showSplash();
        initialized = true;
    }

}


if (typeof ($) === "undefined") {
    window.addEventListener("load", function () {
        MainController.prototype = Object.create(Controller.prototype);
    }, false);
} else {
    MainController.prototype = Object.create(Controller.prototype);
}


