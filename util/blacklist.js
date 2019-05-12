module.exports = {

    getBlacklistedChannelIds: function() {
        const fs = require('fs')
        const blacklist = new Array()
        if (fs.existsSync('./blacklist.txt')) {
            blacklisted= fs.readFileSync("./blacklist.txt").toString().split("\n")
            for (var i = 0; i < blacklisted.length; i++) {
                blacklistedItem = blacklisted[i].replace("\r", "")
                if (blacklistedItem) {
                    blacklist.push(blacklistedItem)
                }
            }
        }
        return blacklist
    },

    getBlacklistedChannelLinks: function() {
        const fs = require('fs')
        const blacklist = []
        if (fs.existsSync('./blacklist_links.txt')) {
            const blacklisted_links = fs.readFileSync("./blacklist_links.txt").toString().split("\n")
            for (var i = 0; i < blacklisted_links.length; i++) {
                const splitted = blacklisted_links[i].split("/")
                var link
                if (splitted[0].startsWith("www")) {
                    link = blacklisted_links[i].split("/")[2]
                } else {
                    link = blacklisted_links[i].split("/")[4]
                } 
        
                if (link) link = link.replace("\r", "")
        
                if (link) {
                    blacklist.push(link.replace("\r", ""))
                }
            }
        }
        return blacklist
    }
}