/*
 * Start tweet archive
 */
var tweetArchive = require("./tweet-archive");

tweetArchive.init({
  originalTwitterAccount  : "stephenfry",
  archiveTime             : 3,
  archiveTimeUnit         : "months",
  consumer_key            : "x",
  consumer_secret         : "x",
  access_token_key        : "x",
  access_token_secret     : "x"
});