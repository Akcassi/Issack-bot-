import http from 'http'
http.createServer((req,res) => res.end('BOT LIVE')).listen(process.env.PORT || 10000)
import makeWASocket, { useMultiFileAuthState, DisconnectReason, downloadMediaMessage } from '@whiskeysockets/baileys'
import P from 'pino'
import Jimp from 'jimp'

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth')
    const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }), browser: ["Chrome","Chrome","110.0"], printQRInTerminal: false })
    sock.ev.on('creds.update', saveCreds)

    if(!sock.authState.creds.registered) {
        let phone = (process.env.PHONE_NUMBER||'').replace(/[^0-9]/g,'')
        if(phone) setTimeout(async()=>{ try{ let code=await sock.requestPairingCode(phone); console.log("========================================="); console.log(`🔑 PAIRING CODE: ${code}`); console.log("=========================================") }catch(e){console.log(e)} },3000)
    }

    sock.ev.on('connection.update', async (u) => {
        if(u.connection === 'open') console.log('✅ BOT CONNECTED! .thu poster a thawk tawh!')
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
                await sock.sendMessage(from, { text: "Hman dan:\n.thu HEADING | FOOTER\nPic nen thawn rawh!" })
                return
            }
            let [headRaw, ...footArr] = content.split("|")
            let head = headRaw.trim().toUpperCase()
            let foot = footArr.join("|").trim()

            let buf = null
            if(msg.message.imageMessage) buf = await downloadMediaMessage(msg, 'buffer', {}, { logger: P({level:'silent'}), reuploadRequest: sock.updateMediaMessage })
            else if(msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
                let q = { key: { remoteJid: from, id: msg.message.extendedTextMessage.contextInfo.stanzaId }, message: msg.message.extendedTextMessage.contextInfo.quotedMessage }
                buf = await downloadMediaMessage(q, 'buffer', {}, { logger: P({level:'silent'}), reuploadRequest: sock.updateMediaMessage })
            }
            if(!buf) {
                await sock.sendMessage(from, { text: `*${head}*\n\n${foot}` })
                return
            }

            // POSTER SIAM - HEADING + PIC + FOOTER 1 AH
            let pic = await Jimp.read(buf)
            pic.resize(800, Jimp.AUTO)
            
            let fontHead = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE)
            let fontFoot = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE)

            let headH = 140
            let footH = 200
            let final = new Jimp(800, pic.bitmap.height + headH + footH, 0x000000ff)

            // Chung - Heading
            final.print(fontHead, 0, 30, { text: head, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, 800, headH)
            // Lai - Pic
            final.composite(pic, 0, headH)
            // Hnuai - Footer
            final.print(fontFoot, 20, headH + pic.bitmap.height + 20, { text: foot, alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT }, 760, footH)

            let out = await final.getBufferAsync(Jimp.MIME_JPEG)
            await sock.sendMessage(from, { image: out, caption: `✅ ${head}` })
            console.log("Poster 1-a zawm sent!")

        } catch(e){ console.log("Error:", e) }
    })
}
startBot()
