import { defineClientAppEnhance } from '@vuepress/client'
import Demo1 from './components/demo-1.vue';
import Other from './components/Other.vue';

export default defineClientAppEnhance(({ app, router, siteData }) => {
  app.component('Demo1', Demo1)
  app.component('Other', Other)
})