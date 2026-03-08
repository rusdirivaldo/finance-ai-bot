import supabase from "../supabase.js"
import { sendMessage } from "../utils/telegram.js"
import { rupiah } from "../utils/formatter.js"

export async function financeInsight(chatId) {

  const { data, error } = await supabase
    .from("transactions")
    .select("type,amount,category")
    .eq("chat_id", chatId)

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
  const scoreData = await calculateFinanceScore(chatId)
  let scoreText = ""
  if(scoreData){

  scoreText =
`💳 Financial Health Score

Score : ${scoreData.score} / 100
Saving Rate : ${(scoreData.savingRate*100).toFixed(0)}%
`}

  // =================
  // build message
  // =================

  const message = `
  ${scoreText}


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

export async function topDetail(chatId) {

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

export async function calculateFinanceScore(chatId){

  const { data } = await supabase
    .from("transactions")
    .select("type,amount")
    .eq("chat_id", chatId)

  if(!data || data.length === 0){
    return null
  }

  let income = 0
  let expense = 0

  data.forEach(t=>{
    if(t.type === "income") income += t.amount
    if(t.type === "expense") expense += t.amount
  })

  if(income === 0) return null

  const savingRate = (income - expense) / income

  let score = 50

  if(savingRate > 0.4) score += 30
  else if(savingRate > 0.2) score += 20
  else if(savingRate > 0.1) score += 10

  if(expense < income * 0.7) score += 10

  if(score > 100) score = 100

  return {
    score,
    savingRate
  }

}