const { default: lexxyConnect, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, generateForwardMessageContent, prepareWAMessageMedia, generateWAMessageFromContent, generateMessageID, downloadContentFromMessage, makeInMemoryStore, jidDecode, proto } = require('@adiwajshing/baileys')
const pino = require('pino')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const figlet = require('figlet')
const path = require('path')
const { color, bgcolor, mycolor } = require('../nodeJS/lib/color')
const { smsg, isUrl, getBuffer, fetchJson, await, sleep } = require('../nodeJS/lib/functions')
const { groupResponse_Welcome, groupResponse_Remove, groupResponse_Promote, groupResponse_Demote } = require('./group.js')
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) })

async function startlexxy() {
let { version, isLatest } = await fetchLatestBaileysVersion();
const { state, saveCreds } = await useMultiFileAuthState('./connection/SESSION/ORIBOT');
const lexxy = lexxyConnect({
version,
logger: pino({
level: 'fatal'
}),
printQRInTerminal: true, // memunculkan qr di terminal
markOnlineOnConnect: true, // membuat wa bot of, true jika ingin selalu menyala
patchMessageBeforeSending: (message) => {
const requiresPatch = !!(
message.buttonsMessage ||
message.templateMessage ||
message.listMessage
);
if (requiresPatch) {
message = {
viewOnceMessage: {
message: {
messageContextInfo: {
deviceListMetadataVersion: 2,
deviceListMetadata: {},
},
...message,
},
},
};
}
return message;
},
getMessage: async (key) => {
if (store) {
const msg = await store.loadMessage(key.remoteJid, key.id)
return msg.message || undefined }
return { conversation: "hello, i'm Lexxy Official"
}},
browser: ['Bot Lexxy', 'safari', '1.0.0'],
auth: state
})

lexxy.ev.on("creds.update", saveCreds);

store.bind(lexxy.ev)

console.log(color(figlet.textSync('VIPME', {
font: 'Standard',
horizontalLayout: 'default',
vertivalLayout: 'default',
width: 80,
whitespaceBreak: false
}), 'red'))

lexxy.ev.on('messages.upsert', async chatUpdate => {
try {
m = chatUpdate.messages[0]
if (!m.message) return
m.message = (Object.keys(m.message)[0] === 'ephemeralMessage') ? m.message.ephemeralMessage.message : m.message
if (m.key && m.key.remoteJid === 'status@broadcast') return
if (!lexxy.public && !m.key.fromMe && chatUpdate.type === 'notify') return
if (m.key.id.startsWith('BAE5') && m.key.id.length === 16) return
m = smsg(lexxy, m, store)
require('../nodeJS/ohmylex')(lexxy, m, chatUpdate, store)
} catch (err) {
console.log(err)
}
})

lexxy.decodeJid = (jid) => {
if (!jid) return jid
if (/:\d+@/gi.test(jid)) {
let decode = jidDecode(jid) || {}
return decode.user && decode.server && decode.user + '@' + decode.server || jid
} else return jid
}

lexxy.ev.on('contacts.update', update => {
for (let contact of update) {
let id = lexxy.decodeJid(contact.id)
if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
}
})

lexxy.setStatus = (status) => {
lexxy.query({
tag: 'iq',
attrs: {
to: '@s.whatsapp.net',
type: 'set',
xmlns: 'status',
},
content: [{
tag: 'status',
attrs: {},
content: Buffer.from(status, 'utf-8')
}]
})
return status
}

lexxy.sendText = (jid, text, quoted = '', options) => lexxy.sendMessage(jid, { text: text, ...options }, { quoted })

lexxy.public = true

lexxy.serializeM = (m) => smsg(lexxy, m, store)

lexxy.ev.on('connection.update', async (update) => {
const { connection, lastDisconnect } = update	
if (connection === 'close') {
let reason = new Boom(lastDisconnect?.error)?.output.statusCode
if (reason === DisconnectReason.badSession) { console.log(`Bad Session File, Please Delete Session and Scan Again`); lexxy.logout(); }
else if (reason === DisconnectReason.connectionClosed) { console.log("Connection closed, reconnecting...."); startlexxy(); }
else if (reason === DisconnectReason.connectionLost) { console.log("Connection Lost from Server, reconnecting..."); startlexxy(); }
else if (reason === DisconnectReason.connectionReplaced) { console.log("Connection Replaced, Another New Session Opened, Please Close Current Session First"); lexxy.logout(); }
else if (reason === DisconnectReason.loggedOut) { console.log(`Device Logged Out, Please Scan Again And Run.`); lexxy.logout(); }
else if (reason === DisconnectReason.restartRequired) { console.log("Restart Required, Restarting..."); startlexxy(); }
else if (reason === DisconnectReason.timedOut) { console.log("Connection TimedOut, Reconnecting..."); startlexxy(); }
else lexxy.end(`Unknown DisconnectReason: ${reason}|${connection}`)
}
console.log('Connected...', update)
})

lexxy.ev.process(
async (events) => {
if (events['presence.update']) {
await lexxy.sendPresenceUpdate('available')
}
if (events['messages.upsert']) {
const upsert = events['messages.upsert']
for (let msg of upsert.messages) {
if (msg.key.remoteJid === 'status@broadcast') {
if (msg.message?.protocolMessage) return
await sleep(3000)
await lexxy.readMessages([msg.key])
}
}
}

if (events['creds.update']) { 
await saveCreds()
}})

lexxy.ev.on('group-participants.update', async (update) =>{
groupResponse_Demote(lexxy, update)
groupResponse_Promote(lexxy, update)
groupResponse_Welcome(lexxy, update)
groupResponse_Remove(lexxy, update)
console.log(update)
})

return lexxy
}

startlexxy()

let file = require.resolve(__filename)
fs.watchFile(file, () => {
fs.unwatchFile(file)
console.log(chalk.yellowBright(`Update File Terbaru ${__filename}`))
delete require.cache[file]
require(file)
})