<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const deviceGroups = ref([])
const showDeviceGroupModal = ref(false)
const newDeviceGroup = ref({ name: '', description: '' })

const fetchDeviceGroups = async () => {
    try {
        const res = await axios.get('/api/device-groups/')
        deviceGroups.value = res.data
    } catch (e) {
        console.error(e)
    }
}

const createDeviceGroup = async () => {
    try {
        await axios.post('/api/device-groups/', newDeviceGroup.value)
        showDeviceGroupModal.value = false
        newDeviceGroup.value = { name: '', description: '' }
        await fetchDeviceGroups()
        alert("Device Group Created Successfully")
    } catch (e) {
         alert("Failed to create device group: " + (e.response?.data?.detail || e.message))
    }
}

const deleteDeviceGroup = async (id) => {
    if (!confirm("Delete device group?")) return
    try {
        await axios.delete(`/api/device-groups/${id}`)
        await fetchDeviceGroups()
    } catch (e) {
        alert("Failed to delete group")
    }
}

onMounted(() => {
    fetchDeviceGroups()
})
</script>

<template>
    <div class="space-y-6">
        <div class="flex justify-end">
            <button @click="showDeviceGroupModal = true" class="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                + {{ t('inventory.add_tag') }}
            </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="grp in deviceGroups" :key="grp.id" class="glass-panel p-6 rounded-xl flex flex-col justify-between group h-full">
                <div>
                    <h3 class="font-bold text-white text-lg mb-2">{{ grp.name }}</h3>
                    <p class="text-slate-400 text-sm mb-4 line-clamp-2">{{ grp.description || 'No description' }}</p>
                </div>
                <div class="mt-4 pt-4 border-t border-slate-700/50 flex justify-end">
                    <button @click="deleteDeviceGroup(grp.id)" class="text-slate-500 hover:text-red-400 text-sm font-medium transition-colors">
                        {{ t('common.delete') }}
                    </button>
                </div>
            </div>
            <div v-if="deviceGroups.length === 0" class="text-slate-500 text-sm col-span-full text-center py-8">
                {{ t('inventory.no_tags') }}
            </div>
        </div>

        <!-- Add Device Group Modal -->
        <div v-if="showDeviceGroupModal" class="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div class="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
                <h3 class="text-xl font-bold text-white mb-6">{{ t('inventory.add_tag') }}</h3>
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs uppercase text-slate-500 font-bold mb-1">Name <span class="text-red-500">*</span></label>
                        <input v-model="newDeviceGroup.name" type="text"
                            class="w-full bg-slate-800 border rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors border-slate-600" />
                    </div>
                    <div>
                        <label class="block text-xs uppercase text-slate-500 font-bold mb-1">Description</label>
                        <textarea v-model="newDeviceGroup.description" rows="3" class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none"></textarea>
                    </div>
                </div>
                <div class="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-700">
                    <button @click="showDeviceGroupModal = false" class="text-slate-400 hover:text-white font-medium px-4 py-2 transition-colors">Cancel</button>
                    <button @click="createDeviceGroup" :disabled="!newDeviceGroup.name" class="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors">Create</button>
                </div>
            </div>
        </div>
    </div>
</template>
