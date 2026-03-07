import db from "./database.js"

function dashboard(app){

  app.get('/api/report', (req, res) => {

    db.all(`
      SELECT category, SUM(amount) as total
      FROM transactions
      WHERE type='expense'
      GROUP BY category
    `, (err, rows) => {

      if(err){
        res.status(500).json(err)
        return
      }

      res.json(rows)

    })

  })

}

export default dashboard