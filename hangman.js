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
        ["!start", "Creates a new game for this channelnel if one isn't already started"],
        ["!guess <letter(s)>", "Guess n letters on the current game being played."]
    ];
          
    this.currentGames = {};
    return this;
};

Plugin.prototype = {
    tryCreateGame : function(channel, user, mask, match) {
        var currentGames = this.currentGames;
        var channelGame = this.getGame(channel);
        if(channelGame !== undefined) { 
            this.say(channel, "Can not start game! A Game already running - Started by " + channelGame.user + "");
        } else {
            channelGame = this.startNewGame(channel, user);
            currentGames[channel] = channelGame;
            this.say(channel, "New game started by " + user + "! The word is : " + channelGame.modifiedWord);
        }

        return channelGame;
    },
    tryGuess : function(channel, user, mask, match) {
        var channelGame = this.getGame(channel);
        if(channelGame === undefined) {
            this.say("No game has been started for this channel. To begin one, use the '!start' command. ");
            return;
        }
                
        channelGame.guessLetter(match.charAt(0));
        if(channelGame.isComplete()){ 
            this.say("Well done! " + user + " + has won the game! The word was : " + channelGame.rawWord);
            delete this.currentGames[channel];
        } else if(!channelGame.hasGuessesLeft()) {
            this.say("Game Over! You have no remaining guesses! The word was : " + channelGame.rawWord);
            delete this.currentGames[channel];
        }
    },
    startNewGame : function(channel, user) { 
        var randomWord = this.getRandomWord();
        var game = new HangmanGame(channel, user, randomWord);
        game.say = this.say;
        return game;
    },
    getRandomWord : function(game) {
        return "testingabc123";
    },
    getGame : function(channel) {
        return this.currentGames[channel];
    },
    init: function (parent) {
        this.parent = parent;
    },
};

var HangmanGame = function(channel, user, word){
    this.channel = channel;
    this.user = user;
    
    // TODO array of char is better.
    this.rawWord = word;   
    this.modifiedWord = word.replace(/./g, "_");
    
    this.guessedLetters = new Array(26);

    this.totalWrong = 0;
    this.maxGuesses = 6;
    
    return this;
};

HangmanGame.prototype = {
    guessLetter : function(letter) {
        if(!this.hasGuessesLeft()) {
            throw new Error("You have no guesses left");
         }
    
        letter = letter.toLowerCase();
        var intVal = letter.charCodeAt(0) - 97;
        if(!(intVal >= 0 && intVal <= 26)) {
            this.say("Invalid character " + letter + ". a-z only");
        }
        var guessedLetters = this.guessedLetters;
        if(guessedLetters[intVal]) {
            this.say("You have already guessed the letter " + letter + ". Try again");
        } else {
            this.say("You guessed " + letter);
            
            var charFound = false;
            
            for(var i in this.rawWord) {
                i = Number(i);
                if(this.rawWord[i] === letter) {
                    var str = this.modifiedWord;
                    this.modifiedWord = str.substr(0, i) + letter + str.substr(1 + i);
                    charFound = true;
                }
            }
            
            if(charFound) {
                this.say("You guessed correctly! The word is now : " + this.modifiedWord);
            } else {
                this.totalWrong++;
                this.say("Character not found! You have got " + (this.maxGuesses - this.totalWrong) + " guesses left! " + this.modifiedWord);
            }
            
            guessedLetters[intVal] = true;
        }
    },
    isComplete : function(){
        return this.modifiedWord.indexOf("_") === -1;
    },
    hasGuessesLeft : function() {
        return this.totalWrong < (this.maxGuesses - 1);
    }
};


