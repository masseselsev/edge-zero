<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const boxes = ref([])
const loading = ref(true)
const error = ref(null)

onMounted(async () => {
    try {
        const response = await axios.get('/api/boxes/')
        boxes.value = response.data
    } catch (e) {
        console.error("Failed to fetch boxes:", e)
        error.value = "Failed to load inventory."
    } finally {
        loading.value = false
    }
})

const getStatusColor = (status) => {
    const colors = {
        'NEW': 'bg-slate-500',
        'STAGING': 'bg-yellow-500',
        'INSTALLING': 'bg-blue-500 animate-pulse',
        'ACTIVE': 'bg-green-500',
        'MAINTENANCE': 'bg-red-500',
    }
    return colors[status] || 'bg-slate-500'
}
</script>

<template>
  <div>
    <div class="mb-8 flex justify-between items-center">
        <div>
            <h1 class="text-3xl font-bold text-white tracking-tight">Inventory</h1>
            <p class="text-slate-400 mt-1">Manage industrial edge devices.</p>
        </div>
        <button class="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">
            + Add Device
        </button>
    </div>

    <!-- Error State -->
    <div v-if="error" class="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg mb-6">
        {{ error }}
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12 text-slate-500">
        Loading inventory...
    </div>

    <!-- Empty State -->
    <div v-else-if="boxes.length === 0" class="text-center py-12 text-slate-500 glass-panel rounded-xl">
        No devices found. Click "+ Add Device" to start.
    </div>

    <!-- Table -->
    <div v-else class="glass-panel rounded-xl overflow-hidden">
        <table class="w-full text-left">
            <thead class="bg-slate-800/50 text-slate-400 text-xs uppercase font-medium">
                <tr>
                    <th class="px-6 py-4">Status</th>
                    <th class="px-6 py-4">Internal SN</th>
                    <th class="px-6 py-4">MAC Address</th>
                    <th class="px-6 py-4">IP Address</th>
                    <th class="px-6 py-4">Location</th>
                    <th class="px-6 py-4">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-700">
                <tr v-for="box in boxes" :key="box.id" class="hover:bg-slate-700/30 transition-colors">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-2">
                            <span class="w-2.5 h-2.5 rounded-full" :class="getStatusColor(box.status)"></span>
                            <span class="text-sm font-medium text-white">{{ box.status }}</span>
                        </div>
                    </td>
                    <td class="px-6 py-4 text-white font-medium">{{ box.internal_sn }}</td>
                    <td class="px-6 py-4 text-slate-300 font-mono text-sm">{{ box.mac_address }}</td>
                    <td class="px-6 py-4 text-slate-300 font-mono text-sm">{{ box.ip_address || '-' }}</td>
                    <td class="px-6 py-4 text-slate-300">{{ box.location || '-' }}</td>
                    <td class="px-6 py-4">
                         <router-link :to="'/inventory/' + box.id" class="text-brand-400 hover:text-brand-300 font-medium text-sm">
                            Details
                        </router-link>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
  </div>
</template>
