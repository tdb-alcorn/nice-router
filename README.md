# nice-router

A nice, simpler router for handling those pesky HTTP(S) requests.

## Example

```javascript
var Router = require("nice-router");
var router = new Router();
router.addRoute("/ping", "GET", function(req, res) {
    res.writeHead(200);
    res.end("pong");
});
router.addStatic("/smiley.jpg", "image/jpeg");
router.listen(8080);
```

### Basic HTTPS example

To use this example you will need to generate self-signed certificates `server.key` and
`server.crt`. If you are unsure about how to do that, see this [Stack
Overflow](http://stackoverflow.com/questions/10175812/how-to-create-a-self-signed-certificate-with-openssl).

```javascript
var fs = require("fs");
var Router = require("nice-router");
var router = new Router();
router.useHTTPS({
    key: fs.readFileSync("key.pem"),
    cert: fs.readFileSync("cert.pem"),
};
router.addRoute("/amIEncrypted", "GET", function(req, res) {
    res.writeHead(200);
    res.end("yes!");
});
router.listen(8080);
```

## Methods

- `#addRoute(path, method, handler)`: Adds a route to the router which will respond to `method`
  requests to `path` by doing `handler`. The signature of handlers is `handler(request, response,
  headers, query, body)`. The `request` and `response` objects are the same as those from the node
  `http`/`https` modules. `headers` and `query` are basic key/value objects. `body` is a Buffer, so
  call `body.toString("utf-8")` if you just want a string.
- `#listen(port) -> Promise`: Start the server on the specified port, which must be open.
- `#close -> Promise`: Stop the server.
- `#useHTTPS(options[, callback])`: Switches the server to using HTTPS, restarting if the server was already running. `options` is the same as the options parameter in node's `https.createServer`. Accepts an optional `callback` which will be called if the server is restarted.
- `#addStatic(path, contentType)`: Adds a handler which responds to `GET` requests at `path` with
  the contents of the file at `path`.
