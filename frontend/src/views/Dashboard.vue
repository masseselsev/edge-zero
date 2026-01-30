<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const stats = ref({
    total_boxes: 0,
    pending_provision: 0,
    active_alerts: 0
})
const loading = ref(true)

onMounted(async () => {
    try {
        const response = await axios.get('/api/boxes/stats')
        stats.value = response.data
    } catch (e) {
        console.error("Failed to fetch dashboard stats:", e)
    } finally {
        loading.value = false
    }
})
</script>

<template>
  <div>
    <div class="mb-8">
        <h1 class="text-3xl font-bold text-white tracking-tight">{{ t('dashboard.title') }}</h1>
        <p class="text-slate-400 mt-1">{{ t('dashboard.subtitle') }}</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-slate-500 py-8">{{ t('common.loading') }}</div>

    <!-- Stats Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="glass-panel p-6 rounded-xl">
            <h3 class="text-slate-400 text-sm font-medium uppercase tracking-wider">{{ t('dashboard.total_devices') }}</h3>
            <p class="text-3xl font-bold text-white mt-2">{{ stats.total_boxes }}</p>
        </div>
        <div class="glass-panel p-6 rounded-xl">
            <h3 class="text-slate-400 text-sm font-medium uppercase tracking-wider">{{ t('dashboard.pending_provision') }}</h3>
            <p class="text-3xl font-bold text-brand-400 mt-2">{{ stats.pending_provision }}</p>
        </div>
        <div class="glass-panel p-6 rounded-xl">
             <h3 class="text-slate-400 text-sm font-medium uppercase tracking-wider">{{ t('dashboard.active_alerts') }}</h3>
            <p class="text-3xl font-bold text-red-400 mt-2">{{ stats.active_alerts }}</p>
        </div>
    </div>
  </div>
</template>
