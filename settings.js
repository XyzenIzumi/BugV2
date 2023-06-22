const fs = require('fs')
const chalk = require('chalk')

global.owner = ["6283102618987", "6282279915237"] // ganti nomor wa lu
global.bugrup = ["6283102618987"] // ganti nomor wa lu tapi 1 aja

global.ownerName = "Lexxy OFC"
global.ownerNumber = "6283102618987"
global.botName = "XyraBotz MD"

let file = require.resolve(__filename)
fs.watchFile(file, () => {
fs.unwatchFile(file)
console.log(chalk.yellowBright(`Update File Terbaru ${__filename}`))
delete require.cache[file]
require(file)
})