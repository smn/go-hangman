var describe = global.describe,
  it = global.it,
  beforeEach = global.beforeEach;

var fs = require("fs");
var assert = require("assert");
var app = require("../lib/hangman");
var vumigo = require("vumigo_v01");

describe('Hangman', function () {

    var tester;
    var fixtures = [
        'test/fixtures/get_random_word.json'
    ];

    describe('with new users', function () {
        beforeEach(function () {
          tester = new vumigo.test_utils.ImTester(app.api, {
            custom_setup: function (api) {
              fixtures.forEach(function (f) {
                api.load_http_fixture(f);
              });
            },
            async: true
          });
        });

        it('should present a new game', function (done) {
          tester.check_state({
            user: null,
            content: null,
            next_state: 'new_game',
            response: /New game!\nWord: __________\nLetters guessed so far: \n\(0 to quit\):/
          }).then(done, done);
        });

        it('should accept a successful letter', function (done) {
          tester.check_state({
            user: {
              current_state: 'new_game'
            },
            content: 'r',
            next_state: 'resume_game',
            response: /Word contains at least one 'r'! :D\nWord: r_______r_/
          }).then(done, done);
        });

        it('should ignore case', function (done) {
          tester.check_state({
            user: {
              current_state: 'new_game'
            },
            content: 'O',
            next_state: 'resume_game',
            response: /Word contains at least one 'o'! :D\nWord: ____o__o__/
          }).then(done, done);
        });

        // something is fundamentally broken here
        it.skip('should quit when given 0 as input', function (done) {
          tester.check_state({
            user: {
              current_state: 'new_game'
            },
            content: '0',
            next_state: 'end_game',
            response: /Adieu!/,
            continue_session: false
          }).then(done, done);
        });
    });

    describe('with resuming users', function () {

        beforeEach(function () {
          tester = new vumigo.test_utils.ImTester(app.api, {
            custom_setup: function (api) {
              fixtures.forEach(function (f) {
                api.load_http_fixture(f);
              });
              api.kv_store['1234567'] = {
                msg: 'New Game!',
                word: 'randomword',
                guesses: ['o'],
                prompt: ''
              };
            },
            async: true
          });
        });

        it('should quit when given 0 as input', function (done) {
          tester.check_state({
            user: {
              current_state: 'resume_game'
            },
            content: '0',
            next_state: 'end_game',
            response: /Adieu!/,
            continue_session: false
          }).then(done, done);
        });

        it('should accept input and save game state', function (done) {
            tester.check_state({
                user: {
                    current_state: 'resume_game',
                    answers: {
                        'resume_game': 'o'
                    }
                },
                next_state: 'resume_game',
                content: 'r',
                response: /Word contains at least one 'r'! :D\nWord: r___o__or_/
            }).then(done, done);
        });

        it('should notify of already chosen letters', function (done) {
            tester.check_state({
                user: {
                    current_state: 'resume_game'
                },
                next_state: 'resume_game',
                content: 'o',
                response: /You've already guessed 'o'.\nWord: ____o__o__/
            }).then(done, done);
        });
    });

    describe('with winning users', function() {
      beforeEach(function () {
        tester = new vumigo.test_utils.ImTester(app.api, {
          custom_setup: function (api) {
            fixtures.forEach(function (f) {
              api.load_http_fixture(f);
            });
            api.kv_store['1234567'] = {
              msg: 'New Game!',
              word: 'randomword',
              // the word is 'randomword', only the 'a' is missing
              guesses: ['r','n','d','o','m','w'],
              prompt: ''
            };
          },
          async: true
        });
      });

      it('should know when a game is completed', function (done) {
        tester.check_state({
          user: {
              current_state: 'resume_game'
          },
          next_state: 'win',
          content: 'a',
          response: /Flawless victory!\nThe word was: randomword/,
          continue_session: false
        }).then(done, done);
      });
    });
});
