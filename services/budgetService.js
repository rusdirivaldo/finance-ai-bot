import supabase from "../supabase.js"
import { sendMessage } from "../utils/telegram.js"
import { rupiah } from "../utils/formatter.js"


export async function setBudget(chatId, category, amount) {

    const now = new Date()

    const month = now.getMonth() + 1
    const year = now.getFullYear()

    await supabase
        .from("budgets")
        .upsert({
            chat_id: chatId,
            category,
            monthly_limit: amount,
            month,
            year
        })
    await sendMessage(chatId,
        `✅ Budget Set

${category}
Limit : ${rupiah(amount)}`
    )
}


export async function checkBudget(chatId, category) {

    const now = new Date()

    const month = now.getMonth() + 1
    const year = now.getFullYear()

    const { data: budget } = await supabase
        .from("budgets")
        .select("*")
        .eq("chat_id", chatId)
        .eq("category", category)
        .eq("month", month)
        .eq("year", year)
        .single()

    if (!budget) return

    const { data: tx } = await supabase
        .from("transactions")
        .select("amount")
        .eq("chat_id", chatId)
        .eq("category", category)
        .eq("type", "expense")

    const total = tx.reduce((a, b) => a + b.amount, 0)

    const pct = total / budget.monthly_limit

    if (pct > 1) {

        await sendMessage(chatId,
            `🚨 Budget Exceeded

${category}
${rupiah(total)} / ${rupiah(budget.monthly_limit)}`
        )

    }

    else if (pct > 0.8) {

        await sendMessage(chatId,
            `⚠ Budget Warning

${category}
${Math.round(pct * 100)}% used`
        )

    }

}

export async function budgetStatus(chatId) {

  const now = new Date()

  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const { data: budgets } = await supabase
    .from("budgets")
    .select("*")
    .eq("chat_id", chatId)
    .eq("month", month)
    .eq("year", year)

  if (!budgets || budgets.length === 0) {
    await sendMessage(chatId, "Belum ada budget yang dibuat.")
    return
  }

  let message = "📊 Budget Status\n\n"

  for (const b of budgets) {

    const { data: tx } = await supabase
      .from("transactions")
      .select("amount")
      .eq("chat_id", chatId)
      .eq("category", b.category)
      .eq("type", "expense")

    const total = tx
      ? tx.reduce((a, c) => a + c.amount, 0)
      : 0

    const pct = Math.round((total / b.monthly_limit) * 100)

    message += `${b.category}
${rupiah(total)} / ${rupiah(b.monthly_limit)}
${pct}%

`
  }

  await sendMessage(chatId, message)

}