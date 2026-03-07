import supabase from "../supabase.js"
import { sendMessage } from "../utils/telegram.js"
import { rupiah } from "../utils/formatter.js"

export async function expenseDetail(chatId) {

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

export async function expenseDetailMonth(chatId) {

    const now = new Date()

    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")

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

export async function expenseDetailByMonthName(chatId, monthName, year) {

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

export async function searchExpenseDetailbyDescription(chatId, keyword) {

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