// TDD plz
(function tests() {   
    // Helper methods
    var Assert = (function() {
        this.log = console.log;
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
                        log("PASSED : Assert <" + assertName  + "> for arg1 <" + arg1 + "> and arg2 <" + arg2 + ">");
                    }
                }
            }).call(this, i, assertFunctions[i]);
        }

        return this;
    })();
    
    var testRunner = (function(tests, continueOnError, createGUI) {
        var testStats = {
            totalTestCount : Object.keys(tests).length - 2,
            testCount : 0,
            passedTests : 0,
            failedTests : 0
        };
        var log = createGUI && document ? (function() { document.write("<pre>"); var f = function(message) { document.write(escape(message).replace(/%(..)/g,"&#x$1;").replace("\n", "<br />") + "<br />"); }; Assert.log = f; return f; })() : function(m) { console.log(m); };

        log("Running tests");
        log("---------------");
        for(var i in tests) {
            if(i == "setUp" || i == "tearDown") continue;
            testStats.testCount++;
            log("Running test number " + testStats.testCount + "/" + testStats.totalTestCount + " name : '" + i + "'");
            tests.setUp();
            try { 
                tests[i]();
                testStats.passedTests++;
            } catch(e) {
                testStats.failedTests++;
                log(["Test Failed for " + i,
                    "Error Message : ", e.message,
                    "Stack Trace : ", e.stack
                ].join("\n"));
                log("Test FAILED for test '" + i + "'");
                if(!continueOnError) {
                    break;
                }
            } finally {
                tests.tearDown();
            }
        }
        log("\n");
        with(testStats) {
            log(["TESTS COMPLETE",
                "Total tests ran : " + testCount,
                "Total test count : " + totalTestCount,
                "passed tests : "  + passedTests,
                "Failed Tests : " + failedTests
            ].join("\n"));
        }
    });  
        
    var tests = {
        setUp : function() { 
            instance = new Plugin();
            instance.say = function(channel, message) { console.log(message); }
        },
        tearDown : function() { 
            instance = undefined;
        },
        testNotRegisteredchannelStartGame : function() {
            instance.tryCreateGame("foo", "bar", "", "");
            Assert.assertNotNull(instance.getGame("foo"));
        },
        testSameGameInstanceReturned : function() {
            var firstInstance = instance.tryCreateGame("foo", "bar", "", "");
            var secondInstance = instance.getGame("foo");
            Assert.assertNotNull(firstInstance);
            Assert.assertNotNull(secondInstance);
            Assert.assertEqual(firstInstance.channel, secondInstance.channel);
            Assert.assertEqual(firstInstance.rawWord, secondInstance.rawWord);
        },
        testAlreadyRegisteredchannelStartGame : function() {
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
        testValidLetter : function() {
            instance.getRandomWord = function() { return "hello"; };
            var game = instance.tryCreateGame("foo", "bar", "", "");    
            instance.tryGuess("foo", "bar", "", "e");

            assertEqual("_e___", instance.getGame("foo").modifiedWord);
        },
        testValidLetters : function() {
            instance.getRandomWord = function() { return "hello"; };
            instance.tryCreateGame("foo", "bar", "", "");    
            instance.tryGuess("foo", "bar", "", "l");
            assertEqual("__ll_", instance.getGame("foo").modifiedWord);
        },
        testValidNotFoundLetter : function() {
            instance.getRandomWord = function() { return "hello"; };
            instance.tryCreateGame("foo", "bar", "", "");    
            instance.tryGuess("foo", "bar", "", "x");
            assertEqual("_____", instance.getGame("foo").modifiedWord);
        },
        testInvalidLetter : function() {
            instance.getRandomWord = function() { return "hello"; };
            instance.tryCreateGame("foo", "bar", "", "");    
            instance.tryGuess("foo", "bar", "", "%");
            assertEqual("_____", instance.getGame("foo").modifiedWord);
        },
        testGameCompleteWhenDone : function() {
            instance.getRandomWord = function() { return "foo"; };
            var game = instance.tryCreateGame("foo", "bar", "", "");    
            instance.tryGuess("foo", "bar", "", "f");
            instance.tryGuess("foo", "bar", "", "o");
            assertEqual("foo", game.modifiedWord);
            assertNull(instance.getGame("foo"));
        },
        testGameCompleteWhenNotDone : function(){
            instance.getRandomWord = function() { return "foo"; };
            var game = instance.tryCreateGame("foo", "bar", "", "");    
            instance.tryGuess("foo", "bar", "", "f");

            assertFalse(game.isComplete());
            assertNotNull(instance.getGame("foo"));
        },
        testMaxGuessesEndsGame : function() {
            instance.getRandomWord = function() { return "hello"; };
            var game = instance.tryCreateGame("foo", "bar", "", "");  
            var guesses = ["a", "b", "c", "d", "e", "f"];
            for(var i in guesses) {
                assertTrue(game.hasGuessesLeft());
                instance.tryGuess("foo", "bar", "", guesses[i]);
            }
            assertFalse(game.hasGuessesLeft());
            assertNull(instance.getGame("foo"));
        },
        testRememberUser : function() {
            instance.tryCreateGame("foo", "bar", "", "");
            Assert.assertEqual(instance.getGame("foo").user, "bar");
        },
        testBlankedOutWord : function() { 
            instance.tryCreateGame("foo", "bar", "", "");
            Assert.assertFalse(/[^_]/.test(instance.getGame("foo").modifiedWord));
        },
    };

    testRunner(tests, false, true);
})();

var exports = {};
exports.Plugin = Plugin;