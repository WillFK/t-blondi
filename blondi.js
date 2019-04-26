const puppeteer = require('puppeteer');
const fs = require('fs')
var properties = {}
if (fs.existsSync('./properties.json')) {
    properties = require('./properties.json');
} else {
    properties = {}
}

var blacklist = []
if (fs.existsSync('./blacklist.txt')) {
    fs.readFile("./blacklist.txt", function(err, buf) {
        blacklisted = buf.toString().split("\n")
        for (var i = 0; i < blacklisted.length; i++) {
            blacklistedItem = blacklisted[i]
            if (blacklistedItem) {
                console.log(blacklistedItem)
                blacklist.push(blacklistedItem)
            }
        }
      })
}

if (fs.existsSync('./blacklist_links.txt')) {
    fs.readFile("./blacklist_links.txt", function(err, buf) {
    const blacklisted_links = buf.toString().split("\n")
    console.log("blacklisted links")
    for (var i = 0; i < blacklisted_links.length; i++) {
        const splitted = blacklisted_links[i].split("/")
        var link
        if (splitted[0].startsWith("www")) {
            link = blacklisted_links[i].split("/")[2]
        } else {
            link = blacklisted_links[i].split("/")[4]
        } 
        if (link) {
            console.log(link)
            blacklist.push(link)
        }
    }
  })
}

function checkBlacklisted(channel) {
    for (i = 0; i < blacklist.length; i++) {
        if (channel.endsWith(blacklist[i])) {
            console.log(`channel ${channel} is blacklisted`)
            return true
        }
    }
    return false
}

