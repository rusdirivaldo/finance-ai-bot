import supabase from "../supabase.js"
import stringSimilarity from "string-similarity"
import { removeStopwords } from "../utils/stopwords.js"


export default async function handler(req, res) {

    const update = req.body

    if (!update.message) {
        res.status(200).send("ok")
        return
    }

    const text = update.message.text
    const chatId = update.message.chat.id

    if (!text) {
        res.status(200).send("ok")
        return
    }

    const lower = text.toLowerCase()

    // =================
    // COMMAND TOPDETAIL
    // =================
    if (lower === "/topdetail") {
        await topDetail(chatId)
        res.status(200).send("ok")
        return
    }
    // =================
    // COMMAND INSIGHT
    // =================

    if (lower === "/insight") {
        await financeInsight(chatId)
        res.status(200).send("ok")
        return
    }
    // =================
    // COMMAND DASHBOARD
    // =================
    if (lower === "/dashboard") {
        await dashboardAnalytics(chatId)
        res.status(200).send("ok")
        return
    }

    // =================
    // COMMAND SET CATEGORI BARU
    // =================
    if (lower.startsWith("/setcategory")) {

        const parts = lower.split(" ")
        const newCategory = parts[1]
        if (!newCategory) {
            await sendMessage(chatId, "Gunakan: /setcategory food")
            res.status(200).send("ok")
            return
        }
        await learnCategory(chatId, newCategory)

        res.status(200).send("ok")
        return

    }

    // =================
    // COMMAND SEARCH
    // =================
    if (lower.startsWith("/search")) {

        const parts = lower.split(" ")

        const keyword = parts.slice(1).join(" ")

        if (!keyword) {
            await sendMessage(chatId, "Gunakan: /search ramen")
            res.status(200).send("ok")
            return
        }

        await searchExpenseDetailbyDescription(chatId, keyword)

        res.status(200).send("ok")
        return
    }

    // =================
    // COMMAND EXPENSE
    // =================

    if (lower.startsWith("/expense")) {
        const parts = lower.split(" ")
        if (parts.length === 1) {
            await expenseDetail(chatId)
        }
        else {
            const arg1 = parts[1]
            const arg2 = parts[2]
            // bulan ini
            if (arg1 === "bulan" && arg2 === "ini") {
                await expenseDetailMonth(chatId)
            }
            // alias month
            else if (arg1 === "month" || arg1 === "bulanan") {
                await expenseDetailMonth(chatId)
            }
            // bulan spesifik
            else {
                const monthName = arg1
                const year = arg2 || new Date().getFullYear()
                await expenseDetailByMonthName(chatId, monthName, year)
            }
        }
        res.status(200).send("ok")
        return
    }

    // =================
    // COMMAND REPORT
    // =================

    if (lower.startsWith("/report")) {

        const parts = lower.split(" ")

        if (parts.length === 1) {
            await generateReport(chatId)
        }

        else if (parts[1] === "today") {
            await todayReport(chatId)
        }

        else {
            await monthlyReport(chatId, parts[1])
        }

        res.status(200).send("ok")
        return
    }

    // =================
    // COMMAND TODAY
    // =================

    if (lower === "/today") {
        await todayReport(chatId)
        res.status(200).send("ok")
        return
    }

    // =================
    // COMMAND MONTH
    // =================

    if (lower === "/month") {
        await monthReport(chatId)
        res.status(200).send("ok")
        return
    }


    // =================
    // PARSE TRANSACTION
    // =================

    const amount = parseAmount(text)

    if (amount) {
        const type = detectType(text)
        const category = await detectCategory(text)
        const needsCategory = category === "other"
        const { data, error } = await supabase
            .from("transactions")
            .insert([
                {
                    date: new Date().toISOString(),
                    chat_id: chatId,
                    type,
                    category,
                    description: text,
                    amount,
                    needs_category: needsCategory
                }
            ]).select()

        if (error) {
            console.log("SUPABASE INSERT ERROR:", error)
            await sendMessage(chatId, "Database insert error")
            return
        }

        // =================
        // AUTO CATEGORY LEARNING
        // =================

        if (category === "other") {

            await sendMessage(chatId,
                `❓ Kategori belum dikenali

"${text}"

Balas dengan:
/setcategory food
/setcategory transport
/setcategory shopping
`)
        }

        console.log("Inserted:", data)

        await sendMessage(chatId,
            `✅ Saved

${type}
${category}
${rupiah(amount)}
`)
    }

    res.status(200).send("ok")

}

