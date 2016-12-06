var http = require("http");
var url = require("url");
var querystring = require("querystring");

var Logger = require("nice-logger");
var log = new Logger("router");

function Router() {
    var routes = {
        "": {
            "GET": fsHandler("/"),
        },
    };

    var server = http.createServer(route);

    function listen(port) {
        log.info("Listening on port", port);
        return new Promise(function(resolve, reject) {
            server.listen(port, resolve);
        });
    }

    function close() {
        return new Promise(function(resolve, reject) {
            server.close(resolve);
        });
    }

    function route(req, res) {
        log.info("Incoming request", req.method, req.url);
        req.on("aborted", function() {
            log.warning("Client aborted", req.method, req.url);
        });
        req.on("close", function() {
            log.info("Connection closed.");
        });
        var chunks = [];
        req.on("data", function(chunk) {
            chunks.push(chunk);
        });
        req.on("end", function() {
            var b = Buffer.concat(chunks);
            var h = url.parse(req.url, true);
            var p = pathSplit(h.pathname);
            p.push(req.method);
            var handler = getIfExists(routes, p);
            if (!handler) {
                res.writeHead(404, {"Content-Type": "text/plain"});
                res.end(errorPage(404));
            }
            handler(req.headers, b, h.query, res);
        });
    }

    function pathSplit(path) {
        var p = path.split("/");
        if (path.endsWith("/")) {
            p.pop();
        }
        return p;
    }

    function addRoute(path, method, handler) {
        var p = pathSplit(path);
        p.push(method);
        set(routes, p, handler);
        log.debug("Added handler for route", method, path);
    }

    function fsHandler(path) {
        // If there is an index.html at the path it returns it
        // Otherwise it returns a page listing the files in the directory at path.
        return function(headers, body, query, response) {
            // contents = fs.read(index.html)
            res.end(contents);
        }
    }

    function getIfExists(obj, pathArray) {
        if (pathArray && pathArray.constructor === Array) {
            for (var i=0, len=pathArray.length, keys=Object.keys(obj); i<len; i++) {
                if (keys.indexOf(pathArray[i]) === -1) {
                    break;
                }
                obj = obj[pathArray[i]];
                keys = Object.keys(obj);
            }

            return obj;
        }
        return undefined;
    }

    function set(obj, pathArray, value) {
        if (pathArray && pathArray.constructor === Array) {
            for (var i=0, len=pathArray.length, keys=Object.keys(obj); i<(len-1); i++) {
                if (keys.indexOf(pathArray[i] === -1)) {
                    obj[pathArray[i]] = new Object();
                }
                obj = obj[pathArray[i]];
                keys=Object.keys(obj);
            }
            obj[pathArray[len-1]] = value;
        }
    }

    function errorPage(code) {
        return [code.toString(), http.STATUS_CODES[code]].join(" ");
    }

    this.addRoute = addRoute;
    this.listen = listen;
    this.close = close;
    this.setLogLevel = log.setLevel;
}

module.exports = Router;
