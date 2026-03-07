import TelegramBot from "node-telegram-bot-api"
import db from "./database.js"

const token = "8621658546:AAGCkLly6HzUZyCFltL8GucjBU89RmzfB1g"

const bot = new TelegramBot(token, { polling: true })
bot.setMyCommands([
    { command: "report", description: "Full finance report" },
    { command: "today", description: "Today's spending" },
    { command: "month", description: "Monthly summary" },
    { command: "top", description: "Top spending categories" },
    { command: "help", description: "Show help menu" }
])

bot.onText(/\/help/, (msg) => {

    const help = `
Finance Bot Commands

/report - full report
/today - today's spending
/month - monthly summary
/top - top spending

Input transaction example:
makan ramen 85k
ngopi 30k
gajian 17jt
`

    bot.sendMessage(msg.chat.id, help)

})


console.log("Telegram bot running")

bot.on("message", (msg) => {

    const text = msg.text
    if (!text) return

    const lower = text.toLowerCase()

    // =================
    // COMMAND REPORT
    // =================

    if (lower === "/report") {
        generateReport(msg.chat.id)
        return
    }

    // =================
    // COMMAND TODAY
    // =================

    if (lower === "/today") {
        todayReport(msg.chat.id)
        return
    }

    // =================
    // COMMAND MONTH
    // =================

    if (lower === "/month") {
        monthReport(msg.chat.id)
        return
    }


    if (lower === "/top") {
        topReport(msg.chat.id)
        return
    }

    // =================
    // PARSE TRANSACTION
    // =================

    const amount = parseAmount(text)

    if (!amount) return

    const type = detectType(text)
    const category = detectCategory(text)

    db.run(`
INSERT INTO transactions(date,type,category,description,amount)
VALUES(?,?,?,?,?)
`, [
        new Date().toISOString(),
        type,
        category,
        text,
        amount
    ])

    bot.sendMessage(msg.chat.id,
        `✅ Saved

${type}
${category}
${rupiah(amount)}
`)

})


// =================
// HELPERS
// =================

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

    if (text.includes("bensin"))
        return "transport"

    if (text.includes("gaji") || text.includes("gajian"))
        return "salary"

    if (text.includes("freelance"))
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

function generateReport(chatId) {

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

            const report = `
Finance Report

Income
${incomeText}

Expense
${expenseText}

Balance : ${rupiah(balance)}
`

            bot.sendMessage(chatId, report)

        })

    })

}

function monthReport(chatId) {

    db.all(`
SELECT category,SUM(amount) as total
FROM transactions
WHERE type='expense'
AND strftime('%Y-%m',date)=strftime('%Y-%m','now')
GROUP BY category
`, (err, rows) => {

        let text = "Monthly Spending\n\n"

        let total = 0

        rows.forEach(r => {
            text += r.category + " : " + rupiah(r.total) + "\n"
            total += r.total
        })

        text += "\nTotal : " + rupiah(total)

        bot.sendMessage(chatId, text)

    })

}

function todayReport(chatId) {

    db.all(`
SELECT category,SUM(amount) as total
FROM transactions
WHERE type='expense'
AND date(date)=date('now')
GROUP BY category
`, (err, rows) => {

        let text = "Today Spending\n\n"

        let total = 0

        rows.forEach(r => {
            text += r.category + " : " + rupiah(r.total) + "\n"
            total += r.total
        })

        text += "\nTotal : " + rupiah(total)

        bot.sendMessage(chatId, text)

    })
}
function topReport(chatId) {

    db.all(`
SELECT category,SUM(amount) as total
FROM transactions
WHERE type='expense'
GROUP BY category
ORDER BY total DESC
LIMIT 5
`, (err, rows) => {

        if (!rows || rows.length === 0) {
            bot.sendMessage(chatId, "Belum ada data transaksi.")
            return
        }

        let text = "🔥 Top Spending\n\n"

        rows.forEach((r, i) => {
            text += (i + 1) + ". " + r.category + " - " + rupiah(r.total) + "\n"
        })

        bot.sendMessage(chatId, text)

    })

}

