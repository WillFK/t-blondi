const puppeteer = require('puppeteer');

(async () => {
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

    var channelLinks = await page.evaluate(() => {

        const output = []
        const links = document.querySelectorAll("a.yt-simple-endpoint.style-scope.ytd-channel-renderer")
        for (i = 0; i < links.length; i++) {
            output.push(links[i].href)
        }
        return output

    })

    const channelsData = []

    // TODO fix this function / async mess
    function extractDataChannel() {
        (async () => {
            if (channelLinks.length > 0) {
                const channel = `${channelLinks.shift()}/about`
                console.log(`extracting data from ${channel}`)
                const page = await browser.newPage()
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


                await page.screenshot({path: `screenshots/${data.title}.png`})

                data.channel = channel

                channelsData.push(data)

                extractDataChannel()
            } else {
                browser.close()
                console.log(channelsData)
            }
        })()
    }

    console.log(channelLinks)

    extractDataChannel()
})();