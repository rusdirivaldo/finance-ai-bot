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

    const keyword = tx.description.toLowerCase().split(" ")[0]

    const { data: cat } = await supabase
        .from("categories")
        .select("*")
        .eq("name", newCategory)
        .single()

    const keywords = cat.keywords.split(",")

    if (!keywords.includes(keyword)) keywords.push(keyword)

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