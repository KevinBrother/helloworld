<template>
  <div class="hello">
    <div>{{ msg }}</div>
  </div>
</template>

<script>
export default {
  name: 'hello',
  data() {
    return {
      msg: '这个component的值'
    }
  }
}
</script>