import http from 'http'
http.createServer((req,res) => res.end('ISSACK BOT LIVE')).listen(process.env.PORT || 10000)
import makeWASocket, { useMultiFileAuthState, DisconnectReason, downloadMediaMessage } from '@whiskeysockets/baileys'
import P from 'pino'
const PHONE = "919863955589"

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth')
    const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }), browser: ["Ubuntu","Chrome","20.0"] })
    sock.ev.on('creds.update', saveCreds)
    
    if(!sock.authState.creds.registered) {
        setTimeout(async () => {
            try { let c = await sock.requestPairingCode(PHONE); console.log(`PAIRING CODE: ${c}`) } catch(e){}
        }, 3000)
    }

    sock.ev.on('connection.update', async (u) => {
        if(u.connection === 'open') {
            console.log('BOT CONNECTED!')
            await sock.sendMessage(PHONE+"@s.whatsapp.net", { text: "✅ BOT A NUNG TA! .thu hman theih e!" })
        }
        if(u.connection === 'close') {
            if(u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startBot()
        }
    })

    sock.ev.on('messages.upsert', async (m) => {
        let msg = m.messages[0]; if(!msg.message || msg.key.fromMe) return
        let from = msg.key.remoteJid
        let body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || ""
        if(!body.toLowerCase().startsWith(".thu ")) return
        
        let parts = body.slice(5).split("|")
        if(parts.length < 2) {
            await sock.sendMessage(from, { text: "Hman dan: .thu HEADING | MESSAGE\nEntir: .thu THUPUAN | Naktuk inkhawm" })
            return
        }
        
        let head = parts[0].trim().toUpperCase()
        let mess = parts.slice(1).join("|").trim()
        let finalCaption = `*${head}*\n━━━━━━━━━━━━━━━━━━━━\n\n${mess}\n\n━━━━━━━━━━━━━━━━━━━━`

        try {
            let buf = null
            if(msg.message.imageMessage) {
                buf = await downloadMediaMessage(msg, 'buffer', {}, { logger: P({level:'silent'}), reuploadRequest: sock.updateMediaMessage })
            } else if(msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
                let q = { key: { remoteJid: from, id: msg.message.extendedTextMessage.contextInfo.stanzaId }, message: msg.message.extendedTextMessage.contextInfo.quotedMessage }
                buf = await downloadMediaMessage(q, 'buffer', {}, { logger: P({level:'silent'}), reuploadRequest: sock.updateMediaMessage })
            }
            if(buf) {
                await sock.sendMessage(from, { image: buf, caption: finalCaption })
            } else {
                await sock.sendMessage(from, { text: finalCaption })
            }
        } catch(e) {
            console.log(e)
            await sock.sendMessage(from, { text: finalCaption })
        }
    })
}
startBot()
