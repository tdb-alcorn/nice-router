var assert = require("assert");
var http = require("http");
var Router = require("../router.js");
var open = require("nice-open");

describe("Router", function() {
    it("should show index of files by default", function() {
        return new Promise(function(resolve, reject) {
            var router = new Router();
            var port = 8080;
            var url = "http://localhost:" + port;
            router.listen(port);
            http.get(url, function(res) {
                assert.equal(res.statusCode, 200);
            });
            open(url);
            setTimeout(function() { resolve(); }, 1000);
        });
    }).timeout(10000);
    it("should show an error page when the handler fails", function() {
        return new Promise(function(resolve, reject) {
            var router = new Router();
            router.addRoute("/", "GET", function() {
                throw new Error("This is a test error.");
            });
            var port = 8081;
            var url = "http://localhost:" + port;
            router.listen(port);
            http.get(url, function(res) {
                assert.equal(res.statusCode, 500);
            });
            open(url);
            setTimeout(function() { resolve(); }, 1000);
        });
    }).timeout(10000);
});
