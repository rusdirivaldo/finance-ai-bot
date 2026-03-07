import supabase from "../supabase.js"
import { parseAmount } from "../utils/parser.js"
import { detectCategory } from "./categoryService.js"
import { sendMessage } from "../utils/telegram.js"
import { rupiah } from "../utils/formatter.js"
import { checkBudget } from "./budgetService.js"

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

export async function handleTransaction(chatId, text) {

    const amount = parseAmount(text)

    if (!amount) return

    const type = detectType(text)
    const category = await detectCategory(text)
    console.log("Detected category:", category)
    const needsCategory = category === "other"

    const { error } = await supabase
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
        ])
    await checkBudget(chatId,category)
    if (error) {
        console.error(error)
    }

    if (error) {
        await sendMessage(chatId, "Database insert error")
        return
    }
    if (category === "other") {

        await sendMessage(chatId,
            `❓ Kategori belum dikenali

"${text}"

Balas dengan:
/setcategory food
/setcategory transport
/setcategory shopping`
        )
    }

    await sendMessage(chatId,
        `✅ Saved

${type}
${category}
${rupiah(amount)}
`)
}

