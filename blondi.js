const puppeteer = require('puppeteer');
const fs = require('fs');
const blacklist = require('./util/blacklist');
const yt = require('./util/youtube');

var properties = {}
if (fs.existsSync('./properties.json')) {
    properties = require('./properties.json');
} else {
    properties = {}
}

const blacklistedIds = blacklist.getBlacklistedChannelIds()
const blacklistedNames = blacklist.getBlacklistedChannelLinks()
const blacklisted = blacklistedIds.concat(blacklistedNames)

const minChannelAmount = properties.minChannelAmount || 20 // default value
const minSubscriptions = properties.minSubscriptions
const maxSubscriptions = properties.maxSubscriptions
const minTotalViews = properties.minTotalViews
const maxTotalViews = properties.maxTotalViews
const minAvgRecentViews = properties.minAvgRecentViews
const maxAvgRecentViews = properties.maxAvgRecentViews

var browser;

(async () => {

    const searchQuery = process.argv.slice(2).toString().split(",").join("+")
    const channelSearch = yt.getQueryUrl(searchQuery)

    browser = await puppeteer.launch({
        args: ['--lang=en']
    })

    //This one will be used to search the channels...
    const channelsPage = await browser.newPage()

    // ... and this one will navigate to each channel page to extrat data
    const dataPage = await browser.newPage()

    //Stores data which will be exported at the end
    const data = []

    //Searching for channels for given query
    await channelsPage.goto(channelSearch)
    await channelsPage.screenshot({path: 'screenshots/channels.png'})

    var channelIndex = 0

    //to get outside of this loop, I'm checking if I have enough items at the end of it
    while (true) {

        var channels = await channelsPage.evaluate(querySelector => {
            const elements = document.querySelectorAll(querySelector)
            const output = []
            for (var i = 0; i < elements.length; i++) {
                output.push(elements[i].href)
            }
            return output
        }, yt.channelQuerySelector)

        console.log(`found ${channels.length} channels...`)
        
        //Iterate over channels we found. ignore blacklisted, apply filters and so on
        for (; channelIndex < channels.length; channelIndex++) {
            channel = channels[channelIndex]
            const splitted = channel.split("/")
            //filter blacklisted channels
            if (blacklisted.includes(splitted[splitted.length-1])) {
                console.log(`${channel} is blacklisted`)
            } else {
                //Navigate to about page...
                console.log(`extracting data from ${channel}`)
                console.log("...about")
                await dataPage.goto(yt.getAboutPage(channel))

                //Scrolling up so it'll load the header elements
                await dataPage.evaluate(() => {
                    window.scrollBy(0, -1000)
                })

                //Extracting data from "about" page
                var aboutPageData = await dataPage.evaluate(selectors => {

                    const output = {}
                    
                    //title
                    titleElement = document.querySelector(selectors.divTitle) || document.querySelector(selectors.spanTitle) || { innerText: "---" }
                    output.title = titleElement.innerText

                    //subscriptions
                    const subCounter =  document.querySelector(selectors.subscribersCount)
                    if (subCounter) {
                        subsCounterText = subCounter.innerHTML
                        if (subsCounterText) {
                            output.subscriptions = subsCounterText.split(" ")[0].split(",").join("")
                        }
                    }

                    //views
                    const rightColumnElements = document.querySelectorAll(selectors.rightColumn)
                    for (i = 0; i < rightColumnElements.length; i++) {
                        const elementText = rightColumnElements[i].innerText
                        if (elementText.endsWith("views")) {
                            output.views = elementText.split(" ")[0].split(",").join("")
                            break
                        }
                    }

                    return output
            
                }, yt.channelAboutSelectors)

                // Applying filters
                if (minSubscriptions)
                    if (aboutPageData.subscriptions < minSubscriptions){
                        console.log("too few subscriptions")
                        continue
                    }
                
                if (maxSubscriptions)
                    if (aboutPageData.subscriptions > maxSubscriptions) {
                        console.log("too many subscriptions")
                        continue
                    }

                if (minTotalViews)
                    if (!aboutPageData.views || aboutPageData.views < minTotalViews) {
                        console.log("too few total views")
                        continue
                    }

                if (maxTotalViews)
                    if (!aboutPageData.views || aboutPageData.views > maxTotalViews) {
                        console.log("too many total views")
                        continue
                    }


                console.log("...videos")
                //Navigate to "videos" page
                await dataPage.goto(yt.getVideosPage(channel))
                //Extracting lastest videos data
                var videoPageData = await dataPage.evaluate(() => {

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

                //Applying filters again
                if (minAvgRecentViews)
                    if (!videoPageData.average || videoPageData.average < minAvgRecentViews) {
                        console.log("too few average recent views")
                        continue
                    }

                if (maxAvgRecentViews)
                    if (!videoPageData.average || videoPageData.average > maxAvgRecentViews) {
                        console.log("too many average recent views")
                        continue
                    }

                data.push({
                    aboutPageData: aboutPageData,
                    videoPageData: videoPageData,
                    channel: channel
                })

                //If there are enough items, stop scraping
                if (data.length == minChannelAmount) {
                    break
                }
            }
        }

        //now we check if there if there're enough items and, if not, scroll down so we can load more
        if (data.length < minChannelAmount) {
            previousHeight = await channelsPage.evaluate('document.querySelector("ytd-app").scrollHeight')
            await channelsPage.evaluate('window.scrollTo(0, document.querySelector("ytd-app").scrollHeight)')
            try {
                await channelsPage.waitForFunction(`document.querySelector("ytd-app").scrollHeight > ${previousHeight}`, {timeout: 10000})
            } catch(ex) {
                console.log("Not enough items. Scraping is over")
                break
            }
        } else {
            break
        }
    }


    //Exporting data into csv file
    const csv = [["Title", "Subscriptions", "Total_Views", "Most_Views_Recent", "Least_Views_Recent", "Avg_Views_Recent", "Link"]]
    for (i = 0; i < data.length; i++) {
        const row = []
        const channelData = data[i]
        row.push(channelData.aboutPageData.title.split(",").join(" "))

        if (channelData.aboutPageData.subscriptions)
            row.push(channelData.aboutPageData.subscriptions.split(",").join(""))
        else 
            row.push("")

        if (channelData.aboutPageData.views)
            row.push(channelData.aboutPageData.views.split(",").join(""))
        else 
            row.push("")

        const recentViews = channelData.videoPageData || {}

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

    //console.log(data)
    console.log(csv)
    const fs = require('fs');
    fs.writeFile("exp.csv", csv.join("\n"), function(err) {
        if(err) {
            return console.log(err)
        }

        console.log("The file was saved!")
    }); 

    browser.close()
})()