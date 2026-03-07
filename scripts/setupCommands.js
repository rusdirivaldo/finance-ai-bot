import "dotenv/config"

const BOT_TOKEN = process.env.BOT_TOKEN

const commands = [
  { command: "report", description: "Full finance report" },
  { command: "today", description: "Today's spending" },
  { command: "month", description: "Monthly summary" },
  { command: "dashboard", description: "Finance dashboard charts" },
  { command: "insight", description: "Financial insight analysis" },
  { command: "expense", description: "Show expense list" },
  { command: "topdetail", description: "Top expense this month" },
  { command: "search", description: "Search expense by keyword" },
  { command: "setcategory", description: "Learn new category" }
]

fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ commands })
})
.then(res => res.json())
.then(console.log)