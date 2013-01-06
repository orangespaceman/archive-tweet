/*
 * set up server to relay logs
 */
var
  logger = require('./log'),
  log = logger.log,
  exit = logger.exit,
  messages = logger.messages,
  http = require('http');


function start(port) {
    var server = http.createServer(function (req, res) {
      for (var counter = 0, length = messages.length; counter < length; counter++) {
        res.write(messages[counter]+'\n');
      }
      res.end();
    });
    server.listen(port);
    log('Web server running on port ', port);

    return server;
}


module.exports = {
  start: start
};