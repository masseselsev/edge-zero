<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const locations = ref([])
const showLocationModal = ref(false)
const newLocation = ref({ name: '', description: '' })

const fetchLocations = async () => {
    try {
        const res = await axios.get('/api/locations/')
        locations.value = res.data
    } catch (e) {
        console.error(e)
    }
}

const createLocation = async () => {
    try {
        await axios.post('/api/locations/', newLocation.value)
        showLocationModal.value = false
        newLocation.value = { name: '', description: '' }
        fetchLocations()
    } catch (e) {
        alert("Failed to create location: " + (e.response?.data?.detail || e.message))
    }
}

const deleteLocation = async (id) => {
    if(!confirm("Delete location?")) return
    try {
        await axios.delete(`/api/locations/${id}`)
        fetchLocations()
    } catch (e) {
        alert("Failed to delete location")
    }
}

onMounted(() => {
    fetchLocations()
})
</script>

<template>
    <div>
        <div class="flex justify-end mb-6">
            <button @click="showLocationModal = true" class="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
                <span>+</span> {{ t('inventory.add_location') }}
            </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="loc in locations" :key="loc.id" class="glass-panel p-6 rounded-xl flex flex-col justify-between group h-full">
                <div>
                    <h3 class="font-bold text-white text-lg mb-2">{{ loc.name }}</h3>
                    <p class="text-slate-400 text-sm mb-4 line-clamp-2">{{ loc.description || 'No description' }}</p>
                </div>
                <div class="mt-4 pt-4 border-t border-slate-700/50 flex justify-end">
                    <button @click="deleteLocation(loc.id)" class="text-slate-500 hover:text-red-400 text-sm font-medium transition-colors">
                        {{ t('common.delete') }}
                    </button>
                </div>
            </div>
            <div v-if="locations.length === 0" class="text-slate-500 text-sm col-span-full text-center py-8">
                {{ t('inventory.no_locations') }}
            </div>
        </div>

        <!-- Add Location Modal -->
        <div v-if="showLocationModal" class="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div class="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
                <h3 class="text-xl font-bold text-white mb-6">{{ t('inventory.add_location') }}</h3>
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs uppercase text-slate-500 font-bold mb-1">Name <span class="text-red-500">*</span></label>
                        <input v-model="newLocation.name" type="text"
                            class="w-full bg-slate-800 border rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors border-slate-600" />
                    </div>
                    <div>
                        <label class="block text-xs uppercase text-slate-500 font-bold mb-1">Description</label>
                        <textarea v-model="newLocation.description" rows="3" class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none"></textarea>
                    </div>
                </div>
                <div class="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-700">
                    <button @click="showLocationModal = false" class="text-slate-400 hover:text-white font-medium px-4 py-2 transition-colors">Cancel</button>
                    <button @click="createLocation" :disabled="!newLocation.name" class="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors">Create</button>
                </div>
            </div>
        </div>
    </div>
</template>
