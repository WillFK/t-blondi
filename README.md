# T-blondi

Youtube data scraper

## setup

- install node.js (windows, mc, linux...)
- install dependencies by runnig: `npm i puppeteer `
- to run the program type: `node blondi.js [your query here]`

## PARAMETERS

You can choose the amount of channels it should scrap:

- at project level, create a file called `properties.json`
- the content of the file should follow this templace:
```
{
    "minChannelAmount" : 3
}
```

You can also blacklist the channels and users it should ignore.

- create a file called `blacklist.txt`
- then add to it the channels you want to ignore, like:
```
UCkGthGTWjI2awl1pqCQRncQ
UCaYLBJfw6d8XqmNlL204lNg
ESLBRASIL
```
