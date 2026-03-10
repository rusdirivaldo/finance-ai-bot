import {
    handleTransaction,
    deleteTransaction,
    editTransactionAmount,
    editTransactionDesc,
    updateTransactionCategory
} from "../services/transactionService.js"
import { generateReport, todayReport, monthReport, monthlyReport,categoryReport } from "../services/reportService.js"
import { dashboardAnalytics } from "../services/dashboardService.js"
import { financeInsight, topDetail } from "../services/insightService.js"

import {
    expenseDetail,
    expenseDetailMonth,
    expenseDetailByMonthName,
    searchExpenseDetailbyDescription,
    expenseByCategory
} from "../services/expenseService.js"

import { learnCategory } from "../services/categoryService.js"
import { setBudget, budgetStatus } from "../services/budgetService.js"
import { sendMessage, sendMainMenu } from "../utils/telegram.js"
import { parseAmount, parseCommand } from "../utils/parser.js"
import {
    listCategories,
    addKeywordToCategory,
    removeKeywordFromCategory,
    categoryDetail
} from "../services/categoryService.js"

export default async function handler(req, res) {
    let chatId = null
    try {
        const update = req.body

        if (!update.message) {
            return res.status(200).send("ok")
        }

        const text = update.message.text
        chatId = update.message.chat.id

        console.log("Incoming message:", text)

        if (!text) {
            return res.status(200).send("ok")
        }

        const parsed = parseCommand(text)

        if (!parsed) {
            return res.status(200).send("ok")
        }

        const { command, args } = parsed
        const lower = text.toLowerCase()

        const handledCommand =
            await routeCommand(command, args, text, lower, chatId)

        if (handledCommand) {
            return res.status(200).send("ok")
        }

        const handledTransaction =
            await handleTransaction(chatId, text)

        if (!handledTransaction) {
            await sendMainMenu(chatId)
        }

        res.status(200).send("ok")

    } catch (error) {
        console.error("BOT ERROR:", err)
        try {
            if (chatId) {
                await sendMessage(chatId, "⚠ Terjadi error saat memproses request.")
            }
        } catch (error) {

        }
        res.status(200).send("ok")
    }
}


