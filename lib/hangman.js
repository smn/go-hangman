var vumigo = require("vumigo_v01");
var jed = require("jed");

if (api === undefined) {
  // testing hook (supplies api when it is not passed in by the real sandbox)
  var api = this.api = new vumigo.dummy_api.DummyApi();
}

var FreeText = vumigo.states.FreeText;
var EndState = vumigo.states.EndState;
var ChoiceState = vumigo.states.ChoiceState;
var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
var Choice = vumigo.states.Choice;
var InteractionMachine = vumigo.state_machine.InteractionMachine;
var StateCreator = vumigo.state_machine.StateCreator;
var HttpApi = vumigo.http_api.HttpApi;
var Promise = vumigo.promise.Promise;


function Hangman() {
    var self = this;
    StateCreator.call(self, 'new_game');

    self.word_url = 'http://randomword.setgetgo.com/get.php';

    self.load_game = function (msisdn) {
        var p = im.api_request('kv.get', {
            key: msisdn
        });
        p.add_callback(function (result) {
            return result.value;
        });
        return p;
    };

    self.save_game = function (msisdn, game) {
        var p = im.api_request('kv.set', {
            key: msisdn,
            value: game
        });
        p.add_callback(function() {
            return game;
        });
        return p;
    };

    self.draw_board = function (game) {
        var word = game.word.split('').map(function (letter) {
            if(game.guesses.indexOf(letter) > -1)
                return letter;
            return '_';
        }).join('');
        var guesses = game.guesses.join('');
        if(self.won(game)) {
            return [
                game.msg,
                'The word was: ' + word
            ].join('\n');
        } else {
            return [
                game.msg,
                'Word: ' + word,
                'Letters guessed so far: ' + guesses,
                game.prompt + '(0 to quit):'
            ].join('\n');
        }
    };

    self.get_random_word = function () {
        var p = im.api_request('http.get', {
            'url': self.word_url,
            'headers': {
                'content-type': ['text/plain']
            }
        });
        p.add_callback(function (result) {
            var lp = im.log('Word: ' + result.body);
            lp.add_callback(function() {
                return result;
            });
            return lp;
        });
        p.add_callback(function (result) {
            return result.body;
        });
        return p;
    };

    self.create_new_game = function (word) {
        return {
            msg: 'New game!',
            word: word,
            guesses: [],
            prompt: ''
        };
    };

    self.game_won = function (game) {
        return game.word.split('').filter(function(letter) {
            return game.guesses.indexOf(letter) == -1;
        }).length === 0;
    };

    self.game_logic_callback = function(im, game) {
        return function (content, done) {
            var p = self.game_logic(im, game, content);
            p.add_callback(function (next_state) {
                done(next_state);
            });
            return p;
        };
    };

    self.game_logic = function (im, game, content) {
        var next_state;
        if(!content) {
            game.msg = 'Some input required please.';
            game.prompt = 'Enter next guess';
            next_state = 'resume_game';
        } else if (content.length > 1) {
            game.msg = 'Single character only please.';
            game.prompt = 'Enter next guess';
            next_state = 'resume_game';
        } else if (content == '0') {
            next_state = 'end_game';
        } else if (game.guesses.indexOf(content) > -1) {
            game.msg = 'You\'ve already guessed \'' + content + '\'.';
            game.prompt = 'Enter next guess';
            next_state = 'resume_game';
        } else {
            game.guesses.push(content);
            if(game.word.indexOf(content) > -1) {
                game.msg = 'Word contains at least one \'' + content + '\'! :D';
            } else {
                game.msg = 'Word contains no \'' + content + '\'. :(';
            }
            game.prompt = 'Enter next guess';
            next_state = 'resume_game';
        }

        if(self.won(game)) {
            game.msg = self.victory_message(game);
            next_state = 'win';
        }

        var p = self.save_game(im.user_addr, game);
        p.add_callback(function (game) {
            return {
                next_state: next_state,
                game: game
            };
        });
        return p;
    };

    self.victory_message = function(game) {
        var uniques = game.word.length;
        var guesses = game.guesses.length;
        var win_messages = [
            [1, "Flawless victory!"],
            [1.5, "Epic victory!"],
            [2, "Standard victory!"],
            [3, "Sub-par victory!"],
            [4, "Random victory!"]
        ];

        for(var i=0; i < win_messages.length; i++) {
            var factor = win_messages[i][0],
                msg = win_messages[i][1];

            if(guesses <= (uniques * factor)) {
                return msg;
            }
        }
        return "Button mashing!";
    };

    self.won = function(game) {
        for(var i = 0; i < game.word.length; i++) {
            var letter = game.word[i];
            if(game.guesses.indexOf(letter) == -1 ) {
                return false;
            }
        }
        return true;
    };

    self.add_creator('new_game', function (state_name, im) {
        var p = self.get_random_word();
        p.add_callback(function (word) {
            return self.save_game(im.user_addr,
                                  self.create_new_game(word));
        });
        p.add_callback(function (game) {
            return new FreeText(
                state_name,
                'resume_game',
                self.draw_board(game)
            );
        });
        return p;
    });

    self.add_creator('resume_game', function (state_name, im) {
        var p = self.load_game(im.user_addr);
        p.add_callback(function (game) {
            //  Yoink! I need to get a the content outside of
            //  whatever state the machine thinks I'm in.
            var content = im.msg.content;
            return self.game_logic(im, game, content);
        });
        p.add_callback(function (game_state) {
            return new FreeText(
                state_name,
                game_state.next_state,
                self.draw_board(game_state.game)
            );
        });
        return p;
    });


    self.add_creator('win', function (state_name, im) {
        var p = self.load_game(im.user_addr);
        p.add_callback(function (game) {
            return new EndState(
                state_name,
                self.draw_board(game),
                'new_game');
        });
        return p;
    });

    self.add_state(new EndState(
        'end_game',
        'Adieu!',
        'new_game'));
}

// launch app
var states = new Hangman();
var im = new InteractionMachine(api, states);
im.attach();
