var describe = global.describe,
  it = global.it,
  beforeEach = global.beforeEach;

var fs = require("fs");
var assert = require("assert");
var app = require("../lib/hangman");
var vumigo = require("vumigo_v01");

describe('Hangman', function () {

    var tester;
    var fixtures = [];

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

    it.skip('should test something', function (done) {

    });
});
