var assert = require("assert");
var http = require("http");
var Router = require("../router.js");

var testPort = 8765;
function request(path, method, headers, body) {
    return new Promise(function(resolve, reject) {
        var req = http.request({
            path: path,
            port: testPort,
            method: method,
            headers: headers,
        });
        req.on("response", resolve);
        req.on("error", reject);
        if (body) {
            req.write(body);
        }
        req.end();
    })
    .then(function(res) {
        return new Promise(function(resolve, reject) {
            res.on("data", function(chunk) {
            });
            res.on("end", resolve);
            res.on("error", reject);
            return res;
        });
    });
}

describe("Router", function() {
    var router;
    before(function() {
        router = new Router();
        router.setLogLevel("error");
        return router.listen(testPort);
    });
    after(function() {
        return router.close();
    });
    describe("#addRoute", function() {
        it("should pass the request to the appropriate handler", function() {
            var received = new Object();
            var handlerCalled = false;
            router.addRoute("/", "GET", function(req, response, body, headers, query) {
                received.headers = headers;
                received.body = body;
                received.query = query;
                response.writeHead(200);
                response.end();
                handlerCalled = true;
            });
            return request("/", "GET", {}).then(function() {
                assert.ok(handlerCalled);
            });
        });
        it("should receive request body", function() {
            var received = new Object();
            var handlerCalled = false;
            router.addRoute("/", "POST", function(req, response, body, headers, query) {
                received.headers = headers;
                received.body = body;
                received.query = query;
                response.writeHead(200);
                response.end();
                handlerCalled = true;
            });
            var body = "foo";
            return request("/", "POST", {}, body).then(function(res) {
                assert.ok(handlerCalled);
                assert.equal(body, received.body.toString());
                assert.ok(Buffer.isBuffer(received.body));
            });
        });
    });
});

