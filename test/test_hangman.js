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

    beforeEach(function () {
      tester = new vumigo.test_utils.ImTester(app.api, {
        custom_setup: function (api) {
          api.config_store.config = JSON.stringify({
          });

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
            next_state: 'start',
            response: /New game!\nWord: __________\nLetters guessed so far: \n\(0 to quit\):/
        }).then(done, done);
    });
});
