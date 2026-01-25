<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const box = ref(null)
const loading = ref(true)
const error = ref(null)

onMounted(async () => {
    try {
        const response = await axios.get(`/api/boxes/${route.params.id}`)
        box.value = response.data
    } catch (e) {
        error.value = "Failed to load box details."
        console.error(e)
    } finally {
        loading.value = false
    }
})

const getStatusColor = (status) => {
    if (!status) return 'bg-slate-500'
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
  <div v-if="loading" class="text-slate-500">Loading...</div>
  <div v-else-if="error" class="text-red-400">{{ error }}</div>
  <div v-else>
     <!-- Header -->
    <div class="mb-8 flex items-center gap-4">
        <router-link to="/inventory" class="text-slate-400 hover:text-white transition-colors">
            ← Back
        </router-link>
        <h1 class="text-3xl font-bold text-white tracking-tight flex items-center gap-4">
            {{ box.internal_sn }}
            <span class="text-sm font-normal py-1 px-3 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-2">
                 <span class="w-2 h-2 rounded-full" :class="getStatusColor(box.status)"></span>
                 {{ box.status }}
            </span>
        </h1>
    </div>

    <!-- Info Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Main Info -->
        <div class="glass-panel p-6 rounded-xl space-y-4">
            <h3 class="text-lg font-bold text-white border-b border-slate-700 pb-2">Device Info</h3>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs uppercase text-slate-500 font-bold mb-1">MAC Address</label>
                    <div class="font-mono text-slate-200">{{ box.mac_address }}</div>
                </div>
                <div>
                     <label class="block text-xs uppercase text-slate-500 font-bold mb-1">IP Address</label>
                    <div class="font-mono text-slate-200">{{ box.ip_address || 'Not Assigned' }}</div>
                </div>
                 <div>
                     <label class="block text-xs uppercase text-slate-500 font-bold mb-1">Location</label>
                    <div class="text-slate-200">{{ box.location || 'Unknown' }}</div>
                </div>
                 <div>
                     <label class="block text-xs uppercase text-slate-500 font-bold mb-1">ID</label>
                    <div class="font-mono text-xs text-slate-400 truncate">{{ box.id }}</div>
                </div>
            </div>
        </div>

        <!-- Actions / Components Placeholder -->
         <div class="glass-panel p-6 rounded-xl space-y-4">
            <h3 class="text-lg font-bold text-white border-b border-slate-700 pb-2">Components</h3>
            <p class="text-slate-500 text-sm">No components attached.</p>
            <button class="text-brand-400 hover:text-brand-300 text-sm font-medium">+ Add Component</button>
        </div>
    </div>
  </div>
</template>
