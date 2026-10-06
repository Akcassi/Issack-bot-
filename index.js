import http from 'http'
http.createServer((req,res) => res.end('BOT LIVE')).listen(process.env.PORT || 10000)
import makeWASocket, { useMultiFileAuthState, DisconnectReason, downloadMediaMessage } from '@whiskeysockets/baileys'
import P from 'pino'
import Jimp from 'jimp'

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
                await sock.sendMessage(from, { text: "Hman dan:.thu HEADING | THU DANG\nPic nen thawn rawh!" })
                return
            }
            let parts = content.split("|")
            let head = parts[0].trim().toUpperCase()
            let foot = parts.slice(1).join("|").trim()

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

            // SIAM THAR - HEADING + PIC + FOOTER in zawm vek
            let image = await Jimp.read(buf)
            let W = 800
            image.resize(W, Jimp.AUTO)

            let fontHead = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK)
            let fontHeadWhite = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE)
            let fontFoot = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK)

            let headH = 120
            let footH = 180
            let newH = image.bitmap.height + headH + footH

            let finalImg = new Jimp(W, newH, 0xffffffff)

            // Heading background - dum deuh
            let topBar = new Jimp(W, headH, 0x000000ff)
            finalImg.composite(topBar, 0, 0)
            finalImg.print(fontHeadWhite, 20, 20, { text: head, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, W-40, headH)

            // Pic lai ah
            finalImg.composite(image, 0, headH)

            // Footer background - var
            let bottomBar = new Jimp(W, footH, 0xffffffff)
            finalImg.composite(bottomBar, 0, headH + image.bitmap.height)
            finalImg.print(fontFoot, 20, headH + image.bitmap.height + 20, { text: foot, alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT }, W-40, footH-40)

            let outBuf = await finalImg.getBufferAsync(Jimp.MIME_JPEG)

            await sock.sendMessage(from, { image: outBuf, caption: `✅ *${head}* poster siam a ni e!` })
            console.log("Poster sent!")

        } catch(e){ console.log(e) }
    })
}
startBot()
