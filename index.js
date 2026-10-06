import http from 'http'
http.createServer((req,res) => res.end('BOT LIVE')).listen(process.env.PORT || 10000)
import makeWASocket, { useMultiFileAuthState, DisconnectReason, downloadMediaMessage } from '@whiskeysockets/baileys'
import P from 'pino'

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth')
    const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }), browser: ["Chrome","Chrome","110.0"] })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', async (u) => {
        if(u.connection === 'open') console.log('BOT CONNECTED!')
        if(u.connection === 'close') if(u.lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) startBot()
    })

    sock.ev.on('messages.upsert', async (m) => {
        try {
            let msg = m.messages[0]; if(!msg.message) return
            let from = msg.key.remoteJid
            let body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || ""
            if(!body.toLowerCase().includes(".thu")) return

            let content = body.slice(body.toLowerCase().indexOf(".thu")+4).trim()
            if(!content.includes("|")) {
                await sock.sendMessage(from, { text: "Hman dan:\n.thu HEADING | FOOTER\n\nPic nen thawn la, heading chung ah, pic lai ah, footer hnuai ah a awm ang!" })
                return
            }

            let parts = content.split("|")
            let heading = parts[0].trim()
            let footer = parts.slice(1).join("|").trim()

            let buf = null
            if(msg.message.imageMessage) {
                buf = await downloadMediaMessage(msg, 'buffer', {}, { logger: P({level:'silent'}), reuploadRequest: sock.updateMediaMessage })
            } else if(msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
                let q = { key: { remoteJid: from, id: msg.message.extendedTextMessage.contextInfo.stanzaId }, message: msg.message.extendedTextMessage.contextInfo.quotedMessage }
                buf = await downloadMediaMessage(q, 'buffer', {}, { logger: P({level:'silent'}), reuploadRequest: sock.updateMediaMessage })
            }

            if(!buf) {
                // Pic tel lo chuan text chiah
                await sock.sendMessage(from, { text: `*${heading.toUpperCase()}*\n━━━━━━━━━━━━\n\n${footer}` })
                return
            }

            // 1. HEADING CHUNG AH
            await sock.sendMessage(from, { text: `*${heading.toUpperCase()}*\n━━━━━━━━━━━━━━━━━━━━` })

            // 2. THLALAK + FOOTER HNUAI AH
            await sock.sendMessage(from, { image: buf, caption: `${footer}\n\n━━━━━━━━━━━━━━━━━━━━` })

            console.log("Sent heading + pic + footer!")

        } catch(e){ console.log(e) }
    })
}
startBot()
