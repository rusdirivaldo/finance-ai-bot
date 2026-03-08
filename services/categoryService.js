import supabase from "../supabase.js"
import stringSimilarity from "string-similarity"
import { normalize, tokenize } from "../utils/parser.js"
import { removeStopwords } from "../utils/stopwords.js"
import { sendMessage } from "../utils/telegram.js"

let categoriesCache = null

async function getCategories() {

    if (categoriesCache) return categoriesCache

    const { data, error } = await supabase
        .from("categories")
        .select("*")

    if (error) {
        console.log(error)
        return []
    }

    categoriesCache = data

    return data
}

export async function detectCategory(text) {

    const categories = await getCategories()

    if (!categories || categories.length === 0) return "other"

    const normalized = normalize(text)

    let words = tokenize(normalized)

    words = removeStopwords(words)
    console.log("WORDS:", words)
    let bestScore = 0
    let bestCategory = "other"

    for (const cat of categories) {

        const keywords = (cat.keywords || "").split(",")

        for (const keyword of keywords) {

            const k = keyword.trim().toLowerCase()

            if (words.includes(k)) return cat.name

            for (const word of words) {
                if (word.includes(k) || k.includes(word)) return cat.name
            }

            const score = stringSimilarity.compareTwoStrings(normalized, k)

            if (score > bestScore) {
                bestScore = score
                bestCategory = cat.name
            }
        }
    }
    console.log("BEST CATEGORY:", bestCategory)

    if (bestScore > 0.6) return bestCategory

    return "other"
}

export async function learnCategory(chatId, newCategory) {

    const { data } = await supabase
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

    const words = tx.description
        .toLowerCase()
        .replace(/[0-9]/g, "")
        .split(/\s+/)

    const filtered = removeStopwords(words)

    const keyword = filtered.slice(0, 2).join(" ")

    const { data: cat } = await supabase
        .from("categories")
        .select("*")
        .eq("name", newCategory)
        .single()

    const keywords = cat.keywords.split(",")

    filtered.forEach(w => {
        if (!keywords.includes(w)) {
            keywords.push(w)
        }
    })

    if (!keywords.includes(keyword)) {
        keywords.push(keyword)
    }

    await supabase
        .from("categories")
        .update({ keywords: keywords.join(",") })
        .eq("name", newCategory)

    await supabase
        .from("transactions")
        .update({
            category: newCategory,
            needs_category: false
        })
        .eq("id", tx.id)

    await sendMessage(chatId, "Learning berhasil")
}
export async function listCategories(chatId) {

    try {

        const { data, error } = await supabase
            .from("categories")
            .select("*")
            .order("level")

        if (error) throw error

        if (!data || data.length === 0) {

            await sendMessage(chatId, "Belum ada kategori")

            return
        }

        let text = "📂 List Categories\n\n"

        data.forEach(c => {

            text += `${c.name}
keywords : ${c.keywords}
level : ${c.level}

`

        })

        await sendMessage(chatId, text)

    }

    catch (err) {

        console.error("CATEGORY LIST ERROR:", err)

        await sendMessage(chatId,
            "⚠ Gagal mengambil daftar kategori")

    }

}

export async function addKeywordToCategory(chatId, categoryName, keyword) {

    try {

        const { data: category, error } = await supabase
            .from("categories")
            .select("*")
            .eq("name", categoryName)
            .single()

        if (error || !category) {

            await sendMessage(chatId,
                "⚠ Kategori tidak ditemukan")

            return
        }

        let keywords = category.keywords.split(",")

        if (!keywords.includes(keyword)) {

            keywords.push(keyword)

            await supabase
                .from("categories")
                .update({
                    keywords: keywords.join(",")
                })
                .eq("name", categoryName)

        }

        await sendMessage(chatId,
            `✅ Keyword berhasil ditambahkan

Kategori : ${categoryName}
Keyword baru : ${keyword}`)

    }

    catch (err) {

        console.error("ADD KEYWORD ERROR:", err)

        await sendMessage(chatId,
            "⚠ Gagal menambahkan keyword")

    }

}

export async function removeKeywordFromCategory(chatId, categoryName, keyword) {

    try {

        const { data: category, error } = await supabase
            .from("categories")
            .select("*")
            .eq("name", categoryName)
            .single()

        if (error || !category) {

            await sendMessage(chatId,
                "⚠ Kategori tidak ditemukan")

            return
        }

        let keywords = category.keywords.split(",")

        const filtered = keywords.filter(k => k.trim() !== keyword)

        if (filtered.length === keywords.length) {

            await sendMessage(chatId,
                `Keyword "${keyword}" tidak ditemukan di kategori ${categoryName}`)

            return
        }

        await supabase
            .from("categories")
            .update({
                keywords: filtered.join(",")
            })
            .eq("name", categoryName)

        await sendMessage(chatId,
            `🗑 Keyword berhasil dihapus

Kategori : ${categoryName}
Keyword : ${keyword}`)

    }

    catch (err) {

        console.error("REMOVE KEYWORD ERROR:", err)

        await sendMessage(chatId,
            "⚠ Gagal menghapus keyword")

    }

}


export async function categoryDetail(chatId, categoryName) {

    try {

        const { data: category, error } = await supabase
            .from("categories")
            .select("*")
            .eq("name", categoryName)
            .single()

        if (error || !category) {

            await sendMessage(chatId,
                "⚠ Kategori tidak ditemukan")

            return
        }
        const { count } = await supabase
            .from("transactions")
            .select("*", { count: "exact", head: true })
            .eq("category", categoryName)

        const total = count ?? 0
        const keywords = category.keywords.split(",")

        let text = `📂 Category Detail

Name : ${category.name}
Level : ${category.level}
Transactions : ${total}

Keywords:
`

        keywords.forEach((k, i) => {
            text += `${i + 1}. ${k.trim()}\n`
        })

        await sendMessage(chatId, text)

    }

    catch (err) {

        console.error("CATEGORY DETAIL ERROR:", err)

        await sendMessage(chatId,
            "⚠ Gagal mengambil detail kategori")

    }

}