async function routeCommand(command, args, text, lower, chatId) {

    try {

        if (lower === "/menu") {
            await sendMainMenu(chatId)
            return true
        }

        if (lower === "/categories") {

            await listCategories(chatId)

            return true
        }

        if (command === "/updatecategory") {

            const id = args[0]
            const category = args[1]

            if (!id || !category) {

                await sendMessage(chatId,
                    "Gunakan:\n/updatecategory 102 food")

                return true
            }

            await updateTransactionCategory(chatId, id, category)

            return true
        }
        if (command === "/categorydetail") {

            const category = args[0]

            if (!category) {

                await sendMessage(chatId,
                    "Gunakan:\n/categorydetail food")

                return true
            }

            await categoryDetail(chatId, category)

            return true
        }


        if (command === "/categorytx") {

            const category = args[0]

            if (!category) {

                await sendMessage(chatId,
                    "Gunakan:\n/categorytx food")

                return true
            }

            await expenseByCategory(chatId, category)

            return true
        }

        if (command === "/removekeyword") {

            const category = args[0]
            const keyword = args[1]

            if (!category || !keyword) {

                await sendMessage(chatId,
                    "Gunakan:\n/removekeyword food sushi")

                return true
            }

            await removeKeywordFromCategory(chatId, category, keyword)

            return true
        }

        if (command === "/addkeyword") {

            const category = args[0]
            const keyword = args[1]

            if (!category || !keyword) {

                await sendMessage(chatId,
                    "Gunakan:\n/addkeyword food sushi")

                return true
            }

            await addKeywordToCategory(chatId, category, keyword)

            return true
        }


        if (text === "📊 Dashboard" || lower === "/dashboard") {
            await dashboardAnalytics(chatId)
            return true
        }

        if (text === "📈 Report") {
            await generateReport(chatId)
            return true
        }

        if (text === "💡 Insight" || lower === "/insight") {
            await financeInsight(chatId)
            return true
        }

        if (text === "📋 Expense") {
            await expenseDetail(chatId)
            return true
        }

        if (text === "💰 Top Expense" || lower === "/topdetail") {
            await topDetail(chatId)
            return true
        }

        if (text === "📊 Budgets Status" || lower === "/budgetstatus") {
            await budgetStatus(chatId)
            return true
        }

        if (command === "/delete") {

            const id = args[0]

            if (!id) {
                await sendMessage(chatId, "Gunakan: /delete 102")
                return true
            }

            await deleteTransaction(chatId, id)

            return true
        }

        if (command === "/categoryreport") {

            await categoryReport(chatId)

            return true
        }

        if (command === "/edit") {

            const id = args[0]
            const amountText = args[1]

            if (!id || !amountText) {

                await sendMessage(chatId,
                    "Gunakan Fitur Edit Nominal:\n\n/edit 102 90000")

                return true
            }

            const amount = parseAmount(amountText)

            if (!amount) {
                await sendMessage(chatId, "Nominal tidak valid")
                return true
            }

            await editTransactionAmount(chatId, id, amount)

            return true
        }

        if (lower.startsWith("/editdesc")) {

            const parts = text.split(" ")

            const id = parts[1]
            const desc = parts.slice(2).join(" ")

            if (!id || !desc) {
                await sendMessage(chatId,
                    "Gunakan: /editdesc 102 makan ramen")
                return true
            }

            await editTransactionDesc(chatId, id, desc)

            return true
        }

        if (lower.startsWith("/setcategory")) {

            const parts = lower.split(" ")
            const newCategory = parts[1]

            if (!newCategory) {
                await sendMessage(chatId, "Gunakan: /setcategory food")
                return true
            }

            await learnCategory(chatId, newCategory)

            return true
        }

        if (lower.startsWith("/search")) {

            const keyword = lower.split(" ").slice(1).join(" ")

            if (!keyword) {
                await sendMessage(chatId, "Gunakan: /search ramen")
                return true
            }

            await searchExpenseDetailbyDescription(chatId, keyword)

            return true
        }

        if (command === "/budget") {

            const category = args[0]
            const amountText = args[1]

            if (!category || !amountText) {

                await sendMessage(chatId,
                    `Gunakan format:

/budget food 2000000
/budget coffee 500k`)

                return true
            }

            const amount = parseAmount(amountText)

            if (!amount) {
                await sendMessage(chatId, "Jumlah budget tidak valid")
                return true
            }

            await setBudget(chatId, category, amount)

            return true
        }

        if (lower.startsWith("/expense")) {

            const parts = lower.split(" ")

            if (parts.length === 1) {
                await expenseDetail(chatId)
            }

            else {

                const arg1 = parts[1]
                const arg2 = parts[2]

                if (arg1 === "bulan" && arg2 === "ini") {
                    await expenseDetailMonth(chatId)
                }

                else {

                    const monthName = arg1
                    const year = arg2 || new Date().getFullYear()

                    await expenseDetailByMonthName(chatId, monthName, year)
                }
            }

            return true
        }

        if (lower.startsWith("/report")) {

            const parts = lower.split(" ")

            if (parts.length === 1) {
                await generateReport(chatId)
            }

            else if (parts[1] === "today") {
                await todayReport(chatId)
            }

            else {
                await monthlyReport(chatId, parts[1])
            }

            return true
        }

        if (lower === "/today") {
            await todayReport(chatId)
            return true
        }

        if (lower === "/month") {
            await monthReport(chatId)
            return true
        }

        return false

    } catch (err) {

        console.error("COMMAND ERROR:", err)

        await sendMessage(chatId,
            "⚠ Terjadi error saat menjalankan command")

        return true
    }

}
