var assert = require("assert");
var http = require("http");
var Router = require("../router.js");
var open = require("nice-open");

var port = 8765;

describe("Router", function() {
    afterEach(function() {
        port++;
    });
    it("should show index.html by default", function() {
        return new Promise(function(resolve, reject) {
            // TODO make test create index.html and then delete it after its done
            var router = new Router();
            var url = "http://localhost:" + port;
            router.listen(port);
            http.get(url, function(res) {
                assert.equal(res.statusCode, 200);
            });
            open(url);
            setTimeout(function() { resolve(router); }, 1000);
        }).then(function(router) { router.close(); });
    }).timeout(10000);
    it("should show an error page when the handler fails", function() {
        return new Promise(function(resolve, reject) {
            var router = new Router();
            router.addRoute("/", "GET", function() {
                throw new Error("This is a test error.");
            });
            var url = "http://localhost:" + port;
            router.listen(port);
            http.get(url, function(res) {
                assert.equal(res.statusCode, 500);
            });
            open(url);
            setTimeout(function() { resolve(router); }, 1000);
        }).then(function(router) { router.close(); });
    }).timeout(10000);
    describe("#addStaticDir", function() {
        it("should show an index of the directory when the generateIndex flag is true", function(done) {
            var router = new Router();
            router.addStaticDir("/", true);
            var url = "http://localhost:" + port;
            router.listen(port);
            http.get(url, function(res) {
                assert.equal(res.statusCode, 200);
            });
            open(url);
            setTimeout(done, 9000);
        }).timeout(10000);
    });
});
