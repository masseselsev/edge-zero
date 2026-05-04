<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Layout from './components/Layout.vue'

const route = useRoute()
const isLoginPage = computed(() => route.name === 'login')
</script>

<template>
  <div v-if="isLoginPage">
    <router-view></router-view>
  </div>
  <Layout v-else>
    <router-view></router-view>
  </Layout>
</template>
