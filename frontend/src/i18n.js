import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import ru from './locales/ru.json'

const savedLocale = localStorage.getItem('user-locale') || 'en'

const i18n = createI18n({
    legacy: false, // Use Composition API
    locale: savedLocale,
    fallbackLocale: 'en',
    messages: {
        en,
        ru
    }
})

export default i18n
