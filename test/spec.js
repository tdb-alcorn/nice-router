var assert = require("assert");
var http = require("http");
var https = require("https");
var fs = require("fs");
var path = require("path");
var Router = require("../router.js");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
var httpsOptions = {
    key: fs.readFileSync("test/server.key"),
    cert: fs.readFileSync("test/server.crt"),
};
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
            res.on("end", resolve(res));
            res.on("error", reject);
            return res;
        });
    });
}

function httpsRequest(path, method, headers, body) {
    return new Promise(function(resolve, reject) {
        var req = https.request({
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
            res.on("end", resolve(res));
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
            router.addRoute("/", "GET", function(req, response, headers, query, body) {
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
            router.addRoute("/", "POST", function(req, response, headers, query, body) {
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
    describe("#useHTTPS", function() {
        it("should restart server if already running", function(done) {
            router.useHTTPS(httpsOptions, function() {
                httpsRequest("/", "GET", {}).then(function(res) {
                    assert.equal(res.statusCode, 200);
                    done();
                });
            });
        });
        it("should serve", function() {
            return router.close().then(function() {
                router = new Router();
                router.useHTTPS(httpsOptions);
                router.listen(testPort);
                return httpsRequest("/", "GET", {}).then(function(res) {
                    assert.equal(res.statusCode, 200);
                });
            });
        });
    });
});

