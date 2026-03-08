import supabase from "../supabase.js"
import { sendMessage } from "../utils/telegram.js"
import { rupiah } from "../utils/formatter.js"


export async function setBudget(chatId, category, amount) {

    const now = new Date()

    const month = now.getMonth() + 1
    const year = now.getFullYear()

    const { error } = await supabase
        .from("budgets")
        .upsert({
            chat_id: chatId,
            category,
            monthly_limit: amount,
            month,
            year
        }, {
            onConflict: "chat_id,category,month,year"
        })

    if (error) {
        console.error(error)
        await sendMessage(chatId, "⚠ Gagal menyimpan budget")
        return
    }

    await sendMessage(chatId,
        `✅ Budget Updated

Category : ${category}
Limit : ${rupiah(amount)}`)

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

    const { data: budgets, error } = await supabase
        .from("budgets")
        .select("*")
        .eq("chat_id", chatId)
        .eq("month", month)
        .eq("year", year)

    if (error) {
        console.error(error)
        await sendMessage(chatId, "Database error")
        return
    }

    if (!budgets || budgets.length === 0) {
        await sendMessage(chatId, "Belum ada budget yang dibuat.")
        return
    }


    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0)
    let message = "📊 Budget Status\n\n"

    for (const b of budgets) {

        const { data: tx } = await supabase
            .from("transactions")
            .select("amount")
            .eq("chat_id", chatId)
            .eq("category", b.category)
            .eq("type", "expense")
            .gte("date", start.toISOString())
            .lte("date", end.toISOString())

        const total = tx
            ? tx.reduce((a, c) => a + c.amount, 0)
            : 0

        const pctRaw = Math.round((total / b.monthly_limit) * 100)
        const pct = Math.min(pctRaw, 100)

        const bar = progressBar(pct)

        message += `${b.category}
${bar} ${pctRaw}%
${rupiah(total)} / ${rupiah(b.monthly_limit)}
`

        if (pctRaw > 100) {
            message += "🚨 Over Budget\n"
        }
        else if (pctRaw > 80) {
            message += "⚠ Near limit\n"
        }

        message += "\n"
    }

    await sendMessage(chatId, message)
}

function progressBar(pct) {

    const total = 10
    const filled = Math.round((pct / 100) * total)

    return "█".repeat(filled) + "░".repeat(total - filled)

}