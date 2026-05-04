<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const componentGroups = ref([])
const showComponentGroupModal = ref(false)
const newComponentGroup = ref({
    name: '',
    description: '',
    items: [] 
})

const fetchComponentGroups = async () => {
    try {
        const res = await axios.get('/api/library/groups')
        componentGroups.value = res.data
    } catch (e) {
        console.error(e)
    }
}

const createComponentGroup = async () => {
    try {
        await axios.post('/api/library/groups', newComponentGroup.value)
        showComponentGroupModal.value = false
        newComponentGroup.value = { name: '', description: '', items: [] }
        await fetchComponentGroups()
        alert("Template Created Successfully")
    } catch (e) {
        alert("Failed to create template: " + (e.response?.data?.detail || e.message))
    }
}

const deleteComponentGroup = async (id) => {
    if (!confirm("Delete template?")) return
    try {
        await axios.delete(`/api/library/groups/${id}`)
        await fetchComponentGroups()
    } catch (e) {
        alert("Delete failed")
    }
}

onMounted(() => {
    fetchComponentGroups()
})
</script>

<template>
    <div class="space-y-6">
        <div class="flex justify-end">
            <button @click="showComponentGroupModal = true" class="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                + Add Template
            </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="grp in componentGroups" :key="grp.id" class="glass-panel p-6 rounded-xl flex flex-col justify-between group h-full">
                <div>
                    <h3 class="font-bold text-white text-lg mb-2">{{ grp.name }}</h3>
                    <p class="text-slate-400 text-sm mb-4 line-clamp-2">{{ grp.description || 'No description' }}</p>
                    <div class="text-xs text-slate-500 mt-2">
                        {{ grp.items.length }} definitions
                    </div>
                </div>
                <div class="mt-4 pt-4 border-t border-slate-700/50 flex justify-end">
                    <button @click="deleteComponentGroup(grp.id)" class="text-slate-500 hover:text-red-400 text-sm font-medium transition-colors">
                        Delete
                    </button>
                </div>
            </div>
            <div v-if="componentGroups.length === 0" class="text-slate-500 text-sm col-span-full text-center py-8">
                No templates found.
            </div>
        </div>

        <div v-if="showComponentGroupModal" class="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div class="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
                <h3 class="text-xl font-bold text-white mb-6">Add Template</h3>
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs uppercase text-slate-500 font-bold mb-1">Name <span class="text-red-500">*</span></label>
                        <input v-model="newComponentGroup.name" type="text"
                            class="w-full bg-slate-800 border rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors border-slate-600" />
                    </div>
                    <div>
                        <label class="block text-xs uppercase text-slate-500 font-bold mb-1">Description</label>
                        <textarea v-model="newComponentGroup.description" rows="3" class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none"></textarea>
                    </div>
                </div>
                <div class="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-700">
                    <button @click="showComponentGroupModal = false" class="text-slate-400 hover:text-white font-medium px-4 py-2 transition-colors">Cancel</button>
                    <button @click="createComponentGroup" :disabled="!newComponentGroup.name" class="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors">Create</button>
                </div>
            </div>
        </div>
    </div>
</template>
