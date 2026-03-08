import supabase from "../supabase.js"
import { sendMessage } from "../utils/telegram.js"
import { rupiah } from "../utils/formatter.js"

export async function detectAnomaly(chatId, category, amount) {

  const { data } = await supabase
    .from("transactions")
    .select("amount")
    .eq("chat_id", chatId)
    .eq("category", category)
    .eq("type", "expense")

  if (!data || data.length < 5) return

  const avg =
    data.reduce((a,b)=>a+b.amount,0) / data.length

  if (amount > avg * 3) {

    await sendMessage(chatId,
`🚨 Spending Alert

Category : ${category}
Amount : ${rupiah(amount)}

Rata-rata biasanya : ${rupiah(avg)}`
)

  }

}