async function sendMessage(chatId, text) {

    await fetch(
        `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: text
            })
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

let categoriesCache = null
async function getCategories() {

    if (categoriesCache) return categoriesCache

    const { data, error } = await supabase
        .from("categories")
        .select("*")

    if (error) {
        console.log("Category query error:", error)
        return []
    }

    categoriesCache = data

    return data
}

export async function detectCategory(text) {

    const categories = await getCategories()
    if (!categories || categories.length === 0) {
        return "other"
    }

    const normalized = normalize(text)

    let words = tokenize(normalized)

    words = removeStopwords(words)

    let bestScore = 0
    let bestCategory = "other"

    for (const cat of categories) {

        const keywords = (cat.keywords || "").split(",")

        for (const keyword of keywords) {

            const k = keyword.trim().toLowerCase()

            // exact match
            if (words.includes(k)) {
                return cat.name
            }

            // partial match
            for (const word of words) {
                if (word.includes(k) || k.includes(word)) {
                    return cat.name
                }
            }

            // fuzzy similarity
            const score = stringSimilarity.compareTwoStrings(normalized, k)

            if (score > bestScore) {
                bestScore = score
                bestCategory = cat.name
            }

        }
    }

    if (bestScore > 0.6) {
        return bestCategory
    }

    return "other"
}



function detectType(text) {

    text = text.toLowerCase()

    if (
        text.includes("gaji") ||
        text.includes("freelance") ||
        text.includes("income")
    ) {
        return "income"
    }

    return "expense"

}

function normalize(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .trim()
}

function tokenize(text) {
    return text.split(/\s+/)
}

async function generateReport(chatId) {

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

async function todayReport(chatId) {

    const today = new Date().toISOString().slice(0, 10)

    const { data, error } = await supabase
        .from("transactions")
        .select("*")

    if (error) {
        console.log(error)
        await sendMessage(chatId, "Database error")
        return
    }
    const filtered = data.filter(t => t.date.startsWith(today))

    let total = 0

    filtered.forEach(t => {
        if (t.type === "expense") total += t.amount
    })

    await sendMessage(chatId,
        `📅 Today Spending

Total : ${total.toLocaleString()}`
    )

}

async function monthReport(chatId) {

    const month = new Date().toISOString().slice(0, 7)

    const { data, error } = await supabase
        .from("transactions")
        .select("*")

    if (error) {
        console.log(error)
        await sendMessage(chatId, "Database error")
        return
    }

    if (!data || data.length === 0) {
        await sendMessage(chatId, "No transactions this month")
        return
    }

    let total = 0

    data.forEach(t => {
        if (t.type === "expense" && t.date.startsWith(month)) {
            total += t.amount
        }
    })

    await sendMessage(chatId,
        `📆 Monthly Spending

Total : ${rupiah(total)}`
    )
}

async function monthlyReport(chatId, month) {

    const { data, error } = await supabase
        .from("transactions")
        .select("type,category,amount,date")

    if (error) {
        console.log(error)
        await sendMessage(chatId, "Database error")
        return
    }

    const filtered = data.filter(t => t.date.startsWith(month))

    if (filtered.length === 0) {
        await sendMessage(chatId, "No data for this month")
        return
    }

    let incomeMap = {}
    let expenseMap = {}
    let totalIncome = 0
    let totalExpense = 0

    filtered.forEach(t => {

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
        incomeText += `${k} : ${v.toLocaleString()}\n`
    })

    Object.entries(expenseMap).forEach(([k, v]) => {
        expenseText += `${k} : ${v.toLocaleString()}\n`
    })

    const balance = totalIncome - totalExpense
    let savingRate = 0

    if (totalIncome > 0) {
        savingRate = ((balance / totalIncome) * 100).toFixed(0)
    }

    const top = Object.entries(expenseMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)

    let topText = ""

    top.forEach((t, i) => {
        topText += `${i + 1}. ${t[0]} - ${t[1].toLocaleString()}\n`
    })

    await sendMessage(chatId,
        `📊 Finance Report (${month})

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
    )

}


