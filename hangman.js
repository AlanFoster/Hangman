var Plugin = function () {
    this.about = {
        name : "Hangman",
        description : "A game of hangman",
        author : "Alan Foster (http://www.alanfoster.me)"
    };

     this.triggers = [
        [/^!start/, this.tryCreateGame],
        [/^!guess (.)/, function(channel, user, mask, match) { this.tryGuess(channel, user, mask, match[1]); }]
     ];
     
    this.help = [
        ["!start", "Creates a new game for this channelnel if one isn't already started"],
        ["!guess <letter>", "Guess one letter on the current game being played."]
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
            this.say(channel, "No game has been started for this channel. To begin one, use the '!start' command. ");
            return;
        }
                
        channelGame.guessLetter(match.charAt(0));

        if(channelGame.isComplete()){ 
            this.say(channel, "Well done! " + user + " has won the game! The word was : " + channelGame.rawWord);
            delete this.currentGames[channel];
        } else if(!channelGame.hasGuessesLeft()) {
            this.say(channel, "Game Over! You have no remaining guesses! The word was : " + channelGame.rawWord);
            delete this.currentGames[channel];
        }
    },
    startNewGame : function(channel, user) { 
        var randomWord = this.getRandomWord();
        var game = new HangmanGame(channel, user, randomWord);
        game.say = function(message) { this.say(channel, message); }.bind(this);
        return game;
    },
    getRandomWord : function(game) {
        return "testingabc";
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
    this.arrayModifiedWord = word.replace(/./g, "_").split("");
    
    this.guessedLetters = [];

    this.totalWrong = 0;
    this.maxGuesses = 6;
    
    this.updateState();

    return this;
};

HangmanGame.prototype = {
    guessLetter : function(letter) {
        if(!this.hasGuessesLeft()) {
            throw new Error("You have no guesses left");
        }
    
        letter = letter.toLowerCase();

        if(!(letter >= 'a' && letter <= 'z')) {
            this.say("Invalid character " + letter + ". a-z only");
            return;
        }
        
        var guessedLetters = this.guessedLetters;
        if(guessedLetters.indexOf(letter) > -1) {
            this.say("You have already guessed the letter " + letter + ". Try again. " + this.getState());
        } else {      
            this.guessedLetters.push(letter);
            var charFound = this.addLetter(letter);
            this.updateState();
            
            if(charFound) {
                this.say("You guessed '" + letter + "' correctly! The word is now : " + this.getState());
            } else {
                this.totalWrong++;
                this.say("Character '" + letter + "' not found! You have got " + (this.maxGuesses - this.totalWrong) + " guesses left! " + this.getState());
            }
        }
    },
    addLetter : function(letter) {
        var charFound;
        for(var i in this.rawWord) {
            i = Number(i);
            if(this.rawWord[i] === letter) {
                this.arrayModifiedWord[i] = letter;

                charFound = true;
            }
        }
        return charFound;
    },
    isComplete : function(){
        return this.modifiedWord.indexOf("_") === -1;
    },
    hasGuessesLeft : function() {
        return this.totalWrong < (this.maxGuesses - 1);
    },
    updateState : function() {
        this.modifiedWord = this.arrayModifiedWord.join("");
        this.state = "Current word : " + this.modifiedWord + "; Current Guesses : " + this.guessedLetters.join(", ");
    },
    getState : function() {
        if(this.state === undefined) {
            this.updateState();
        }
        return this.state;
    }
};

