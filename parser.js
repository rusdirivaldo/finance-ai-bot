function parseMessage(text){

const numberMatch = text.match(/\d+/)

if(!numberMatch) return null

const amount = parseInt(numberMatch[0])

let category = "other"

if(text.includes("kopi")) category = "coffee"
if(text.includes("makan")) category = "food"
if(text.includes("bensin")) category = "transport"

return {
description:text,
category:category,
amount:amount,
date:new Date().toISOString()
}

}

export default parseMessage