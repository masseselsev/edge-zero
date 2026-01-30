<script setup>
import Sidebar from './Sidebar.vue'
</script>

<template>
  <div class="min-h-screen bg-slate-900 text-slate-100">
    <Sidebar />
    <main class="ml-48 p-8">
      <slot />
    </main>
  </div>
</template>
