import express from "express"
import db from "./database.js"
import startBot from "./whatsapp.js"


const app = express()

app.get('/dashboard', (req, res) => {

    res.send(`

<!DOCTYPE html>
<html>

<head>

<title>Finance Dashboard</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<style>
body{
font-family:Arial;
margin:40px;
}
.container{
display:flex;
gap:40px;
}
.card{
padding:20px;
border:1px solid #ddd;
border-radius:10px;
width:200px;
}
table{
border-collapse:collapse;
margin-top:20px;
width:100%;
}

th,td{
border:1px solid #ddd;
padding:8px;
text-align:left;
}

</style>

</head>

<body>

<h1>Finance Dashboard</h1>

<div class="container">

<div class="card">
<h3>Income</h3>
<p id="income"></p>
</div>

<div class="card">
<h3>Expense</h3>
<p id="expense"></p>
</div>

<div class="card">
<h3>Balance</h3>
<p id="balance"></p>
</div>

<div class="card">
<h3>Saving Rate</h3>
<p id="savingRate"></p>
</div>

</div>

<h2>Income vs Expense</h2>

<canvas id="cashflowChart"></canvas>

<h2>Expense by Category</h2>

<canvas id="chart"></canvas>

<h2>Transactions</h2>

<table border="1">
<thead>
<tr>
<th>Date</th>
<th>Description</th>
<th>Category</th>
<th>Amount</th>
</tr>
</thead>

<tbody id="table"></tbody>

</table>

<h2>Income History</h2>

<table border="1">

<thead>
<tr>
<th>Date</th>
<th>Description</th>
<th>Category</th>
<th>Amount</th>
</tr>
</thead>

<tbody id="incomeTable"></tbody>

</table>

<h2>Top Spending Categories</h2>

<canvas id="topSpendingChart"></canvas>

<div id="alert"></div>

<h2>Top Expense Ranking</h2>

<table>

<thead>
<tr>
<th>Rank</th>
<th>Category</th>
<th>Total</th>
</tr>
</thead>

<tbody id="topExpenseTable"></tbody>

</table>

<script>

// summary
fetch('/api/summary')
.then(res=>res.json())
.then(data=>{

let income=0
let expense=0

data.forEach(d=>{
if(d.type==='income') income=d.total
if(d.type==='expense') expense=d.total
})

document.getElementById("income").innerText=income
document.getElementById("expense").innerText=expense
document.getElementById("balance").innerText=income-expense

})

// saving rate
fetch('/api/saving-rate')
.then(res=>res.json())
.then(data=>{
document.getElementById("savingRate").innerText=data.savingRate+"%"
})

// alert
fetch('/api/alert')
.then(res=>res.json())
.then(data=>{

if(data.alert){

document.getElementById("alert").innerHTML=
"⚠ Expense lebih dari 70% income"

}

})

// monthly chart
fetch('/api/monthly')
.then(res=>res.json())
.then(data=>{

const months=[...new Set(data.map(x=>x.month))]

const income=months.map(m=>{
const r=data.find(x=>x.month===m && x.type==='income')
return r?r.total:0
})

const expense=months.map(m=>{
const r=data.find(x=>x.month===m && x.type==='expense')
return r?r.total:0
})

new Chart(document.getElementById('cashflowChart'),{
type:'bar',
data:{
labels:months,
datasets:[
{label:'Income',data:income},
{label:'Expense',data:expense}
]
}
})

})

// category chart
fetch('/api/category')
.then(res=>res.json())
.then(data=>{

const labels=data.map(x=>x.category)
const values=data.map(x=>x.total)

new Chart(document.getElementById('chart'),{
type:'bar',
data:{
labels:labels,
datasets:[{
label:'Expense',
data:values
}]
}
})

})

// transactions
fetch('/api/transactions')
.then(res=>res.json())
.then(data=>{

const table=document.getElementById("table")

data.forEach(t=>{

const row =
"<tr>"+
"<td>"+new Date(t.date).toLocaleDateString()+"</td>"+
"<td>"+t.description+"</td>"+
"<td>"+t.category+"</td>"+
"<td>"+t.amount+"</td>"+
"</tr>"

table.innerHTML+=row

})

})
//list income
fetch('/api/income')
.then(res=>res.json())
.then(data=>{

const incomeTable=document.getElementById("incomeTable")

incomeTable.innerHTML=""

data.forEach(t=>{

const row =
"<tr>"+
"<td>"+new Date(t.date).toLocaleDateString()+"</td>"+
"<td>"+(t.description || "-")+"</td>"+
"<td>"+(t.category || "-")+"</td>"+
"<td>"+t.amount+"</td>"+
"</tr>"

incomeTable.innerHTML += row

})

})

fetch('/api/top-spending')
.then(res=>res.json())
.then(data=>{

const labels=data.map(x=>x.category)
const values=data.map(x=>x.total)

new Chart(document.getElementById('topSpendingChart'),{
type:'bar',
data:{
labels:labels,
datasets:[{
label:'Top Spending',
data:values
}]
}
})

})

fetch('/api/top-spending')
.then(res=>res.json())
.then(data=>{

const table=document.getElementById("topExpenseTable")

table.innerHTML=""

data.forEach((t,index)=>{

const row=
"<tr>"+
"<td>"+(index+1)+"</td>"+
"<td>"+t.category+"</td>"+
"<td>"+t.total+"</td>"+
"</tr>"

table.innerHTML+=row

})

})

</script>

</body>
</html>

`)

})

