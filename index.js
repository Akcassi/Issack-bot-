import http from 'http'
http.createServer((req,res) => res.end('ISSACK BOT IS LIVE')).listen(process.env.PORT || 10000)
import makeWASocket, { useMultiFileAuthState, DisconnectReason, downloadMediaMessage } from '@whiskeysockets/baileys'
import P from 'pino'
const PHONE = "919863955589"
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth')
    const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }), browser: ["Ubuntu","Chrome","20.0"] })
    sock.ev.on('creds.update', saveCreds)
    if(!sock.authState.creds.registered) {
        setTimeout(async () => { try { let c = await sock.requestPairingCode(PHONE); console.log(`PAIRING CODE: ${c}`) } catch(e){ console.log(e) } }, 5000)
    }
    sock.ev.on('connection.update', async (u) => {
        if(u.connection === 'open') console.log('BOT CONNECTED!')
        if(u.connection === 'close') { if(u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startBot() }
    })
    sock.ev.on('messages.upsert', async (m) => {
        let msg = m.messages[0]; if(!msg.message) return
        let from = msg.key.remoteJid
        let body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || ""
        if(body.toLowerCase().startsWith(".thu ")) {
            let c = body.slice(5).split("|"); if(c.length < 2) return
            let head = c[0].trim().toUpperCase(); let mess = c.slice(1).join("|").trim()
            let caption = `*${head}*\n━━━━━━━━━━━━━━━━━━━━\n\n${mess}\n\n━━━━━━━━━━━━━━━━━━━━`
            try {
                let buf = null
                if(msg.message.imageMessage) buf = await downloadMediaMessage(msg, 'buffer', {}, { logger: P({level:'silent'}), reuploadRequest: sock.updateMediaMessage })
                else if(msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
                    let q = { key: { remoteJid: from, id: msg.message.extendedTextMessage.contextInfo.stanzaId }, message: msg.message.extendedTextMessage.contextInfo.quotedMessage }
                    buf = await downloadMediaMessage(q, 'buffer', {}, { logger: P({level:'silent'}), reuploadRequest: sock.updateMediaMessage })
                }
                if(buf) await sock.sendMessage(from, { image: buf, caption: caption })
                else await sock.sendMessage(from, { text: caption })
            } catch(e){ await sock.sendMessage(from, { text: caption }) }
        }
    })
}
startBot()
