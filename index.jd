const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const CONFIG = { botName: "ISSACK-BOT", splitBy: "|", topStyle: "🔥 *$1* 🔥", bottomStyle: "👉 $1" }
async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('./auth')
  const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }), printQRInTerminal: false })
  sock.ev.on('creds.update', saveCreds)
  if(!sock.authState.creds.registered){
    const phone = process.env.PHONE_NUMBER
    if(!phone){ console.log("PHONE_NUMBER env var dah rawh!"); return; }
    await new Promise(r=>setTimeout(r,3000))
    let code = await sock.requestPairingCode(phone.trim())
    console.log(`\n\n====== ${CONFIG.botName} CODE: ${code} ======\n\n`)
  }
  sock.ev.on('connection.update', (u)=>{
    if(u.connection === 'open') console.log(`✅ ${CONFIG.botName} Connected!`)
    if(u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut){ startBot() }
  })
  sock.ev.on('messages.upsert', async ({ messages }) => {
    let m = messages[0]
    if(!m.message || m.key.fromMe) return
    let cap = m.message.imageMessage?.caption || m.message.extendedTextMessage?.text || ""
    if(!cap.includes(CONFIG.splitBy)) return
    let [top, bottom] = cap.split(CONFIG.splitBy)
    let jid = m.key.remoteJid
    try{
      await sock.sendMessage(jid, { text: CONFIG.topStyle.replace('$1', top.trim()) })
      if(m.message.imageMessage){ await sock.sendMessage(jid, { image: m.message.imageMessage, caption: '' }) }
      await sock.sendMessage(jid, { text: CONFIG.bottomStyle.replace('$1', bottom.trim()) })
    }catch(e){ console.log(e) }
  })
}
startBot()
