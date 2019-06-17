module.exports = {
 
    exportData: function(filePath, data, fields) {
        const fs = require('fs')
        const csv = [fields]
        for (i = 0; i < data.length; i++) {
            const row = []
            const channelData = data[i]
            for (j = 0; j < fields.length; j++) {
                row.push(channelData[fields[j]] || "")
            }
            csv.push(row)
        }

        fs.writeFile(filePath, csv.join("\n"), function(err) {
            if(err) {
                return console.log(err)
            }
    
            console.log("The file was saved!")
        }); 
    }
}