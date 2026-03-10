import supabase from "../supabase.js"
import { sendMessage } from "../utils/telegram.js"
import { rupiah } from "../utils/formatter.js"

export async function generateReport(chatId) {

    const { data, error } = await supabase
        .from("transactions")
        .select("type,category,amount")

    if (error) {
        console.log(error)
        await sendMessage(chatId, "Database error")
        return
    }

    if (!data || data.length === 0) {
        await sendMessage(chatId, "No transactions yet")
        return
    }

    let incomeMap = {}
    let expenseMap = {}

    let totalIncome = 0
    let totalExpense = 0

    data.forEach(t => {

        if (t.type === "income") {

            if (!incomeMap[t.category]) incomeMap[t.category] = 0
            incomeMap[t.category] += t.amount
            totalIncome += t.amount

        }

        if (t.type === "expense") {

            if (!expenseMap[t.category]) expenseMap[t.category] = 0
            expenseMap[t.category] += t.amount
            totalExpense += t.amount

        }

    })

    let incomeText = ""
    let expenseText = ""

    Object.entries(incomeMap).forEach(([k, v]) => {
        incomeText += `${k} : ${rupiah(v)}\n`
    })

    Object.entries(expenseMap).forEach(([k, v]) => {
        expenseText += `${k} : ${rupiah(v)}\n`
    })

    const balance = totalIncome - totalExpense
    let savingRate = 0

    if (totalIncome > 0) {
        savingRate = ((balance / totalIncome) * 100).toFixed(0)
    }
    const topSpending = Object.entries(expenseMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)

    let topText = ""

    topSpending.forEach((t, i) => {
        topText += `${i + 1}. ${t[0]} - ${t[1].toLocaleString()}\n`
    })

    const report =
        `📊 Finance Report

💰 Income
${incomeText}

📉 Expense
${expenseText}

━━━━━━━━━━━━━━

Total Income  : ${totalIncome.toLocaleString()}
Total Expense : ${totalExpense.toLocaleString()}
Balance       : ${balance.toLocaleString()}
Saving Rate   : ${savingRate}%

🔥 Top Spending
${topText}`

    await sendMessage(chatId, report)

}

export async function todayReport(chatId) {

    const today = new Date().toISOString().slice(0, 10)

    const { data } = await supabase
        .from("transactions")
        .select("*")

    const filtered = data.filter(t => t.date.startsWith(today))

    let total = 0

    filtered.forEach(t => {
        if (t.type === "expense") total += t.amount
    })

    await sendMessage(chatId,
        `📅 Today Spending

Total : ${rupiah(total)}`
    )
}

export async function monthReport(chatId) {

    const month = new Date().toISOString().slice(0, 7)

    const { data } = await supabase
        .from("transactions")
        .select("*")

    let total = 0

    data.forEach(t => {
        if (t.type === "expense" && t.date.startsWith(month))
            total += t.amount
    })

    await sendMessage(chatId,
        `📆 Monthly Spending

Total : ${rupiah(total)}`
    )
}

export async function monthlyReport(chatId, month) {

    const { data } = await supabase
        .from("transactions")
        .select("*")

    const filtered = data.filter(t => t.date.startsWith(month))

    let total = 0

    filtered.forEach(t => {
        if (t.type === "expense") total += t.amount
    })

    await sendMessage(chatId,
        `📊 Finance Report (${month})

Total Expense : ${rupiah(total)}`
    )
}

export async function categoryReport(chatId) {

    try {

        const now = new Date()

        const month = now.toISOString().slice(0, 7)

        const { data, error } = await supabase
            .from("transactions")
            .select("category,amount,date,type")
            .eq("chat_id", chatId)
            .eq("type", "expense")

        if (error) throw error

        if (!data || data.length === 0) {

            await sendMessage(chatId, "Belum ada transaksi")
            return

        }

        const filtered = data.filter(t => t.date.startsWith(month))

        if (filtered.length === 0) {

            await sendMessage(chatId, "Belum ada transaksi bulan ini")
            return

        }

        const categoryMap = {}

        let totalExpense = 0

        for (const t of filtered) {

            if (!categoryMap[t.category]) {
                categoryMap[t.category] = 0
            }

            categoryMap[t.category] += t.amount
            totalExpense += t.amount

        }

        const sorted = Object.entries(categoryMap)
            .sort((a, b) => b[1] - a[1])

        let message = `📊 Category Report (${month})\n\n`

        for (const [category, amount] of sorted) {

            const pct = Math.round((amount / totalExpense) * 100)

            message += `${category}
${rupiah(amount)} (${pct}%)

`
        }

        message += `━━━━━━━━━━
Total Expense
${rupiah(totalExpense)}`

        await sendMessage(chatId, message)

    } catch (err) {

        console.error("CATEGORY REPORT ERROR:", err)

        await sendMessage(chatId, "⚠ Gagal membuat category report")

    }

}