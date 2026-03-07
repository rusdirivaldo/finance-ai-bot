import { handleTransaction } from "../services/transactionService.js"
import { generateReport, todayReport, monthReport, monthlyReport } from "../services/reportService.js"
import { dashboardAnalytics } from "../services/dashboardService.js"
import { financeInsight, topDetail } from "../services/insightService.js"

import {
  expenseDetail,
  expenseDetailMonth,
  expenseDetailByMonthName,
  searchExpenseDetailbyDescription
} from "../services/expenseService.js"

import { learnCategory } from "../services/categoryService.js"
import { sendMessage } from "../utils/telegram.js"

export default async function handler(req, res) {

  const update = req.body

  if (!update.message) {
    return res.status(200).send("ok")
  }

  const text = update.message.text
  const chatId = update.message.chat.id
  console.log("Incoming message:", text)
  if (!text) {
    return res.status(200).send("ok")
  }

  const lower = text.toLowerCase()

  if (lower === "/topdetail") {
    await topDetail(chatId)
    return res.status(200).send("ok")
  }

  if (lower === "/insight") {
    await financeInsight(chatId)
    return res.status(200).send("ok")
  }

  if (lower === "/dashboard") {
    await dashboardAnalytics(chatId)
    return res.status(200).send("ok")
  }

  if (lower.startsWith("/setcategory")) {

    const parts = lower.split(" ")
    const newCategory = parts[1]

    if (!newCategory) {
      await sendMessage(chatId, "Gunakan: /setcategory food")
      return res.status(200).send("ok")
    }

    await learnCategory(chatId, newCategory)
    return res.status(200).send("ok")
  }

  if (lower.startsWith("/search")) {

    const keyword = lower.split(" ").slice(1).join(" ")

    if (!keyword) {
      await sendMessage(chatId, "Gunakan: /search ramen")
      return res.status(200).send("ok")
    }

    await searchExpenseDetailbyDescription(chatId, keyword)
    return res.status(200).send("ok")
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

    return res.status(200).send("ok")
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

    return res.status(200).send("ok")
  }

  if (lower === "/today") {
    await todayReport(chatId)
    return res.status(200).send("ok")
  }

  if (lower === "/month") {
    await monthReport(chatId)
    return res.status(200).send("ok")
  }

  await handleTransaction(chatId, text)

  res.status(200).send("ok")
}