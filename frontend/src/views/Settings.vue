<script setup>
import { useI18n } from 'vue-i18n'
import { watch, ref, onMounted } from 'vue'
import axios from 'axios'

const { t, locale } = useI18n()

// Watch for changes and save to localStorage
watch(locale, (newLocale) => {
    localStorage.setItem('user-locale', newLocale)
})

const languages = [
    { code: 'en', name: 'English' },
    { code: 'ru', name: 'Русский' }
]

const telegramSettings = ref({
    TELEGRAM_BOT_TOKEN: '',
    TELEGRAM_CHAT_ID: ''
})

const isSaving = ref(false)

const fetchSettings = async () => {
    try {
        const res = await axios.get('/api/system/settings')
        for (const item of res.data) {
            if (item.key in telegramSettings.value) {
                telegramSettings.value[item.key] = item.value
            }
        }
    } catch (e) {
        console.error("Failed to fetch settings", e)
    }
}

const saveSettings = async () => {
    isSaving.value = true
    try {
        const payload = [
            { key: 'TELEGRAM_BOT_TOKEN', value: telegramSettings.value.TELEGRAM_BOT_TOKEN },
            { key: 'TELEGRAM_CHAT_ID', value: telegramSettings.value.TELEGRAM_CHAT_ID }
        ]
        await axios.post('/api/system/settings', payload)
        alert(t('settings.save_success', 'Settings saved successfully'))
    } catch (e) {
        alert("Failed to save settings: " + (e.response?.data?.detail || e.message))
    } finally {
        isSaving.value = false
    }
}

onMounted(() => {
    fetchSettings()
})

</script>

<template>
  <div>
    <div class="mb-8">
        <h1 class="text-3xl font-bold text-white tracking-tight">{{ t('settings.title') }}</h1>
        <p class="text-slate-400 mt-1">{{ t('settings.subtitle') }}</p>
    </div>

    <div class="max-w-xl space-y-8">
        <!-- Language Settings -->
        <div class="glass-panel p-6 rounded-xl">
            <h3 class="text-lg font-bold text-white mb-4 border-b border-slate-700 pb-2">{{ t('settings.language') }}</h3>
            
            <div class="space-y-4">
                <div>
                     <label class="block text-xs uppercase text-slate-500 font-bold mb-2">{{ t('settings.select_language') }}</label>
                     <div class="grid grid-cols-2 gap-4">
                        <button 
                            v-for="lang in languages" 
                            :key="lang.code"
                            @click="locale = lang.code"
                            class="px-4 py-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2"
                            :class="locale === lang.code 
                                ? 'bg-brand-600 border-brand-500 text-white shadow-lg shadow-brand-500/20' 
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'"
                        >
                            <span v-if="lang.code === 'en'">🇺🇸</span>
                            <span v-else-if="lang.code === 'ru'">🇷🇺</span>
                            {{ lang.name }}
                        </button>
                     </div>
                </div>
            </div>
        </div>

        <!-- System Settings -->
        <div class="glass-panel p-6 rounded-xl">
            <h3 class="text-lg font-bold text-white mb-4 border-b border-slate-700 pb-2">System Settings</h3>
            
            <div class="space-y-4">
                <div>
                    <label class="block text-xs uppercase text-slate-500 font-bold mb-1">Telegram Bot Token</label>
                    <input v-model="telegramSettings.TELEGRAM_BOT_TOKEN" type="text" placeholder="123456789:ABCdefGHIjklMNO..." class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none" />
                </div>
                <div>
                    <label class="block text-xs uppercase text-slate-500 font-bold mb-1">Telegram Admin Chat ID</label>
                    <input v-model="telegramSettings.TELEGRAM_CHAT_ID" type="text" placeholder="-1001234567890" class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none" />
                </div>
            </div>
            <div class="mt-6 flex justify-end">
                <button @click="saveSettings" :disabled="isSaving" class="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                    {{ isSaving ? 'Saving...' : 'Save Settings' }}
                </button>
            </div>
        </div>

    </div>
  </div>
</template>
