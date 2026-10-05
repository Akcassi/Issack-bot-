import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import P from 'pino'
import { Boom } from '@hapi/boom'

const PHONE_NUMBER = process.env.PHONE_NUMBER || "919863955589"

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')
    const sock = makeWASocket({
        auth: state,
        logger: P({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"],
    })
    sock.ev.on('creds.update', saveCreds)

    if(!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(PHONE_NUMBER)
                console.log(`\n========================\nPAIRING CODE: ${code}\n========================\n`)
            } catch(e){ console.log(e) }
        }, 3000)
    }

    sock.ev.on('connection.update', (u) => {
        const { connection, lastDisconnect } = u
        if(connection === 'close') {
            const s = (lastDisconnect?.error as Boom)?.output?.statusCode!== DisconnectReason.loggedOut
            if(s) startBot()
        } else if(connection === 'open') console.log('✅ CONNECTED!')
    })

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0]
        if(!msg.message || msg.key.fromMe) return
        const from = msg.key.remoteJid
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "").trim()

        // .menu
        if(text.toLowerCase() === ".menu" || text.toLowerCase() === "menu") {
            const menu = `*🤖 ISSACK THU SIAM BOT 🤖*\n\n*Kohhran / Group a hman tur:*\n\n*1. THU + PIC + THU:*\nThlalak nen caption ah hetiang hian type rawh:\n\`.thu THU HEADING | A hnuai a thu zawm tur\`\n\n*Entirnan:*\nThlalak thawn la caption ah:\n\`.thu CHAWLHNI THUPUAN | Naktuk Chawlhni chawhma dar 10 ah Kohhran inkhawm a awm ang. Kim takin lo kal ang u.\`\n\n*2. TEXT CHAUH:*\n\`.thu HEADING | THU\`\nThlalak tel lo in a siam ang\n\nA chung ah Heading lian in, a hnuai ah thlalak, a hnuai leh ah thu a dah ang!`
            await sock.sendMessage(from, { text: menu })
            return
        }

        // THU COMMAND - A BER
        if(text.toLowerCase().startsWith(".thu ")) {
            const content = text.slice(5).trim() // .thu tih hnuai
            const parts = content.split("|")
            
            if(parts.length < 2) {
                await sock.sendMessage(from, { text: "❌ *Format a dik lo!*\n\nHetiang hian type rawh:\n`.thu HEADING | A hnuai a thu`\n\nEntirnan:\n`.thu THUPUAN PAWIMAWH | Naktuk ah inkhawm a awm e`" })
                return
            }

            const heading = parts[0].trim().toUpperCase()
            const message = parts.slice(1).join("|").trim()

            // Thlalak a tel em?
            const isImage = msg.message.imageMessage
            const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage
            
            let posterCaption = `*${heading}*\n━━━━━━━━━━━━━━━━━━━━\n\n${message}\n\n━━━━━━━━━━━━━━━━━━━━\n_© Issack-Bot_`

            if(isImage) {
                // Thlalak nen a rawn thawn chuan - download a ngai lo, a thlalak kha hmang nghal
                // Mahse Baileys ah caption edit mai a har, chuvangin a thlalak kha la chhuak ang
                await sock.sendMessage(from, { text: "⏳ Ka siam mek e..." })
                // Original image chu forward anga siam that
                // A awlsam zawk: user thlalak kha a la a, caption thar nen a thawn let
                const buffer = await sock.downloadMediaMessage(msg)
                await sock.sendMessage(from, { image: buffer, caption: posterCaption })
            } else if(quoted) {
                // Reply a image ah
                await sock.sendMessage(from, { text: "⏳ Ka siam mek e..." })
                const quotedMsg = { key: { remoteJid: from, id: msg.message.extendedTextMessage.contextInfo.stanzaId }, message: msg.message.extendedTextMessage.contextInfo.quotedMessage }
                const buffer = await sock.downloadMediaMessage(quotedMsg)
                await sock.sendMessage(from, { image: buffer, caption: posterCaption })
            } else {
                // Text chauh - Heading design
                let design = `╔════════════════════╗\n║ *${heading}* \n╚════════════════════╝\n\n${message}\n\n━━━━━━━━━━━━`
                await sock.sendMessage(from, { text: design })
            }
            return
        }

        if(text.toLowerCase() === ".ping") {
            await sock.sendMessage(from, { text: "✅ Bot a nung e Boss!" })
        }
    })
}

startBot()
