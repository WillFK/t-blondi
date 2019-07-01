module.exports = {

    getUserHandle: function(url) {
        var result = null
        if (url.includes("/user/")) {
            var chuncks = url.split("/")
            result = chuncks[chuncks.length - 2]
        }
        return result
    },

    getQueryUrl: function(query) {
        const searchQueryFormatted = query.split(" ").join("+")
        return `https://www.youtube.com/results?search_query=${searchQueryFormatted}&sp=EgIQAg%253D%253D`
    },

    getAboutPage: function(channel) {
        return `${channel}/about`
    },

    getVideosPage: function(channel) {
        return `${channel}/videos?view=0&sort=dd&flow=grid`
    },

    channelQuerySelector: "a.yt-simple-endpoint.style-scope.ytd-channel-renderer",
    channelAboutSelectors: {
        divTitle: "div#details > div#title",
        spanTitle: "span#channel-title",
        subscribersCount: "#subscriber-count",
        rightColumn: "#right-column > yt-formatted-string"
    }
}