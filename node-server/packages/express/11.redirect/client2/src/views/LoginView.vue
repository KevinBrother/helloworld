<script setup lang="ts">
  import { ref, onMounted } from 'vue'

  // reactive state
  const count = ref(0)

  // functions that mutate state and trigger updates
  function increment() {
    fetch('http://localhost:13002/login').then(res => {
      console.log(res)
    }).catch(err => {
      console.log(err)
      window.location.href = 'http://localhost:13002/login'
    })


  }

  // lifecycle hooks
  onMounted(() => {
  
    console.log(`The initial count is ${count.value}.`)
  })
</script>

<template>
  <div class="about">
    <h1>我是 认证中心界面 </h1>

    <button @click="increment">Increment</button>
  </div>
</template>

<style>
@media (min-width: 1024px) {
  .about {
    min-height: 100vh;
    display: flex;
    align-items: center;
  }
}
</style>
