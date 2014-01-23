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
    StateCreator.call(self, 'start');

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
        return im.api_request('kv.set', {
            key: msisdn,
            command: game
        });
    };

    self.draw_board = function (game) {
        var word = game.word.split('').map(function (letter) {
            if(game.guesses.indexOf(letter) > -1)
                return letter;
            return '_';
        }).join('');
        var guesses = game.guesses.join('');
        return [
            game.msg,
            'Word: ' + word,
            'Letters guessed so far: ' + guesses,
            game.prompt + '(0 to quit):'
        ].join('\n');
    };

    self.get_random_word = function () {
        var p = im.api_request('http.get', {
            'url': self.word_url,
            'headers': {
                'content-type': ['text/plain']
            }
        });
        p.add_callback(function(result) {
            return result.body;
        });
        return p;
    };

    self.add_creator('start', function (state_name, im) {
        var p = self.load_game(im.user_addr);
        p.add_callback(function (game) {
            if(!game)
                return self.start_new_game(state_name, im);
            return self.continue_saved_game(state_name, im, game);
        });
        return p;
    });

    self.start_new_game = function (state_name, im) {
        var p = self.get_random_word();
        p.add_callback(function(word) {
            return self.continue_saved_game(state_name, im, {
                msg: 'New game!',
                word: word,
                guesses: [],
                prompt: ''
            });
        });
        return p;
    };

    self.continue_saved_game = function (state_name, im, game) {
        return new FreeText(
            state_name,
            state_name,
            self.draw_board(game)
        );
    };
}

// launch app
var states = new Hangman();
var im = new InteractionMachine(api, states);
im.attach();
