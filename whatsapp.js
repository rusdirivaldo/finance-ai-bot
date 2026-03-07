import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} from "@whiskeysockets/baileys"

import qrcode from "qrcode-terminal"
import db from "./database.js"

async function startBot() {

    const { state, saveCreds } = await useMultiFileAuthState("auth")

    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        auth: state
    })

    // simpan session login
    sock.ev.on("creds.update", saveCreds)

    // =============================
    // LISTENER PESAN MASUK
    // =============================
    sock.ev.on("messages.upsert", async ({ messages }) => {

        const msg = messages[0]

        if (!msg.message) return
        if (msg.key.fromMe) return

        const text =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text

        if (!text) return

        const lower = text.toLowerCase()

        console.log("TEXT:", lower)


        // =====================
        // COMMAND REPORT
        // =====================

        if (lower === "report") {

            db.all(`
SELECT category,SUM(amount) as total
FROM transactions
WHERE type='income'
GROUP BY category
`, (err, incomeRows) => {

                db.all(`
SELECT category,SUM(amount) as total
FROM transactions
WHERE type='expense'
GROUP BY category
`, (err, expenseRows) => {

                    let incomeText = ""
                    let expenseText = ""

                    let totalIncome = 0
                    let totalExpense = 0

                    incomeRows.forEach(r => {
                        incomeText += r.category + " : " + rupiah(r.total) + "\n"
                        totalIncome += r.total
                    })

                    expenseRows.forEach(r => {
                        expenseText += r.category + " : " + rupiah(r.total) + "\n"
                        totalExpense += r.total
                    })

                    const balance = totalIncome - totalExpense

                    let savingRate = 0

                    if (totalIncome > 0) {
                        savingRate = ((balance / totalIncome) * 100).toFixed(1)
                    }

                    const sorted = expenseRows
                        .sort((a, b) => b.total - a.total)
                        .slice(0, 3)

                    let topText = ""

                    sorted.forEach((t, i) => {
                        topText += (i + 1) + ". " + t.category + " - " + rupiah(t.total) + "\n"
                    })

                    const report = `
📊 Finance Report

💰 Income
${incomeText}

📉 Expense
${expenseText}

━━━━━━━━━━━━━━

Total Income  : ${rupiah(totalIncome)}
Total Expense : ${rupiah(totalExpense)}
Balance       : ${rupiah(balance)}
Saving Rate   : ${savingRate}%

🔥 Top Spending
${topText}
`

                    sock.sendMessage(msg.key.remoteJid, { text: report })

                })

            })

            return
        }


        // =====================
        // PARSE TRANSACTION
        // =====================

        const amount = parseAmount(text)

        if (!amount) return

        const type = detectType(text)
        const category = detectCategory(text)

        const description = text

        db.run(`
INSERT INTO transactions(date,type,category,description,amount)
VALUES(?,?,?,?,?)
`, [
            new Date().toISOString(),
            type,
            category,
            description,
            amount
        ])

        await sock.sendMessage(msg.key.remoteJid, {
            text: `✅ Saved

${type}
${category}
${rupiah(amount)}`
        })

    })
    // =============================
    // CONNECTION STATUS
    // =============================
    sock.ev.on("connection.update", (update) => {

        const { connection, lastDisconnect, qr } = update

        // tampilkan QR login
        if (qr) {
            console.log("Scan QR untuk login WhatsApp:")
            qrcode.generate(qr, { small: true })
        }

        // berhasil connect
        if (connection === "open") {
            console.log("✅ WhatsApp connected")
        }

        // jika koneksi terputus
        if (connection === "close") {

            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

            console.log("❌ connection closed")

            if (shouldReconnect) {
                console.log("🔁 reconnecting...")
                startBot()
            }

        }

    })

}

function rupiah(number) {

    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(number)

}

function parseAmount(text) {

    text = text.toLowerCase()

    let number = text.match(/[0-9]+/)

    if (!number) return null

    let amount = parseInt(number[0])

    if (text.includes("jt")) amount *= 1000000
    else if (text.includes("k")) amount *= 1000

    return amount

}

function detectCategory(text) {

    text = text.toLowerCase()

    if (text.includes("makan") || text.includes("ramen") || text.includes("nasi"))
        return "food"

    if (text.includes("kopi") || text.includes("ngopi"))
        return "coffee"

    if (text.includes("bensin") || text.includes("pertalite"))
        return "transport"

    if (text.includes("gaji") || text.includes("gajian"))
        return "salary"

    if (text.includes("freelance") || text.includes("project"))
        return "freelance"

    return "other"

}

function detectType(text) {

    text = text.toLowerCase()

    if (
        text.includes("gaji") ||
        text.includes("gajian") ||
        text.includes("freelance") ||
        text.includes("income")
    ) {
        return "income"
    }

    return "expense"

}




export default startBot