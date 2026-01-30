<script setup>
import { useI18n } from 'vue-i18n'
import { watch } from 'vue'

const { t, locale } = useI18n()

// Watch for changes and save to localStorage
watch(locale, (newLocale) => {
    localStorage.setItem('user-locale', newLocale)
})

const languages = [
    { code: 'en', name: 'English' },
    { code: 'ru', name: 'Русский' }
]
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
    </div>
  </div>
</template>
