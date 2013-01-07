/*
 * The Tweet Archive
 *
 * Pete G
 */
var
    // external libraries
    schedule = require('node-schedule'),        // https://github.com/mattpat/node-schedule
    ntwitter = require('ntwitter'),             // https://github.com/AvianFlu/ntwitter
    moment = require('moment'),                 // momentjs.com

    // custom libraries
    logger = require('./lib/log'),
    server = require('./lib/server'),
    largeNumbers = require('./lib/large-numbers'),
    fileHelper = require('./lib/file-helper'),

    // logger shortcuts
    log = logger.log,
    exit = logger.exit,

    // server
    port = process.env['app_port'] || 8000,

    // init data - passed from app.js
    initData,

    // ntwitter instance
    twit,

    // tweet cache
    tweets = [],
    tweetCacheFilePath = __dirname + '/cache/tweets.json',

    // twitter user id
    userId = 0,

    // archive date
    archiveDate,

    // twitter request limits
    tweetsPerRequest = 5,
    requestCounter = 0, // don't change
    requestLimit = 5,
    intervalCheck = [1, 6, 11, 16, 21, 26, 31, 36, 41, 46, 51, 56],

    // tweet ids
    earliestTwitterCacheId = 0,
    latestTweetId = 0,

    // scheduler
    nextScheduledTweet,
    nextScheduledTwitterRequest;


/*
 * init
 * called from the main app.js file
 */
function init(data) {

    log('starting node tweet archive thing...');

    // start web server
    server.start(port);

    // init passed data
    initData = data;

    // init moment, calculate archival date
    setArchiveDate();

    // connect
    connectToTwitter();

    // search for tweets
    startTwitterSearch();
}


/* ----------- */



/*
 * Set the date to start the twitter search from
 */
function setArchiveDate() {
    archiveDate = moment().subtract(initData.archiveTimeUnit, initData.archiveTime);
    if (!archiveDate.isValid()) {
        exit('invalid archive date');
    }
    log("looking for tweets from", archiveDate.format("Do MMM YYYY, h:mm:ssa"), "onwards");
}


/*
 * Connect to twitter
 */
function connectToTwitter() {
    twit = new ntwitter({
        consumer_key: initData['consumer_key'],
        consumer_secret: initData['consumer_secret'],
        access_token_key: initData['access_token_key'],
        access_token_secret: initData['access_token_secret']
    });
}


/*
 * start searching for old tweets
 */
function startTwitterSearch() {

    // get the user's ID from their name
    twit.showUser(initData['originalTwitterAccount'], function(e, data) {

        // check a valid twitter username has been set
        if (data === undefined) {
            exit('no user found');
        }


        // get user ID from their name
        userId = data[0].id;
        log('found user '+initData['originalTwitterAccount']+' (ID: ' + userId + ')');


        // don't continue if there aren't any tweets
        if (!data[0].status) {
            exit('no tweets found for that user');
        }


        // if a cached JSON file exists, process it
        // async method, so wait for it to finish
        // following this, parse the file contents
        log('searching for cached tweets');
        fileHelper.read(tweetCacheFilePath, parseTweetsFromFile);


        // get the latest tweet id
        earliestTwitterCacheId = latestTweetId = data[0].status.id_str;


        // every x minutes check for any new tweets that may have arrived
        var rule = new schedule.RecurrenceRule();
        rule.minute = intervalCheck;
        nextScheduledTwitterRequest = schedule.scheduleJob(rule, getNewTweets);


        // create quick test tweet - check it's all working
        //postTweet({text:"this is a test, " + moment().format("HH:mm:ss")});
    });
}


/*
 * check whether any archived tweets have already been cached
 */
function parseTweetsFromFile(data) {
    if (!!data && data.length > 0) {
        tweets = data;
        earliestTwitterCacheId = largeNumbers.decrementHugeNumberBy1(tweets[tweets.length - 1].id);
        log("Tweet cache found, count:", tweets.length, "earliest ID:", earliestTwitterCacheId);
    } else {
        log("No old tweets recovered");
    }

    getOldTweets();
}


/*
 * search for any more old tweets
 * between the earliest cached tweet and the earliest tweet date
 */
function getOldTweets() {
    log("requesting tweets older than", earliestTwitterCacheId);

    twit.getUserTimeline({
        user_id   : userId,
        count     : tweetsPerRequest,
        max_id    : earliestTwitterCacheId
    }, storeOldTweets);
}


/*
 * Deal with the data returned from the user timeline search
 */
function storeOldTweets(e, data) {

    if (!!e) {
        exit("Twitter search error", e);
    }

    if (data.length < 1) {
        log("no old tweets returned from twitter");
    } else {

        log(data.length, "old tweets returned from twitter");

        // loop through and store each tweet
        // if a tweet is earlier than the archive date searchAgain will be false
        // otherwise it will remain true
        var searchAgain = data.every(storeOldTweet);

        // check whether we've found them all?
        if (data.length < tweetsPerRequest) {
            log("Found all old tweets");
            searchAgain = false;
        }

        // check whether we've reached our request limit?
        if (requestCounter++ > requestLimit) {
            log("Request limit reached");
            searchAgain = false;
        }

        // should we continue to search for more tweets?
        if (!searchAgain) {
            fileHelper.save(tweetCacheFilePath, tweets, function(){
                scheduleNextTweet();
            });
            log("Got all old tweets");
        } else {
            getOldTweets();
        }
    }
}