(async () => {
    
    const minChannelAmount = properties.minChannelAmount || 20 // default value

    console.log(process.argv)
    const searchQuery = process.argv.slice(2).toString().split(",").join("+")
    console.log(`search query: ${searchQuery}`)
    const searchQueryFormatted = searchQuery.split(" ").join("+")
    const channelSearch = `https://www.youtube.com/results?search_query=${searchQueryFormatted}&sp=EgIQAg%253D%253D`

    console.log(`opening channels: ${channelSearch}`)
    // setting browser up
    const browser = await puppeteer.launch({
        args: ['--lang=en']
    });
    const page = await browser.newPage()
    await page.goto(channelSearch)
    await page.screenshot({path: 'screenshots/channels.png'})

   var _items = await page.evaluate(() => {
       const elements = document.querySelectorAll("a.yt-simple-endpoint.style-scope.ytd-channel-renderer")
       const output = []
       for (var i = 0; i < elements.length; i++) {
           output.push(elements[i].href)
       }
       return output
   })

   _items = _items.concat([]).filter(x => !checkBlacklisted(x))
   itemCount = _items.length

   console.log(`found ${itemCount} channels`)

   while (itemCount < minChannelAmount) {
       console.log(`not enough items...`)
        _items = _items = await page.evaluate(() => {
            const elements = document.querySelectorAll("a.yt-simple-endpoint.style-scope.ytd-channel-renderer")
            const output = []
            for (var i = 0; i < elements.length; i++) {
                output.push(elements[i].href)
            }
            return output
        })
        
        _items = _items.concat([]).filter(x => !checkBlacklisted(x))
        itemCount = _items.length
        
        console.log(`new item count...${itemCount}`)
        previousHeight = await page.evaluate('document.querySelector("ytd-app").scrollHeight');
        await page.evaluate('window.scrollTo(0, document.querySelector("ytd-app").scrollHeight)');
        await page.waitForFunction(`document.querySelector("ytd-app").scrollHeight > ${previousHeight}`);
   }

    var channelLinks = []
    
    for (i = 0; i < minChannelAmount; i++) {
        channelLinks.push(_items[i])
    }

    const channelsData = []

    async function extractDataChannel(page) {

        function exportData(data) {
            const csv = [["Title", "Subscriptions", "Total_Views", "Most_Views_Recent", "Least_Views_Recent", "Avg_Views_Recent", "Link"]]
            for (i = 0; i < data.length; i++) {
                const row = []
                const channelData = data[i]
                row.push(channelData.title.split(",").join(" "))

                if (channelData.subscriptions)
                    row.push(channelData.subscriptions.split(",").join(""))
                else 
                    row.push("")

                if (channelData.views)
                    row.push(channelData.views.split(",").join(""))
                else 
                    row.push("")

                const recentViews = channelData.recentViews || {}

                if (recentViews.mostPop) {
                    row.push(recentViews.mostPop)
                } else {
                    row.push("")
                }

                if (recentViews.leastPop) {
                    row.push(recentViews.leastPop)
                } else {
                    row.push("")
                }

                if (recentViews.average) {
                    row.push(recentViews.average)
                } else {
                    row.push("")
                }

                row.push(channelData.channel)
                csv.push(row.join(","))
            }
            console.log(data)
            console.log(csv)
            const fs = require('fs');
            fs.writeFile("exp.csv", csv.join("\n"), function(err) {
                if(err) {
                    return console.log(err)
                }

                console.log("The file was saved!")
            }); 
        }

        async function mock() {
            const page = await browser.newPage()
        }

        async function extractVideosData(data, channel, page) {
            //navigate to videos page
            try {
                console.log(`getting video data from ${channel}/videos?view=0&sort=dd&flow=grid`)
                await page.goto(`${channel}/videos?view=0&sort=dd&flow=grid`)
                var views = await page.evaluate(() => {

                    //convert views count string to integer value
                    function parseViews(value) {
                        if (value.endsWith("K")) {
                            value = value.slice(0, -1)
                            return value * 1000
                        } else if (value.endsWith("M")) {
                            value = value.slice(0, -1)
                            return value * 1000000
                        } else if (value.endsWith("B")) {
                            value = value.slice(0, -1)
                            return value * 1000000000
                        } else if (isNaN(value)) {
                            return 0 //unexpected value
                        } else {
                            return value * 1 // to int???
                        }
                    }

                    // get "46k views" (for instance) span
                    const viewLabels = document.querySelectorAll("ytd-grid-video-renderer #metadata-line span:first-child")
                    if (viewLabels.length > 0) {
                        var min = Number.MAX_SAFE_INTEGER
                    } else {
                        var min = 0
                    }
                    var max = 0
                    var sum = 0
                    var labels = []
                    for (i = 0; i < viewLabels.length; i++) {
                        
                        const label = viewLabels[i].innerText
                        labels.push(label)
                        const viewCount = parseViews(label.split(" ")[0])
                        sum += viewCount
                        
                        if (viewCount > max) {
                            max = viewCount
                        }

                        if (viewCount < min) {
                            min = viewCount
                        }
                    }

                    const avg = sum / viewLabels.length

                    return {
                        "labels": labels,
                        "mostPop": max,
                        "leastPop": min,
                        "average": Math.round(avg),
                        "sum" : sum,
                        "count": viewLabels.length
                    }
                })

                data.recentViews = views
            } catch (ex) {
                console.log("error!")
                console.error(ex)
            }
        }
        
        if (channelLinks.length > 0) {
            const _channel = channelLinks.shift()
            const channel = `${_channel}/about`
            console.log(`extracting data from ${channel}`)
            await page.goto(channel)

            await page.evaluate(() => {
                window.scrollBy(0, -1000)
            })

            var data = await page.evaluate(() => {

                const output = {}
                
                //title
                titleElement = document.querySelector("div#details > div#title") || document.querySelector("span#channel-title") || { innerText: "---" }
                output.title = titleElement.innerText

                //subscriptions
                const subCounter =  document.querySelector("#subscriber-count")
                if (subCounter) {
                    subsCounterText = subCounter.innerHTML
                    if (subsCounterText) {
                        output.subscriptions = subsCounterText.split(" ")[0]
                    }
                }

                //views
                const rightColumnElements = document.querySelectorAll("#right-column > yt-formatted-string")
                for (i = 0; i < rightColumnElements.length; i++) {
                    const elementText = rightColumnElements[i].innerText
                    if (elementText.endsWith("views")) {
                        output.views = elementText.split(" ")[0]
                        break
                    }
                }

                return output
        
            })

            const filename = JSON.stringify(data.title).replace(/\W/g, '')
            data.filename = filename

            await page.screenshot({path: `screenshots/${filename}.png`})

            data.channel = _channel

            await extractVideosData(data, data.channel, page)

            channelsData.push(data)

            await extractDataChannel(page)
        } else {
            browser.close()
            exportData(channelsData)
        }
    }

    console.log(channelLinks)

    extractDataChannel(page)
})();