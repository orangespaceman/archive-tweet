# TweetArchiver

Retweet things from another account a set time after they were originally posted


## Set up

Setting up a new TweetArchiver account will require a few steps:

  * Create a new [Twitter](http://twitter.com/) account
  * [Register a new app](https://dev.twitter.com/) with the twitter account - take a note of the four different keys listed below, and make sure the app has read and write access.  (Give it read and write access before creating your access tokens so they share this access, to check see [here](https://twitter.com/settings/applications))


## Init

 * Check out the app from github
 * run `npm install` to install dependencies
 * Duplicate/rename the app.sample.js file, call it app.js (or similar)
 * Open the app.js file, add the correct details for the account you want to retweet
 * Once configured, run `node app.js`


### Init options explained

  * *originalTwitterAccount*: The Twitter account we're copying from
  * *archiveTime*: An integer to indicate how much later you want to retweet
  * *archiveTimeUnit*: The time units. Options are 'minutes', 'hours', 'days' 'weeks', 'months' or 'years'
  * *twitterConsumerKey*, *twitterConsumerSecret*, *twitterConsumerOauthToken* and *twitterConsumerOauthSecret*: Twitter Authorisation tokens -  [Register a new app](https://dev.twitter.com/) for these
