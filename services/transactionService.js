import supabase from "../supabase.js"
import { parseAmount } from "../utils/parser.js"
import { detectCategory } from "./categoryService.js"
import { sendMessage } from "../utils/telegram.js"
import { rupiah } from "../utils/formatter.js"
import { checkBudget } from "./budgetService.js"
import { detectAnomaly } from "./anomalyService.js"

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
    try {
        const amount = parseAmount(text)
        if (!amount) {
            return false
        }
        const type = detectType(text)
        const category = await detectCategory(text)
        console.log("Detected category:", category)
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
        if (error) throw error
        const tx = data[0]
        await checkBudget(chatId, category)
        await detectAnomaly(chatId, category, amount)

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
        return true

    } catch (err) {
        console.error("TRANSACTION ERROR:", err)

        await sendMessage(chatId,
            "⚠ Gagal menyimpan transaksi")

        return true
    }
}

export async function deleteTransaction(chatId, id) {

    const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id)
        .eq("chat_id", chatId)

    if (error) {
        await sendMessage(chatId, "Gagal menghapus transaksi")
        return
    }

    await sendMessage(chatId, `🗑 Transaksi #${id} berhasil dihapus`)
}

export async function editTransactionAmount(chatId, id, newAmount) {

    const { error } = await supabase
        .from("transactions")
        .update({ amount: newAmount })
        .eq("id", id)
        .eq("chat_id", chatId)

    if (error) {
        await sendMessage(chatId, "Update gagal")
        return
    }

    await sendMessage(chatId,
        `✏️ Transaksi berhasil diupdate

ID : ${id}
Amount : ${rupiah(newAmount)}`)
}

export async function editTransactionDesc(chatId, id, newDesc) {

    const { error } = await supabase
        .from("transactions")
        .update({ description: newDesc })
        .eq("id", id)
        .eq("chat_id", chatId)

    if (error) {
        await sendMessage(chatId, "Update gagal")
        return
    }

    await sendMessage(chatId,
        `✏️ Deskripsi transaksi berhasil diupdate

ID : ${id}
Desc : ${newDesc}`)
}

export async function updateTransactionCategory(chatId, id, category) {

    try {

        const { error } = await supabase
            .from("transactions")
            .update({
                category: category,
                needs_category: false
            })
            .eq("id", id)
            .eq("chat_id", chatId)

        if (error) throw error

        await sendMessage(chatId,
            `✅ Kategori transaksi berhasil diupdate

ID : ${id}
Kategori baru : ${category}`)

    }

    catch (err) {

        console.error("UPDATE CATEGORY ERROR:", err)

        await sendMessage(chatId,
            "⚠ Gagal mengupdate kategori transaksi")

    }

}