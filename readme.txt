🧠 Project Summary

AI Personal Finance Telegram Bot

Tujuan project ini adalah membuat personal finance assistant berbasis Telegram bot yang dapat:

mencatat transaksi keuangan dengan natural language

melakukan auto categorization

menghasilkan financial analytics

memberikan insight finansial otomatis

menampilkan grafik dashboard langsung di Telegram

Bot di-deploy menggunakan serverless architecture sehingga tidak membutuhkan server pribadi.

🏗 Tech Stack

Backend

Node.js
Vercel Serverless Function
Telegram Bot API

Database

Supabase (PostgreSQL)

Analytics / Chart

QuickChart API

AI-like Logic

string-similarity
keyword matching
auto category learning
📊 Database Structure
Table: transactions
id
chat_id
date
type            (income | expense)
category
description
amount
needs_category  (boolean)

Penjelasan

column	fungsi
chat_id	memisahkan data antar user
description	teks asli dari user
amount	hasil parsing natural language
needs_category	flag jika kategori belum dikenali
Table: categories
id
name
keywords
level

Level kategori

primer
sekunder
tersier
other

Contoh

name	keywords	level
food	makan,ramen,nasi	primer
coffee	kopi,starbucks	sekunder
transport	bensin,grab	primer
✨ Core Feature
1️⃣ Natural Language Transaction Input

User cukup mengetik:

makan ramen 85k
ngopi starbucks 45k
beli oli motor 65k
gajian 17jt

Bot akan otomatis:

detect amount
detect type
detect category
insert ke database

Parsing amount:

85k → 85000
2jt → 2000000
2️⃣ Auto Category Detection

Algoritma:

keyword match
+
string similarity

Flow:

user input
↓
split words
↓
compare with category keywords
↓
return best category

Jika similarity score > 0.6 maka kategori dianggap match.

3️⃣ Auto Category Learning

Jika kategori tidak dikenali:

category = other
needs_category = true

Bot akan meminta user menentukan kategori.

Contoh:

❓ Kategori belum dikenali

"beli oli motor"

balas:
/setcategory transport

Bot kemudian:

menambahkan keyword baru
update categories table
update transaksi

Sehingga transaksi berikutnya otomatis dikenali.

📊 Financial Reports
Command: /report

Menampilkan

Income per category
Expense per category

Total income
Total expense
Balance
Saving rate

Top spending category

Contoh output

📊 Finance Report

💰 Income
gaji : 17,000,000
freelance : 2,000,000

📉 Expense
food : 150,000
coffee : 90,000
transport : 120,000

━━━━━━━━━━━━━━

Total Income  : 19,000,000
Total Expense : 360,000
Balance       : 18,640,000
Saving Rate   : 98%

🔥 Top Spending
1. food
2. transport
3. coffee
📅 Daily / Monthly Report
/today

Menampilkan total spending hari ini.

/month

Menampilkan total spending bulan ini.

/report YYYY-MM

Menampilkan report bulan tertentu.

Contoh

/report 2026-03
🔎 Transaction Search
/search keyword

Mencari transaksi berdasarkan deskripsi.

Contoh

/search ramen
/search starbucks
/search oli

Query menggunakan

ILIKE %keyword%
📋 Expense Detail
/expense

Menampilkan transaksi terbaru.

/expense bulan ini

Menampilkan seluruh expense bulan berjalan.

/expense maret

Menampilkan expense bulan tertentu.

📈 Analytics Commands
/insight

Analisis kondisi finansial user.

Metrics

saving rate
primer spending %
lifestyle spending %
luxury spending %
uncategorized %

Contoh output

💡 Finance Insight

Saving Rate : 35%

Primer Spending   : 45%
Lifestyle Spending: 30%
Luxury Spending   : 15%
Uncategorized     : 10%

✅ Kondisi finansial cukup sehat
🔥 Top Expense Detail
/topdetail

Menampilkan pengeluaran terbesar bulan ini berdasarkan deskripsi transaksi.

Contoh

🔥 Top Expense This Month

1. beli tiket pesawat
Rp2,400,000
📅 4 Mar 2026

2. makan steak
Rp450,000
📅 12 Mar 2026
📊 Dashboard Charts

Command

/dashboard

Bot mengirim grafik:

1️⃣ Income vs Expense trend
2️⃣ Expense by category
3️⃣ Saving rate trend
4️⃣ Daily spending

Semua grafik dibuat menggunakan:

QuickChart API
🧠 Financial Insight Logic

Bot mengkategorikan spending menjadi:

Primer
Sekunder
Tersier
Other

Kemudian menghitung:

primerPct
sekunderPct
tersierPct
otherPct
savingRate

Recommendation logic

savingRate < 15 → 🚨 financial risk
savingRate < 30 → ⚠ low saving
sekunderPct > 35 → lifestyle high
tersierPct > 20 → luxury high
otherPct > 20 → category missing
🧾 Expense by Month Feature

Command

/expense bulan ini

Logic

currentYear
currentMonth
prefix YYYY-MM
filter transactions
🚀 Deployment Architecture

Deployment menggunakan

Vercel serverless

Webhook flow

Telegram
↓
Webhook
↓
/api/bot.js
↓
Supabase

Keuntungan

no server needed
free tier
auto scaling
📌 Current Bot Capabilities

Bot saat ini sudah mampu:

natural language expense tracking
auto categorization
category learning
financial reports
financial insights
transaction search
top spending analysis
telegram dashboard charts
multi-user support (chat_id)
🎯 Next Planned Features

Fitur yang direncanakan:

weekly report automation
monthly financial insight
spending anomaly detection
merchant detection
budget tracking
expense calendar
yearly comparison
📦 File Structure

Project structure

project
 ├ api
 │  └ bot.js
 ├ supabase.js
 ├ package.json
🧩 Main Functions Implemented

Core functions

detectCategory()
parseAmount()
generateReport()
todayReport()
monthReport()
monthlyReport()
searchExpenseDetailByDescription()
expenseDetailMonth()
dashboardAnalytics()
financeInsight()
topDetail()
learnCategory()
sendChart()
