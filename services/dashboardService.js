import supabase from "../supabase.js"
import { sendMessage } from "../utils/telegram.js"
import { rupiah } from "../utils/formatter.js"

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
async function dashboardSummary(chatId, data) {

    let income = 0
    let expense = 0

    data.forEach(t => {
        if (t.type === "income") income += t.amount
        if (t.type === "expense") expense += t.amount
    })

    const balance = income - expense

    let savingRate = 0
    if (income > 0) {
        savingRate = ((balance / income) * 100).toFixed(0)
    }

    // average daily spending
    const daily = {}

    data.forEach(t => {

        if (t.type === "expense") {

            const day = t.date.slice(0, 10)

            if (!daily[day]) daily[day] = 0

            daily[day] += t.amount

        }

    })

    const days = Object.keys(daily)

    const avgDaily = days.length
        ? Math.round(Object.values(daily).reduce((a, b) => a + b, 0) / days.length)
        : 0

    await sendMessage(chatId,
        `📊 Finance Dashboard

Income : ${rupiah(income)}
Expense : ${rupiah(expense)}
Balance : ${rupiah(balance)}

Saving Rate : ${savingRate}%
Avg Daily Spending : ${rupiah(avgDaily)}

━━━━━━━━━━━━━━`)
}

function topCategory(data) {

    const map = {}

    data.forEach(t => {

        if (t.type === "expense") {

            if (!map[t.category]) map[t.category] = 0

            map[t.category] += t.amount

        }

    })

    return Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)

}

async function sendTopCategory(chatId, data) {

    const top = topCategory(data)

    if (top.length === 0) return

    let text = "🔥 Top Spending Category\n\n"

    top.forEach((c, i) => {
        text += `${i + 1}. ${c[0]} - ${rupiah(c[1])}\n`
    })

    await sendMessage(chatId, text)

}

async function spendingInsight(chatId, data) {

    const daily = {}

    data.forEach(t => {

        if (t.type === "expense") {

            const day = t.date.slice(0, 10)

            if (!daily[day]) daily[day] = 0

            daily[day] += t.amount
        }

    })

    const values = Object.values(daily)

    if (values.length < 7) {
        await sendMessage(chatId, "💡 Insight: Data belum cukup untuk analisis.")
        return
    }

    const lastWeek = values.slice(-7)
    const prevWeek = values.slice(-14, -7)

    const avgLast = lastWeek.reduce((a, b) => a + b, 0) / 7
    const avgPrev = prevWeek.length
        ? prevWeek.reduce((a, b) => a + b, 0) / prevWeek.length
        : avgLast

    const diff = ((avgLast - avgPrev) / avgPrev) * 100

    let insight = "Spending stabil."

    if (diff > 20) insight = "⚠ Spending meningkat minggu ini."
    if (diff < -20) insight = "✅ Spending menurun minggu ini."

    await sendMessage(chatId, `💡 Insight\n\n${insight}`)
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

export async function dashboardAnalytics(chatId) {
    try {
        await sendMessage(chatId, "📊 Generating dashboard...")

        const { data, error } = await supabase
            .from("transactions")
            .select("*")
            .eq("chat_id", chatId)

        if (error) throw error

        if (!data || data.length === 0) {
            await sendMessage(chatId, "No data yet")
            return
        }

        await dashboardSummary(chatId, data)
        await sendTopCategory(chatId, data)

        await incomeExpenseChart(chatId, data)
        await categoryChart(chatId, data)
        await savingRateChart(chatId, data)
        await dailySpendingChart(chatId, data)
        const spent = data
            .filter(t => t.type === "expense")
            .reduce((sum, t) => sum + t.amount, 0)

        const { data: budgets } = await supabase
            .from("budgets")
            .select("monthly_limit")
            .eq("chat_id", chatId)

        const budget = budgets
            ? budgets.reduce((sum, b) => sum + b.monthly_limit, 0)
            : 0

        await budgetGauge(chatId, spent, budget)
        await spendingDistribution(chatId, data)
        await spendingInsight(chatId, data)
        await sendMessage(chatId, "📊 Full Finance Dashboard")
    } catch (err) {
        console.error("DASHBOARD ERROR:", err)

        await sendMessage(chatId,
            "⚠ Gagal membuat dashboard")
    }
}

async function budgetGauge(chatId, spent, budget) {

    if (!budget || budget === 0) {
        await sendMessage(chatId, "⚠ Budget belum di-set untuk bulan ini.")
        return
    }

    const remaining = Math.max(budget - spent, 0)

    const percent = Math.round((spent / budget) * 100)

    await sendMessage(chatId,
        `📊 Budget Usage

Total Budget : ${rupiah(budget)}
Spent        : ${rupiah(spent)}
Remaining    : ${rupiah(remaining)}

Usage        : ${percent}%`
    )

    const config = {
        type: "doughnut",
        data: {
            labels: ["Spent", "Remaining"],
            datasets: [{
                data: [spent, remaining],
                backgroundColor: ["#ff6384", "#36a2eb"]
            }]
        },
        options: {
            plugins: {
                legend: {
                    position: "bottom"
                }
            }
        }
    }

    await sendChart(chatId, config)

}

async function spendingDistribution(chatId,data){

  const { data: categories } = await supabase
    .from("categories")
    .select("name,level")

  let essential = 0
  let lifestyle = 0
  let luxury = 0

  data.forEach(t => {

    if(t.type !== "expense") return

    const cat = categories.find(c => c.name === t.category)

    if(!cat) return

    if(cat.level === "primer") essential += t.amount

    if(cat.level === "sekunder") lifestyle += t.amount

    if(cat.level === "tersier") luxury += t.amount

  })

  const config = {
    type:"pie",
    data:{
      labels:["Essential","Lifestyle","Luxury"],
      datasets:[{
        data:[essential,lifestyle,luxury]
      }]
    }
  }

  await sendChart(chatId,config)

}