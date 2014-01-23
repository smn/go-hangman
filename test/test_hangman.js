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
                guesses: ['b'],
                prompt: ''
              };
            },
            async: true
          });
        });

        it('should accept input and save game state', function (done) {
            tester.check_state({
                user: {
                    current_state: 'new_game'
                },
                next_state: 'resume_game',
                content: 'r',
                response: /Word contains at least one 'r'! :D\nWord: r_______r_/
            }).then(done, done);
        });
    });
});
