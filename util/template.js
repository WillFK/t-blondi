module.exports = {

    getTemplate: function() {
        const fs = require('fs')
        var template = null
        
        if (fs.existsSync('./template.txt')) {
            template = fs.readFileSync("./template.txt").toString().split("\n")[0].split("\t")
        }

        return template
    }
}