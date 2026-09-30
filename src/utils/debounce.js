// 轻量 debounce（不引 lodash）。用法：
//   import { debounce } from '@/utils/debounce'
//   export default {
//     methods: {
//       onSearchInput: debounce(function () { this.fetchData() }, 300)
//     }
//   }

export function debounce (fn, wait = 300) {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
      timer = null
    }, wait)
  }
}

export function throttle (fn, wait = 200) {
  let last = 0
  let timer = null
  return function (...args) {
    const now = Date.now()
    const remain = wait - (now - last)
    if (remain <= 0) {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      last = now
      fn.apply(this, args)
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now()
        timer = null
        fn.apply(this, args)
      }, remain)
    }
  }
}