var TestSuite =
(function tests(Assert, TestRunner) {   
    // Helper methods
    var Assert = (function() {
        this.log = console.log;
        var assertDescriptions = [
            {name : "assertEqual", func : function(expected, actual) { return expected === actual; }, logMessage : "Expected <{0}> Received <{1}>"},
            {name : "assertNotEqual", func : function(expected, actual) { return expected !== actual; }, logMessage : "Expected <{0}> Received <{0}>"},
            {name : "assertNull", func : function(obj) { return obj === undefined; }, logMessage : "Expected <null> Received <{0}>"},
            {name : "assertNotNull", func : function(obj) { return obj !== undefined; }, logMessage : "Expected <Not null> Received <{0}>"},
            {name : "assertTrue", func : function(obj) { return obj === true; }, logMessage : "Expected <true> Received <{0}>"},
            {name : "assertFalse", func : function(obj) { return obj === false; }, logMessage : "Expected <false> Received <{0}>"},
        ];
        
        assertDescriptions.forEach(function(assertDescription) {
            (function(assertName, assertFunction, logMessage) {
                this[assertName] = function() {
                    var assertPassed = assertFunction.apply(undefined, arguments);
                    var formattedLogMessage = (function(str, values) {
                        return str.replace(/\{((\d+))\}/g, function(match, digit) { return values[digit]; });
                    })(logMessage, arguments);
                    if(!assertPassed) {
                        throw new Error("FAILED  :: " + assertName + " : " + formattedLogMessage); 
                    } else {
                        log("PASSED :: " + assertName + " : " + formattedLogMessage); // Assert <" + assertName  + "> for arg1 <" + arg1 + "> and arg2 <" + arg2 + ">");
                    }
                }
            }).call(this, assertDescription.name, assertDescription.func, assertDescription.logMessage);
        });
        
        assertDescriptions.length = 0;

        return this;
    })();
    
    var TestRunner = (function(tests, continueOnError, createGUI) {
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
    
    return {Assert : Assert, TestRunner : TestRunner};
})();


(function(Assert, TestRunner){
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
            Assert.assertNotEqual(firstCreatedUser, secondCreatedUser);
        },
        testValidLetter : function() {
            instance.getRandomWord = function() { return "hello"; };
            var game = instance.tryCreateGame("foo", "bar", "", "");    
            instance.tryGuess("foo", "bar", "", "e");

            Assert.assertEqual("_e___", instance.getGame("foo").modifiedWord);
        },
        testValidLetters : function() {
            instance.getRandomWord = function() { return "hello"; };
            instance.tryCreateGame("foo", "bar", "", "");    
            instance.tryGuess("foo", "bar", "", "l");
            Assert.assertEqual("__ll_", instance.getGame("foo").modifiedWord);
        },
        testValidNotFoundLetter : function() {
            instance.getRandomWord = function() { return "hello"; };
            instance.tryCreateGame("foo", "bar", "", "");    
            instance.tryGuess("foo", "bar", "", "x");
            Assert.assertEqual("_____", instance.getGame("foo").modifiedWord);
        },
        testInvalidLetter : function() {
            instance.getRandomWord = function() { return "hello"; };
            instance.tryCreateGame("foo", "bar", "", "");    
            instance.tryGuess("foo", "bar", "", "%");
            Assert.assertEqual("_____", instance.getGame("foo").modifiedWord);
        },
        testGameCompleteWhenDone : function() {
            instance.getRandomWord = function() { return "foo"; };
            var game = instance.tryCreateGame("foo", "bar", "", "");    
            instance.tryGuess("foo", "bar", "", "f");
            instance.tryGuess("foo", "bar", "", "o");
            Assert.assertEqual("foo", game.modifiedWord);
            Assert.assertNull(instance.getGame("foo"));
        },
        testGameCompleteWhenNotDone : function(){
            instance.getRandomWord = function() { return "foo"; };
            var game = instance.tryCreateGame("foo", "bar", "", "");    
            instance.tryGuess("foo", "bar", "", "f");

            Assert.assertFalse(game.isComplete());
            Assert.assertNotNull(instance.getGame("foo"));
        },
        testMaxGuessesEndsGame : function() {
            instance.getRandomWord = function() { return "hello"; };
            var game = instance.tryCreateGame("foo", "bar", "", "");  
            var guesses = ["a", "b", "c", "d", "e", "f"];
            for(var i in guesses) {
                assertTrue(game.hasGuessesLeft());
                instance.tryGuess("foo", "bar", "", guesses[i]);
            }
            Assert.assertFalse(game.hasGuessesLeft());
            Assert.assertNull(instance.getGame("foo"));
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
    
    TestRunner(tests, false, true);
})(TestSuite.Assert, TestSuite.TestRunner);


exports.Plugin = Plugin;