/*
 * Add the tweet to the cache
 */
function storeOldTweet(data, index){

    var tweet, tweetId, tweetDate, diff;

    // compare tweet date to earliest required tweet
    tweetDate = moment(data.created_at);
    diff = archiveDate.diff(tweetDate);

    // check if the tweet is within the required date range
    if (diff > 0) {
        log("Tweet date (", tweetDate.format("Do MMM YYYY, h:mm:ssa") ,") is earlier than archive date", data.id_str, data.text.substring(0,15));
        return false;
    }

    tweet = {
        text: data.text,
        id: data.id_str,
        date: data.created_at
    };

    // add tweet to the cache
    tweets.push(tweet);

    log("storing tweet", tweet.id, tweet.text.substring(0,15));

    // keep track of the id of each tweet
    // so know the earliest one we have found
    earliestTwitterCacheId = largeNumbers.decrementHugeNumberBy1(tweet.id);

    // ensure 'every' method receives true - to search again
    return true;
}


/*
 * schedule tweets
 */
function scheduleNextTweet() {

    var nextTweet, nextTweetDate;

    if (tweets.length < 1) {
        log("No tweets to schedule");
        if (!!nextScheduledTweet) {
            nextScheduledTweet.cancel();
            nextScheduledTweet = null;
        }
        return;
    }

    // don't pop the tweet off the array yet - wait until it's posted
    nextTweet = tweets[tweets.length - 1];

    nextTweetDate = moment(nextTweet.date).add(initData.archiveTimeUnit, initData.archiveTime);

    // check if the next tweet is in the past?
    diff = nextTweetDate.diff(moment());
    if (diff < 0) {
        log("tweet", nextTweet.id, "is in the past, skipping");
        prepareNextTweet();
    } else {
        log("next tweet", nextTweet.id, "scheduled for ", nextTweetDate);
        nextScheduledTweet = schedule.scheduleJob(nextTweetDate.toDate(), function(){
            postTweet(nextTweet);
        });
    }
}


/*
 * post a tweet
 */
function postTweet(tweet) {

    var str = tweet.text;

    // ignore retweets
    if (str.indexOf("RT") === 0) {
        log('retweet detected, ignoring...');
        prepareNextTweet();

    // OK to go!
    } else {

        // don't spam people...
        str = str.replace('@', '_');
        str = str.replace('#', '_');


        // post to twitter
        twit.updateStatus(str, function(e, data) {

            if (!!e) {
                log("Error posting tweet", e);
                prepareNextTweet();
            } else {
                //console.log(e, util.inspect(data));
                log('tweet posted: ' + data.text + ' (ID: '+data.id_str+')');
                prepareNextTweet();
            }
        });
    }
}


/*
 * Once a tweet has been posted (or ignored if it is a RT)
 * Prepare for the next one
 */
function prepareNextTweet() {

    // remove tweet from array, resave tweet.json having removed tweet
    tweets.pop();

    // empty file if no tweets left
    if (tweets.length > 0) {
        fileHelper.save(tweetCacheFilePath, tweets, scheduleNextTweet);

    } else {
        fileHelper.empty(tweetCacheFilePath, scheduleNextTweet);
    }
}


/*
 * Search for new tweets
 */
function getNewTweets() {

    log("Getting new tweets (", tweets.length, "already in list)");

    if (tweets.length > 0) {
        latestTweetId = tweets[0].id;
    }

    // search for more tweets
    twit.getUserTimeline({
        user_id   : userId,
        count     : tweetsPerRequest,
        since_id  : latestTweetId
    }, storeNewTweets);
}


function storeNewTweets(e, data) {
    if (!!e) {
        exit("Twitter search error", e);
    }

    // reverse order to ensure we deal with them in the correct order
    data.reverse();

    log(data.length, "new tweets returned from twitter");

    // loop through and store each tweet
    var searchAgain = data.every(storeNewTweet);

    // check whether we've found them all?
    if (data.length < tweetsPerRequest) {
        log("Found all new tweets");
        searchAgain = false;
    }

    // should we continue to search for more tweets?
    if (!searchAgain) {
        if (data.length > 0) {
            fileHelper.save(tweetCacheFilePath, tweets, function(){
                if (!nextScheduledTweet) {
                    scheduleNextTweet();
                }
            });
        }
        log("Got all new tweets");
    } else {
        getNewTweets();
    }
}


/*
 * Add the tweet to the cache
 */
function storeNewTweet(data, index){

    var tweet = {
        text: data.text,
        id: data.id_str,
        date: data.created_at
    };

    // add tweet to start of the cache
    tweets.unshift(tweet);

    log("storing new tweet", tweet.id, tweet.text.substring(0,15));

    // ensure 'every' method receives true - to search again
    return true;
}




module.exports.init = init;