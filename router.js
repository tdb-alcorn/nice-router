var http = require("http");
var https = require("https");
var url = require("url");
var querystring = require("querystring");
var fs = require("fs");
var path = require("path");

var deepor = require("deepor");
var get = deepor.get;
var set = deepor.set;

var Logger = require("nice-logger");
var log = new Logger("router", "warning");

function Router() {
    var routes = {
        "": {
            "GET": staticFile("/index.html", "text/html"),
        },
    };

    var server = http.createServer(route);

    var contentTypes = {
        // text
        "html": "text/html",
        "css": "text/css",
        "js": "text/javascript",
        // image
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "gif": "image/gif",
        // application
        "rtf": "application/rtf",
        "pdf": "application/pdf",
        "zip": "application/zip",
        "gz": "application/gzip",
    };

    var contentEncodings = {
        "gz": "gzip",
    };

    function listen(port) {
        log.warning("Listening on port", port);
        return new Promise(function(resolve, reject) {
            server.listen(port, resolve);
        });
    }

    function close() {
        return new Promise(function(resolve, reject) {
            server.close(resolve);
            log.warning("Shutting down.");
        });
    }

    function useHTTPS(options, listenCallback) {
        if (server.listening) {
            // if server is already running, restart it.
            var port = server.address().port;
            server.close(function() {
                server = https.createServer(options, route);
                server.listen(port, cb);
            });
            return;
        }
        server = https.createServer(options, route);
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
            var handler = get(routes, p);
            if (!handler) {
                log.warning(404, req.method, req.url);
                res.writeHead(404, {"Content-Type": "text/plain"});
                res.end(errorPage(404));
                return;
            }
            try {
                handler(req, res, req.headers, h.query, b);
            } catch (err) {
                log.error(req.method, req.url, req.headers, h.query, b.toString(), handler, err);
                if (!res.finished) {
                    res.writeHead(500, {"Content-Type": "text/plain"});
                    res.end(errorPage(500, err));
                }
            }
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
        // The signature of handler should be function(request, response, headers, query, body)
        var p = pathSplit(path);
        p.push(method);
        set(routes, p, handler);
        log.debug("Added handler for route", method, path);
    }

    function addStatic(p, contentType) {
        var handler = contentType ? staticFile(p, contentType) : staticFile(p);
        addRoute(p, "GET", handler);
    }

    function fileExtensionOf(filename, validExtensions) {
        var components = filename.split(".");
        for (var ext=components.pop(); ext;) {
            if (validExtensions.indexOf(ext) !== -1) {
                return ext;
            }
            return undefined;
        }
    }

    function staticFile(p, contentType) {
        var headers = new Object();
        if (contentType) {
            headers["Content-Type"] = contentType;
        } else {
            var ext;
            var encExt = fileExtensionOf(p, Object.keys(contentEncodings));
            if (encExt) {
                var innerP = p.substr(0, p.length - encExt.length);
                ext = fileExtensionOf(innerP, Object.keys(contentTypes));
                if (ext) {
                    headers["Content-Encoding"] = contentEncodings[encExt];
                    headers["Content-Type"] = contentTypes[ext];
                }
            } else {
                ext = fileExtensionOf(p, Object.keys(contentTypes));
                headers["Content-Type"] = ext ? contentTypes[ext] : "text/plain";
            }
        }
        return function(req, res) {
            var pj = path.join(process.cwd(), p);
            fs.readFile(pj, function(err, data) {
                if (err) {
                    res.writeHead(404);
                    res.end(errorPage(404), p);
                    return;
                }
                res.writeHead(200, headers);
                res.end(data);
            });
        }
    }

    function addStaticDir(p, generateIndex) {
            fs.readdir(path.join(process.cwd(), p), function(err, files) {
                if (err) {
                    log.error(err);
                    throw err;
                }
                for (var i=0, len=files.length; i<len; i++) {
                    if (generateIndex) {
                        addRoute(p, "GET", function(req, res) {
                            res.writeHead(200, {"Content-Type": "text/html"});
                            res.end(dirPage(p, files));
                        });
                    }
                    var _ = function(file) {
                        fs.stat(path.join(process.cwd(), file), function(err, stats) {
                            if (err) {
                                log.error(err);
                            } else if (stats.isDirectory()) {
                                addStaticDir(file, generateIndex);
                            } else if (stats.isFile()) {
                                addStatic(file);
                            } else {
                                log.warning("Skipping", file);
                            }
                        });
                    }(path.join(p, files[i]));
                }
            });
    }

    function errorPage(code, err) {
        var httpLine = [code.toString(), http.STATUS_CODES[code]].join(" ");
        var stack = "";
        if (err) {
            stack = [err.toString(), "", "Stack trace:", err.stack].join("\n");
        }
        return [httpLine, stack].join("\n");
    }

    function dirPage(dir, files) {
        var body = [];
        body.push("<h1>Index of " + dir + "</h1");
        body.push("<ul>");
        for (var i=0, len=files.length; i<len; i++) {
            body.push("<li>" + files[i].link(path.join(dir, files[i])) + "</li>");
        }
        body.push("</ul");
        return body.join("\n");
    }

    this.addRoute = addRoute;
    this.listen = listen;
    this.close = close;
    this.errorPage = errorPage;
    this.dirPage = dirPage;
    this.staticFile = staticFile;
    this.addStatic = addStatic;
    this.addStaticDir = addStaticDir;
    this.setLogLevel = log.setLevel;
    this.useHTTPS = useHTTPS;
}

module.exports = Router;
