<script setup>
import { useI18n } from 'vue-i18n'
import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'

const { t } = useI18n()
const systemStatus = ref('offline')
let pollInterval = null

const checkStatus = async () => {
  try {
    const { data } = await axios.get('/api/system/status')
    if (data.status === 'online') {
      systemStatus.value = 'online'
    } else {
      systemStatus.value = 'offline'
    }
  } catch (error) {
    systemStatus.value = 'offline'
  }
}

onMounted(() => {
  checkStatus()
  pollInterval = setInterval(checkStatus, 30000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>

<template>
  <aside class="w-48 bg-slate-800/80 backdrop-blur border-r border-slate-700 font-sans flex flex-col h-screen fixed left-0 top-0">
    <div class="h-16 flex items-center px-4 border-b border-slate-700">
      <span class="text-lg font-bold text-brand-400 tracking-tight">edge.OVERWATCH</span>
    </div>

    <nav class="flex-1 px-3 py-4 space-y-1">
      <router-link to="/" class="flex items-center px-3 py-2 text-base font-medium text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md group" active-class="bg-slate-700/50 text-white">
        <span class="truncate">{{ t('sidebar.dashboard') }}</span>
      </router-link>
      <router-link to="/inventory" class="flex items-center px-3 py-2 text-base font-medium text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md group" active-class="bg-slate-700/50 text-white">
        <span class="truncate">{{ t('sidebar.inventory') }}</span>
      </router-link>
      <a href="#" class="flex items-center px-3 py-2 text-base font-medium text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md group">
        <span class="truncate">{{ t('sidebar.deployment') }}</span>
      </a>
      <a href="http://10.8.0.205:5000" target="_blank" class="flex items-center px-3 py-2 text-base font-medium text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md group">
        <span class="truncate mr-2">{{ t('sidebar.vsm2_utility') }}</span>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-auto text-slate-500 group-hover:text-slate-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
      <router-link to="/library" class="flex items-center px-3 py-2 text-base font-medium text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md group" active-class="bg-slate-700/50 text-white">
        <span class="truncate">{{ t('sidebar.library') }}</span>
      </router-link>
      <router-link to="/settings" class="flex items-center px-3 py-2 text-base font-medium text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md group" active-class="bg-slate-700/50 text-white">
        <span class="truncate">{{ t('sidebar.settings') }}</span>
      </router-link>
    </nav>

    <div class="p-4 border-t border-slate-700">
      <div class="flex items-center">
        <div class="ml-3">
          <p class="text-xs font-medium text-slate-400 group-hover:text-white">{{ t('sidebar.system_status') }}</p>
          <p class="text-xs" :class="systemStatus === 'online' ? 'text-green-400' : 'text-red-400'">
            ● {{ systemStatus === 'online' ? t('sidebar.online') : t('sidebar.offline') }}
          </p>
        </div>
      </div>
    </div>
  </aside>
</template>
