import http from 'http'
http.createServer((req,res) => res.end('BOT LIVE')).listen(process.env.PORT || 10000)
import makeWASocket, { useMultiFileAuthState, DisconnectReason, downloadMediaMessage } from '@whiskeysockets/baileys'
import P from 'pino'

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth')
    const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }), browser: ["Chrome","Chrome","110.0"], printQRInTerminal: false })
    sock.ev.on('creds.update', saveCreds)

    if(!sock.authState.creds.registered) {
        let phone = (process.env.PHONE_NUMBER||'').replace(/[^0-9]/g,'')
        if(phone) setTimeout(async()=>{ try{ let code=await sock.requestPairingCode(phone); console.log(`🔑 PAIRING CODE: ${code}`) }catch(e){console.log(e)} },3000)
    }

    sock.ev.on('connection.update', async (u) => {
        if(u.connection === 'open') console.log('✅ BOT CONNECTED!')
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
                await sock.sendMessage(from, { text: "Hman dan:\n.thu A CHUNG THU | A HNUAIA THU\nPic nen thawn rawh!" })
                return
            }
            let [headRaw, ...footArr] = content.split("|")
            let head = headRaw.trim()
            let foot = footArr.join("|").trim()

            let buf = null
            if(msg.message.imageMessage) buf = await downloadMediaMessage(msg, 'buffer', {}, { logger: P({level:'silent'}), reuploadRequest: sock.updateMediaMessage })
            else if(msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
                let q = { key: { remoteJid: from, id: msg.message.extendedTextMessage.contextInfo.stanzaId }, message: msg.message.extendedTextMessage.contextInfo.quotedMessage }
                buf = await downloadMediaMessage(q, 'buffer', {}, { logger: P({level:'silent'}), reuploadRequest: sock.updateMediaMessage })
            }

            if(!buf) {
                await sock.sendMessage(from, { text: `${head}\n\n${foot}` })
                return
            }

            // HETIANG HIAN A THAWN ANG - BUBBLE 1 ANG IN A LANG ANG
            // 1. A chung thu
            await sock.sendMessage(from, { text: head })
            // 2. A lai thlalak - a thianghlim, ziak kai lo
            await sock.sendMessage(from, { image: buf })
            // 3. A hnuai thu
            await sock.sendMessage(from, { text: foot })

        } catch(e){ console.log(e) }
    })
}
startBot()
