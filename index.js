import http from 'http'
http.createServer((req,res) => res.end('ISSACK BOT IS LIVE')).listen(process.env.PORT || 10000)

import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import P from 'pino'

const PHONE = "919863955589"

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth')
    const sock = makeWASocket({
        auth: state,
        logger: P({ level: 'silent' }),
        browser: ["Ubuntu","Chrome","20.0"]
    })
    sock.ev.on('creds.update', saveCreds)

    if(!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(PHONE)
                console.log(`PAIRING CODE: ${code}`)
            } catch(e){ console.log(e) }
        }, 5000)
    }

    sock.ev.on('connection.update', async (u) => {
        if(u.connection === 'open') {
            console.log('BOT CONNECTED!')
        }
        if(u.connection === 'close') {
            let shouldReconnect = u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            if(shouldReconnect) startBot()
        }
    })

    sock.ev.on('messages.upsert', async (m) => {
        let msg = m.messages[0]
        if(!msg.message) return
        let from = msg.key.remoteJid
        let body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || ""

        if(body.toLowerCase().startsWith(".thu ")) {
            let c = body.slice(5).split("|")
            if(c.length < 2) { await sock.sendMessage(from, { text: "Format: .thu HEADING | MESSAGE" }); return }
            let head = c[0].trim().toUpperCase()
            let mess = c.slice(1).join("|").trim()
            let caption = `*${head}*\n━━━━━━━━━━━━\n\n${mess}\n\n━━━━━━━━━━━━`
            try {
                if(msg.message.imageMessage) {
                    let buf = await sock.downloadMediaMessage(msg, 'buffer', {})
                    await sock.sendMessage(from, { image: buf, caption: caption })
                } else if(msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
                    let q = { key: { remoteJid: from, id: msg.message.extendedTextMessage.contextInfo.stanzaId }, message: msg.message.extendedTextMessage.contextInfo.quotedMessage }
                    let buf = await sock.downloadMediaMessage(q, 'buffer', {})
                    await sock.sendMessage(from, { image: buf, caption: caption })
                } else {
                    await sock.sendMessage(from, { text: caption })
                }
            } catch(e) { await sock.sendMessage(from, { text: caption }) }
        }
        if(body.toLowerCase() === ".menu") {
            await sock.sendMessage(from, { text: "*ISSACK BOT NUNG E!*\n\n.thu HEADING | MESSAGE" })
        }
    })
}
startBot()
