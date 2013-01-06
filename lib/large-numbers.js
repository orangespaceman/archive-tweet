/*
 * JavaScript can't natively deal with the huge twitter id numbers...
 * http://stackoverflow.com/questions/9717488/using-since-id-and-max-id-in-twitter-api
 */
function decrementHugeNumberBy1(n) {
    // make sure s is a string, as we can't do math on numbers over a certain size
    n = n.toString();
    var allButLast = n.substr(0, n.length - 1);
    var lastNumber = n.substr(n.length - 1);

    if (lastNumber === "0") {
        return decrementHugeNumberBy1(allButLast) + "9";
    }
    else {
        var finalResult = allButLast + (parseInt(lastNumber, 10) - 1).toString();
        return trimLeft(finalResult, "0");
    }
}

function trimLeft(s, c) {
    var i = 0;
    while (i < s.length && s[i] === c) {
        i++;
    }

    return s.substring(i);
}


module.exports = {
    decrementHugeNumberBy1: decrementHugeNumberBy1
};