module.exports = {
 
    median: function(values) {
        values.sort()
        var median
        if (values.length % 2) {
            median = values[(values.length-1) / 2]
        } else {
            median = (values[values.length/2-1] + values[values.length/2])/2
        }
        return median
    }
}