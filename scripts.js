const bar = document.querySelector(".progress-fill")
let value = 0

const timer = setInterval(() => {
  if (value >= 30) {
    clearInterval(timer)
  } else {
    value++
    bar.style.width = value + "%"
  }
}, 15)
