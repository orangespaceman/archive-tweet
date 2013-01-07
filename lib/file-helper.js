/*
 * File helper
 */
var
  fs = require('fs'),
  logger = require('./log'),
  log = logger.log,
  exit = logger.exit;


function save(path, obj, cb) {
    if (obj.length < 1) {
      log("No content set, not saving");
      return;
    }

    fs.writeFile(path, JSON.stringify(obj), 'utf8', function(err) {
        if(err) {
            log("Cannot save to file");
            exit(err);
        } else {
            log("File saved, ", obj.length, "items");
            if (!!cb) {
              cb();
            }
        }
    });
}



function empty(path, cb) {
    fs.writeFile(path, "", 'utf8', function(err) {
        if(err) {
            log("Cannot empty file");
            exit(err);
        } else {
            log("File emptied");
            if (!!cb) {
              cb();
            }
        }
    });
}



function read(path, next) {
    var content;

    fs.exists(path, function(fileExists) {
        if (fileExists) {

            fs.readFile(path, 'utf8', function (err, data) {
                if (err) {
                    log("Error reading file", err);
                    next();
                } else {
                    if (data.length > 0) {
                      log("File found and parsed");
                      content = JSON.parse(data);
                      next(content);
                    } else {
                      log("File found but empty");
                      next();
                    }
                }
            });
        } else {
            log("File doesn't exist");
            next();
        }
    });
}


module.exports = {
  save : save,
  read : read,
  empty: empty
};