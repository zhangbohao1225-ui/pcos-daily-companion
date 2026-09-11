function pad(value) {
  return String(value).padStart(2, '0')
}

function formatDate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function shiftDate(dateText, offset) {
  const date = new Date(`${dateText}T12:00:00`)
  date.setDate(date.getDate() + offset)
  return formatDate(date)
}

function displayDate(dateText) {
  const date = new Date(`${dateText}T12:00:00`)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

module.exports = { formatDate, shiftDate, displayDate }
