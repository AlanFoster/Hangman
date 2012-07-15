var Plugin = function () {
    this.about = {
        name : "Hangman",
        description : "A game of hangman",
        author : "Alan Foster (http://www.alanfoster.me)"
    };

     this.triggers = [
        [/^!start/, this.tryCreateGame],
        [/^!guess (.*)/, this.tryGuess]
     ];
     
    this.help = [
        ["!start", "Creates a new game for this channel if one isn't already started"],
        ["!guess <letter(s)>", "Guess n letters on the current game being played."]
    ];
          
    this.currentGames = {};
}
Plugin.prototype = {
    tryCreateGame : function(chan, user, mask, match) {
        var currentGames = this.currentGames;
        var channelGame = this.getGame(chan);
        if(channelGame !== undefined) { 
            this.say(chan, "Can not start game! A Game already running - Started by " + channelGame.user + "");
        } else {
            var newGame = this.startNewGame(chan, user);
            currentGames[chan] = newGame;
            this.say(chan, "New game started by " + user + "! The word is : " + newGame.modifiedWord);
        }
        return channelGame;
    },
    tryGuess : function(chan, user, mask, match) {
        throw new Error("no");
    },
    startNewGame : function(chan, user) { 
        var randomWord = this.getRandomWord();

        var game = { 
            "channel" : chan,
            "user" : user, 
            "rawWord" : randomWord,
            "modifiedWord" : randomWord.replace(/./g, "_"),
            // TODO - Test if map would be better
            "guessedLetters" : new Array(26)
        }
        return game;
    },
    getRandomWord : function(game) {
        return "testingabc123";
    },
    getGame : function(chan) {
        return this.currentGames[chan];
    },
    guessLetter : function(game, letter) {
       letter = letter.toLowerCase();
       var intVal = letter.charCodeAt(0) - 97;
       if(!(intVal >= 0 && intVal <= 26)) {
        this.say("Invalid character " + letter + ". a-z only");
       }
       var guessedLetters = game.guessedLetters;
       if(guessedLetters[intVal]) {
           this.say("You have already guessed the letter " + letter + ". Try again");
        } else {
            this.say("You guessed " + letter);

            guessedLetters[intVal] = true;
        }
    },
    init: function (parent) {
        this.parent = parent;
    },
};

// TDD plz
(function tests() {   
    // Helper methods
    var Assert = (function() {
        var assertFunctions = {
            "assertEqual" : function(expected, actual) { return expected === actual; },
            "assertNotEqual" : function(expected, actual) { return expected !== actual; },
            "assertNotNull": function(obj) { return obj !== undefined; },
            "assertNull" : function(obj) { return obj === undefined; },
            "assertFalse" : function(obj) { return obj === false; },
            "assertTrue" : function(obj) { return obj === true; }
        }
        
        for(var i in assertFunctions) {
            (function(assertName, assertFunction) {
                this[assertName] = function(arg1, arg2) {
                    var assertPassed = assertFunction(arg1, arg2);
                
                    if(!assertPassed) {
                        throw new Error("FAILED : Assert <" + assertName  + "> did not pass for arg1 <" + arg1 + "> and arg2 <" + arg2 + ">");
                    } else {
                        console.log("PASSED : Assert <" + assertName  + "> for arg1 <" + arg1 + "> and arg2 <" + arg2 + ">");
                    }
                }
            }).call(this, i, assertFunctions[i]);
        }

        return this;
    })();
        
    var tests = {
        setUp : function() { 
            instance = new Plugin();
            instance.say = function(chan, message) { console.log(message); }
        },
        tearDown : function() { 
            instance = undefined;
        },
        testNotRegisteredChannelStartGame : function() {
            instance.tryCreateGame("foo", "bar", "", "");
            Assert.assertNotNull(instance.getGame("foo"));
        },
        testAlreadyRegisteredChannelStartGame : function() {
            instance.tryCreateGame("foo", "bar", "", "");    
            var previousWord = instance.getGame("foo").rawWord;
            instance.tryCreateGame("foo", "bar", "", "");
            Assert.assertEqual(previousWord, instance.getGame("foo").rawWord);
        },
        testRegisterTwoGames : function() {
            instance.tryCreateGame("first", "barOne", "", "");
            var firstCreatedUser = instance.getGame("first").user;
            instance.tryCreateGame("second", "barTwo", "", "");
            var secondCreatedUser = instance.getGame("second").user;
            assertNotEqual(firstCreatedUser, secondCreatedUser);
        },
        testTryGuess : function() {

        },
        testValidLetter : function() {
            instance.getRandomWord = function() { return "hello"; };
            var game = instance.tryCreateGame("foo", "bar", "", "");
            instance.guessLetter(game, "e");
            assertEqual("_e___", game.modifiedWord);
        },
        testValidLetters : function() {
            instance.getRandomWord = function() { return "hello"; };
            var game = instance.tryCreateGame("foo", "bar", "", "");
            instance.guessLetter(game, "l");
            assertEqual("__ll_", game.modifiedWord);
        },
        testValidNotFoundLetter : function() {
            instance.getRandomWord = function() { return "hello"; };
            var game = instance.tryCreateGame("foo", "bar", "", "");
            instance.guessLetter(game, "x");
            assertEqual("_____", game.modifiedWord);
        },
        testInvalidLetter : function() {
            var game = instance.tryCreateGame("foo", "bar", "", "");
            instance.guessLetter(game, "%");
            Assert.assertFalse(/[^_]/.test(instance.getGame("foo").modifiedWord));
        },
        testRememberUser : function() {
            instance.tryCreateGame("foo", "bar", "", "");
            Assert.assertEqual(instance.getGame("foo").user, "bar");
        },
        testBlankedOutWord : function() { 
            instance.tryCreateGame("foo", "bar", "", "");
            Assert.assertFalse(/[^_]/.test(instance.getGame("foo").modifiedWord));
        }
    };
    
    console.log("Running hangman tests");
    var totalTests = Object.keys(tests).length - 2;
    var testCount = 0;
    var runAllTests = true;
    for(var i in tests) {
        if(i == "setUp" || i == "tearDown") continue;
        testCount++;
        console.log("Running test number <" + testCount + "/" + totalTests + " name <" + i + ">");
        tests.setUp();
        try { 
            tests[i]();
        } catch(e) {
            console.log(e);
            console.log("Test FAILED for test <" + i + ">");
            if(!runAllTests) {
                break;
            }
        } finally {
            tests.tearDown();
        }
    }
})();

var exports = {};
exports.Plugin = Plugin;