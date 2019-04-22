const puppeteer = require('puppeteer');
const fs = require('fs')
var properties = {}
if (fs.existsSync('./properties.json')) {
    properties = require('./properties.json');
} else {
    properties = {}
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

   var itemCount = await page.evaluate(() => {
       return document.querySelectorAll("a.yt-simple-endpoint.style-scope.ytd-channel-renderer").length
   })

   console.log(`found ${itemCount} channels`)

   while (itemCount < minChannelAmount) {
       console.log(`not enough items...`)
        itemCount = await page.evaluate(() => {
            return document.querySelectorAll("a.yt-simple-endpoint.style-scope.ytd-channel-renderer").length
        })
        console.log(`new item count...${itemCount}`)
        previousHeight = await page.evaluate('document.querySelector("ytd-app").scrollHeight');
        await page.evaluate('window.scrollTo(0, document.querySelector("ytd-app").scrollHeight)');
        await page.waitForFunction(`document.querySelector("ytd-app").scrollHeight > ${previousHeight}`);
   }

    var channelLinks = await page.evaluate((limit) => {

        const output = []
        const links = document.querySelectorAll("a.yt-simple-endpoint.style-scope.ytd-channel-renderer")
        for (i = 0; i < limit; i++) {
            output.push(links[i].href)
        }
        return output

    }, minChannelAmount)

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
                    if (viewLabels > 0) {
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


            await page.screenshot({path: `screenshots/${data.title.split("/").join("-")}.png`})

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