async function sendChart(chatId, config) {

    const chartUrl =
        "https://quickchart.io/chart?c=" +
        encodeURIComponent(JSON.stringify(config))

    await fetch(
        `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendPhoto`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                photo: chartUrl
            })
        }
    )

}

async function incomeExpenseChart(chatId, data) {

    const monthly = {}

    data.forEach(t => {

        const month = t.date.slice(0, 7)

        if (!monthly[month]) {
            monthly[month] = { income: 0, expense: 0 }
        }

        if (t.type === "income") monthly[month].income += t.amount
        if (t.type === "expense") monthly[month].expense += t.amount

    })

    const months = Object.keys(monthly)
    const income = months.map(m => monthly[m].income)
    const expense = months.map(m => monthly[m].expense)

    const config = {
        type: "line",
        data: {
            labels: months,
            datasets: [
                { label: "Income", data: income },
                { label: "Expense", data: expense }
            ]
        }
    }

    await sendChart(chatId, config)

}

async function categoryChart(chatId, data) {

    const map = {}

    data.forEach(t => {
        if (t.type === "expense") {
            if (!map[t.category]) map[t.category] = 0
            map[t.category] += t.amount
        }
    })

    const labels = Object.keys(map)
    const values = Object.values(map)

    const config = {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label: "Expense by Category",
                    data: values
                }
            ]
        }
    }

    await sendChart(chatId, config)

}

async function dashboardAnalytics(chatId) {

    await sendMessage(chatId, "📊 Generating dashboard...")
    const { data, error } = await supabase
        .from("transactions")
        .select("*")

    if (error) {
        console.log(error)
        await sendMessage(chatId, "Database error")
        return
    }

    if (!data || data.length === 0) {
        await sendMessage(chatId, "No data yet")
        return
    }

    await incomeExpenseChart(chatId, data)
    await categoryChart(chatId, data)
    await savingRateChart(chatId, data)
    await dailySpendingChart(chatId, data)

    await sendMessage(chatId, "📊 Full Finance Dashboard")

}

async function savingRateChart(chatId, data) {

    const monthly = {}

    data.forEach(t => {

        const month = t.date.slice(0, 7)

        if (!monthly[month]) {
            monthly[month] = { income: 0, expense: 0 }
        }

        if (t.type === "income") monthly[month].income += t.amount
        if (t.type === "expense") monthly[month].expense += t.amount

    })

    const months = Object.keys(monthly)

    const savingRates = months.map(m => {

        const income = monthly[m].income
        const expense = monthly[m].expense

        if (income === 0) return 0

        return ((income - expense) / income) * 100

    })

    const config = {
        type: "line",
        data: {
            labels: months,
            datasets: [
                {
                    label: "Saving Rate %",
                    data: savingRates
                }
            ]
        }
    }

    await sendChart(chatId, config)

}

async function dailySpendingChart(chatId, data) {

    const daily = {}

    data.forEach(t => {

        if (t.type === "expense") {

            const day = t.date.slice(0, 10)

            if (!daily[day]) daily[day] = 0

            daily[day] += t.amount

        }

    })

    const days = Object.keys(daily).slice(-14)
    const values = days.map(d => daily[d])

    const config = {
        type: "bar",
        data: {
            labels: days,
            datasets: [
                {
                    label: "Daily Spending",
                    data: values
                }
            ]
        }
    }

    await sendChart(chatId, config)

}