app.get('/api/report', (req, res) => {

    db.all(`
SELECT category,SUM(amount) total
FROM transactions
WHERE type='expense'
GROUP BY category
`, (err, rows) => {

        res.json(rows)

    })

})

app.get('/api/summary', (req, res) => {

    db.all(`
SELECT 
type,
SUM(amount) as total
FROM transactions
GROUP BY type
`, (err, rows) => {

        if (err) {
            res.status(500).json(err)
            return
        }

        res.json(rows)

    })

})

app.get('/api/category', (req, res) => {

    db.all(`
SELECT 
category,
SUM(amount) as total
FROM transactions
WHERE type='expense'
GROUP BY category
`, (err, rows) => {

        res.json(rows)

    })

})

app.get('/api/transactions', (req, res) => {

    db.all(`
SELECT date,category,description,amount
FROM transactions
ORDER BY date DESC
`, (err, rows) => {

        res.json(rows)

    })

})

app.get('/api/monthly', (req, res) => {

    db.all(`
SELECT 
strftime('%Y-%m',date) as month,
type,
SUM(amount) as total
FROM transactions
GROUP BY month,type
ORDER BY month
`, (err, rows) => {

        res.json(rows)

    })

})

app.get('/api/daily', (req, res) => {

    db.all(`
SELECT 
date(date) as day,
SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
FROM transactions
GROUP BY day
ORDER BY day DESC
LIMIT 7
`, (err, rows) => {

        res.json(rows)

    })

})


app.get('/api/saving-rate', (req, res) => {

    db.all(`
SELECT 
SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
FROM transactions
`, (err, row) => {

        const income = row[0].income || 0
        const expense = row[0].expense || 0

        let savingRate = 0

        if (income > 0) {
            savingRate = ((income - expense) / income) * 100
        }

        res.json({
            income,
            expense,
            savingRate: savingRate.toFixed(2)
        })

    })

})

app.get('/api/alert', (req, res) => {

    db.all(`
SELECT 
SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
FROM transactions
`, (err, row) => {

        const income = row[0].income || 0
        const expense = row[0].expense || 0

        let alert = false

        if (income > 0 && expense / income > 0.7) {
            alert = true
        }

        res.json({
            income,
            expense,
            alert
        })

    })

})

app.get('/api/income', (req, res) => {

    db.all(`
SELECT date,description,category,amount
FROM transactions
WHERE type='income'
ORDER BY date DESC
`, (err, rows) => {

        res.json(rows)

    })

})

app.get('/api/top-spending',(req,res)=>{

db.all(`
SELECT 
category,
SUM(amount) as total
FROM transactions
WHERE type='expense'
GROUP BY category
ORDER BY total DESC
LIMIT 5
`,(err,rows)=>{

res.json(rows)

})

})

startBot()
app.listen(4000, () => {
    console.log("Server running http://localhost:4000")
})