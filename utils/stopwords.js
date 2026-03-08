// utils/stopwords.js

const stopwords = [
  "beli",
  "bayar",
  "pesen",
  "order",
  "ambil",
  "isi",
  "topup",
  "buat",
  "ke",
  "di",
  "dari",
  "untuk",
  "pakai",
  "pake",
  "beliin",
  "sewa",
  "qris",
  "aja"
]

export function removeStopwords(words) {
  return words.filter(word => !stopwords.includes(word))
}

export { stopwords }