async function financeInsight(chatId) {

    const { data, error } = await supabase
        .from("transactions")
        .select("type,amount,category")

    if (error) {
        console.log(error)
        await sendMessage(chatId, "Database error")
        return
    }

    if (!data || data.length === 0) {
        await sendMessage(chatId, "No data yet")
        return
    }

    // =================
    // income vs expense
    // =================

    let income = 0
    let expense = 0

    data.forEach(t => {
        if (t.type === "income") income += t.amount
        if (t.type === "expense") expense += t.amount
    })

    const balance = income - expense

    let savingRate = 0

    if (income > 0) {
        savingRate = ((balance / income) * 100).toFixed(1)
    }

    // =================
    // category spending
    // =================

    const categoryMap = {}

    data.forEach(t => {

        if (t.type === "expense") {

            if (!categoryMap[t.category]) categoryMap[t.category] = 0

            categoryMap[t.category] += t.amount

        }

    })

    const sorted = Object.entries(categoryMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)

    // =================
    // level spending
    // =================

    const { data: categories } = await supabase
        .from("categories")
        .select("*")

    let primer = 0
    let sekunder = 0
    let tersier = 0
    let other = 0
    if (!categories) return
    data.forEach(t => {

        const cat = categories.find(c => c.name === t.category)

        if (!cat) return
        if (cat.level === "primer") primer += t.amount
        if (cat.level === "sekunder") sekunder += t.amount
        if (cat.level === "tersier") tersier += t.amount
        if (cat.level === "other") other += t.amount


    })

    const totalExpense = primer + sekunder + tersier + other

    const primerPct = totalExpense ? ((primer / totalExpense) * 100).toFixed(0) : 0
    const sekunderPct = totalExpense ? ((sekunder / totalExpense) * 100).toFixed(0) : 0
    const tersierPct = totalExpense ? ((tersier / totalExpense) * 100).toFixed(0) : 0
    const otherPct = totalExpense ? ((other / totalExpense) * 100).toFixed(0) : 0

    // =================
    // recommendation
    // =================

    let recommendation = ""

    if (otherPct > 20) {

        recommendation = "⚠ Banyak transaksi belum memiliki kategori yang jelas."

    }
    else if (savingRate < 15) {

        recommendation = "🚨 Saving rate sangat rendah."

    }
    else if (savingRate < 30) {

        recommendation = "⚠ Saving rate rendah."

    }
    else if (sekunderPct > 35) {

        recommendation = "⚠ Lifestyle spending cukup tinggi."

    }
    else if (tersierPct > 20) {

        recommendation = "⚠ Luxury spending meningkat."

    }
    else {

        recommendation = "✅ Kondisi finansial cukup sehat."

    }

    // =================
    // build message
    // =================

    let topText = ""

    sorted.forEach((c, i) => {
        topText += `${i + 1}. ${c[0]}\n`
    })

    const message = `
💡 Finance Insight

Saving Rate : ${savingRate}%

Primer Spending   : ${primerPct}%
Lifestyle Spending: ${sekunderPct}%
Luxury Spending   : ${tersierPct}%
Uncategorized     : ${otherPct}%

${recommendation}
`

    await sendMessage(chatId, message)

}

async function topDetail(chatId) {

    const month = new Date().toISOString().slice(0, 7)

    const { data, error } = await supabase
        .from("transactions")
        .select("description,amount,type,date")
        .eq("chat_id", chatId)

    if (error) {
        console.log(error)
        await sendMessage(chatId, "Database error")
        return
    }

    const filtered = data.filter(t =>
        t.type === "expense" && t.date.startsWith(month)
    )

    if (filtered.length === 0) {
        await sendMessage(chatId, "No expense this month")
        return
    }

    const sorted = filtered
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)

    let text = "🔥 Top Expense This Month\n\n"

    sorted.forEach((t, i) => {

        const date = new Date(t.date).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric"
        })

        text += `${i + 1}. ${t.description}
${rupiah(t.amount)}
📅 ${date}

`

    })

    await sendMessage(chatId, text)

}

async function learnCategory(chatId, newCategory) {

    const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("needs_category", true)
        .eq("chat_id", chatId)
        .order("date", { ascending: false })
        .limit(1)

    if (!data || data.length === 0) {

        await sendMessage(chatId, "Tidak ada transaksi yang perlu dikategorikan")
        return

    }

    const tx = data[0]

    const words = tx.description.toLowerCase().split(" ")

    const stopwords = ["beli", "bayar", "pesan", "order", "beliin", "sewa", "kirim", "transfer", "kasih"]

    const keyword = words.find(w => !stopwords.includes(w))

    // update keyword kategori

    const { data: cat } = await supabase
        .from("categories")
        .select("*")
        .eq("name", newCategory)
        .single()

    if (!cat) {
        await sendMessage(chatId,
            `❌ Kategori "${newCategory}" tidak ditemukan

Kategori tersedia:
food
transport
online_shopping
coffee
travel
impulsive_hobby
`)

        return
    }

    const keywords = cat.keywords.split(",")

    if (!keywords.includes(keyword)) {
        keywords.push(keyword)
    }

    const newKeywords = keywords.join(",")

    await supabase
        .from("categories")
        .update({ keywords: newKeywords })
        .eq("name", newCategory)

    // update transaksi

    await supabase
        .from("transactions")
        .update({
            category: newCategory,
            needs_category: false
        })
        .eq("id", tx.id)

    await sendMessage(chatId,
        `✅ Learning berhasil

"${keyword}" sekarang termasuk kategori "${newCategory}"`)

}

