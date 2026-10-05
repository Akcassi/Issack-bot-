import http from 'http'
http.createServer((req,res) => res.end('ISSACK BOT IS LIVE')).listen(process.env.PORT || 10000)
import makeWASocket, { useMultiFileAuthState, DisconnectReason, downloadMediaMessage } from '@whiskeysockets/baileys'
import P from 'pino'
import sharp from 'sharp'

const PHONE = "919863955589"

async function createPoster(imageBuffer, heading, message) {
    const W = 1080
    const H = 1350
    const topBar = 180
    const bottomBar = 280

    const img = await sharp(imageBuffer).resize(W, H - topBar - bottomBar, { fit: 'cover' }).toBuffer()

    const svgTop = `<svg width="${W}" height="${topBar}"><rect width="100%" height="100%" fill="black"/><text x="50%" y="55%" font-family="Arial Black" font-size="60" fill="white" text-anchor="middle" font-weight="bold">${heading.toUpperCase()}</text><rect y="${topBar-10}" width="${W}" height="10" fill="white"/></svg>`
    
    const wrappedMsg = message.length > 40 ? message.match(/.{1,35}(\s|$)/g).join('\n') : message
    const svgBottom = `<svg width="${W}" height="${bottomBar}"><rect width="100%" height="100%" fill="black"/><text x="50%" y="40%" font-family="Arial" font-size="42" fill="white" text-anchor="middle">${wrappedMsg}</text><rect width="${W}" height="10" fill="white"/></svg>`

    const topBuf = await sharp(Buffer.from(svgTop)).png().toBuffer()
    const bottomBuf = await sharp(Buffer.from(svgBottom)).png().toBuffer()

    return await sharp({ create: { width: W, height: H, channels: 4, background: { r:0,g:0,b:0,alpha:1 } } })
        .composite([{ input: topBuf, top: 0, left: 0 }, { input: img, top: topBar, left: 0 }, { input: bottomBuf, top: H - bottomBar, left: 0 }])
        .jpeg().toBuffer()
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth')
    const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }), browser: ["Ubuntu","Chrome","20.0"] })
    sock.ev.on('creds.update', saveCreds)
    if(!sock.authState.creds.registered) {
        setTimeout(async () => { try { let c = await sock.requestPairingCode(PHONE); console.log(`PAIRING CODE: ${c}`) } catch(e){} }, 5000)
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
            let head = c[0].trim(); let mess = c.slice(1).join("|").trim()
            try {
                let buf = null
                if(msg.message.imageMessage) buf = await downloadMediaMessage(msg, 'buffer', {}, { logger: P({level:'silent'}), reuploadRequest: sock.updateMediaMessage })
                else if(msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
                    let q = { key: { remoteJid: from, id: msg.message.extendedTextMessage.contextInfo.stanzaId }, message: msg.message.extendedTextMessage.contextInfo.quotedMessage }
                    buf = await downloadMediaMessage(q, 'buffer', {}, { logger: P({level:'silent'}), reuploadRequest: sock.updateMediaMessage })
                }
                if(buf) {
                    let poster = await createPoster(buf, head, mess)
                    await sock.sendMessage(from, { image: poster, caption: `*${head.toUpperCase()}*\n${mess}` })
                } else {
                    await sock.sendMessage(from, { text: `*${head.toUpperCase()}*\n━━━━━━━━━━━━\n\n${mess}\n\n━━━━━━━━━━━━` })
                }
            } catch(e){ console.log(e); await sock.sendMessage(from, { text: `*${head.toUpperCase()}*\n\n${mess}` }) }
        }
    })
}
startBot()
