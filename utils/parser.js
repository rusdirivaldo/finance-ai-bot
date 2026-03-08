export function parseAmount(text) {

  text = text.toLowerCase()

  let number = text.match(/[0-9]+/)

  if (!number) return null

  let amount = parseInt(number[0])

  if (text.includes("jt")) amount *= 1000000
  else if (text.includes("k")) amount *= 1000

  return amount
}

export function normalize(text) {

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .trim()
}

export function tokenize(text) {

  return text.split(/\s+/)

}

export function parseCommand(text){

  if(!text) return null

  const parts = text.trim().split(/\s+/)

  const command = parts[0].toLowerCase()

  const args = parts.slice(1)

  return {
    command,
    args
  }

}