async function expenseDetail(chatId) {

    const { data, error } = await supabase
        .from("transactions")
        .select("description,amount,date")
        .eq("chat_id", chatId)
        .eq("type", "expense")
        .order("date", { ascending: false })
        .limit(20)

    if (error) {
        await sendMessage(chatId, "Database error")
        return
    }

    if (!data || data.length === 0) {
        await sendMessage(chatId, "Belum ada transaksi")
        return
    }

    let text = "📋 Recent Expenses\n\n"

    data.forEach(t => {

        const date = new Date(t.date).toLocaleDateString("id-ID")

        text += `${t.description}
${rupiah(t.amount)}
📅 ${date}

`

    })

    await sendMessage(chatId, text)

}

async function expenseDetailByMonthName(chatId, monthName, year) {
    const months = {
        januari: "01",
        februari: "02",
        maret: "03",
        april: "04",
        mei: "05",
        juni: "06",
        juli: "07",
        agustus: "08",
        september: "09",
        oktober: "10",
        november: "11",
        desember: "12"
    }
    const month = months[monthName]
    if (!month) {
        await sendMessage(chatId, "Nama bulan tidak dikenali")
        return
    }
    const start = `${year}-${month}-01`
    const end = `${year}-${month}-31`
    const { data, error } = await supabase
        .from("transactions")
        .select("description,amount,date")
        .eq("chat_id", chatId)
        .eq("type", "expense")
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: false })
    if (error) {
        await sendMessage(chatId, "Database error")
        return
    }
    if (!data || data.length === 0) {
        await sendMessage(chatId, "Tidak ada transaksi bulan tersebut")
        return
    }
    let text = `📋 Expense ${monthName} ${year}\n\n`
    data.forEach(t => {
        const date = new Date(t.date).toLocaleDateString("id-ID")

        text += `${t.description}
${rupiah(t.amount)}
📅 ${date}

`

    })

    await sendMessage(chatId, text)

}

async function searchExpenseDetailbyDescription(chatId, keyword) {

    const { data, error } = await supabase
        .from("transactions")
        .select("description,amount,date")
        .eq("chat_id", chatId)
        .eq("type", "expense")
        .ilike("description", `%${keyword}%`)
        .order("date", { ascending: false })
        .limit(20)

    if (error) {
        await sendMessage(chatId, "Database error")
        return
    }

    if (!data || data.length === 0) {
        await sendMessage(chatId, `Tidak ditemukan transaksi dengan keyword "${keyword}"`)
        return
    }

    let text = `🔎 Search Expense: ${keyword}\n\n`

    data.forEach(t => {

        const date = new Date(t.date).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric"
        })

        text += `${t.description}
${rupiah(t.amount)}
📅 ${date}

`

    })

    await sendMessage(chatId, text)

}

async function expenseDetailMonth(chatId) {

    const now = new Date()

    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")

    const prefix = `${year}-${month}`

    const { data, error } = await supabase
        .from("transactions")
        .select("description,amount,date")
        .eq("chat_id", chatId)
        .eq("type", "expense")
        .ilike("date", `${prefix}%`)
        .order("date", { ascending: false })

    if (error) {
        await sendMessage(chatId, "Database error")
        return
    }

    if (!data || data.length === 0) {
        await sendMessage(chatId, "Belum ada transaksi bulan ini")
        return
    }

    let text = `📋 Expense ${month}-${year}\n\n`

    let total = 0

    data.forEach(t => {

        const date = new Date(t.date).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric"
        })

        total += t.amount

        text += `${t.description}
${rupiah(t.amount)}
📅 ${date}

`

    })

    text += `━━━━━━━━━━
Total : ${rupiah(total)}`

    await sendMessage(chatId, text)

}