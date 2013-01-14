/*
 * logger
 */
var
  messages = [],
  moment = require('moment');


// log messages
function log() {

    // convert arguments into array
    var args = Array.prototype.slice.call(arguments);

    // add date to start of arguments
    var str = moment().format("D/M/YY, H:mm:ss") + " -";
    args.unshift(str);

    // log
    console.log(args.join(" "));
    messages.push(args);

    // remove old messages if the log gets too long - save RAM!
    if (messages.length > 500) {
      messages = messages.splice(0,1);
    }
}


// exit on errors
function exit() {
    console.log();
    log(" -- ERROR -- ");
    log(Array.prototype.slice.call(arguments));
    log(" -- EXITING -- ");
    console.log();
    process.exit(1);
}


module.exports = {
  log: log,
  exit: exit,
  messages: messages
};