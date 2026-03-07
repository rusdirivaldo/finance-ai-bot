const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`

export async function sendMessage(chatId, text) {

  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: chatId,
      text
    })
  })

}

export async function sendPhoto(chatId, photo) {

  await fetch(`${TELEGRAM_API}/sendPhoto`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: chatId,
      photo
    })
  })

}