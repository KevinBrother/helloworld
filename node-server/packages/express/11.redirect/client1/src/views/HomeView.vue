<script setup lang="ts">

  import { ref, onMounted } from 'vue'

  // reactive state
  const count = ref(0)

  // functions that mutate state and trigger updates
  function increment() {
    count.value++
  }

  // lifecycle hooks
  onMounted(() => {
    fetch('http://localhost:13001/v3/api/login')
    .then(res => res.json())
    .then(res => {
      console.log(res)
      const red_url = window.location.href
      // @ts-ignore
      if(res.code === 502) {
        window.location.href = `http://localhost:13002/sso/authorize/code?redirect_url=${red_url}`
      }
    }).catch(err => {
      console.log(err)
    })
    console.log(`The initial count is ${count.value}.`)
  })
</script>

<template>
  <main>
    <div>提供给他们的界面，带有业务逻辑</div>
    主要发送请求 获取 token 和 登录数据
  </main>
</template>
