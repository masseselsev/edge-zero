<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const components = ref([])
const showComponentModal = ref(false)
const componentModalMode = ref('create')
const editingComponentId = ref(null)
const componentsSortBy = ref('name')

const sortedComponents = computed(() => {
    return [...components.value].sort((a, b) => {
        if (componentsSortBy.value === 'type') {
            const typeA = a.type || ''
            const typeB = b.type || ''
            return typeA.localeCompare(typeB) || a.name.localeCompare(b.name)
        }
        return a.name.localeCompare(b.name)
    })
})

const newComponent = ref({
    name: '',
    description: '',
    default_port: '',
    type: ''
})

const fetchComponents = async () => {
    try {
        const res = await axios.get('/api/library/components')
        components.value = res.data
    } catch (e) {
        console.error(e)
        alert("Fetch error: " + e.message)
    }
}

const openCreateComponentModal = () => {
    componentModalMode.value = 'create'
    newComponent.value = { name: '', description: '', default_port: '', type: '' }
    editingComponentId.value = null
    showComponentModal.value = true
}

const openEditComponentModal = (comp) => {
    componentModalMode.value = 'edit'
    newComponent.value = { ...comp }
    editingComponentId.value = comp.id
    showComponentModal.value = true
}

const saveComponent = async () => {
    try {
        if (componentModalMode.value === 'create') {
            await axios.post('/api/library/components', newComponent.value)
            alert("Component Created Successfully")
        } else {
            await axios.put(`/api/library/components/${editingComponentId.value}`, newComponent.value)
            alert("Component Updated Successfully")
        }
        showComponentModal.value = false
        await fetchComponents()
    } catch (e) {
        alert(`Failed to ${componentModalMode.value} component: ` + (e.response?.data?.detail || e.message))
    }
}

const deleteComponent = async (id) => {
    if (!confirm("Are you sure?")) return
    try {
        await axios.delete(`/api/library/components/${id}`)
        await fetchComponents()
    } catch (e) {
         alert("Delete failed")
    }
}

onMounted(() => {
    fetchComponents()
})
</script>

<template>
    <div class="space-y-6">
        <!-- Toolbar -->
        <div class="flex justify-between items-center">
            <div class="flex items-center gap-2 bg-slate-800 p-1 rounded-lg">
                <button 
                    @click="componentsSortBy = 'name'"
                    class="px-3 py-1 text-xs font-medium rounded transition-colors"
                    :class="componentsSortBy === 'name' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'"
                >
                    Name
                </button>
                <button 
                    @click="componentsSortBy = 'type'"
                    class="px-3 py-1 text-xs font-medium rounded transition-colors"
                    :class="componentsSortBy === 'type' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'"
                >
                    Type
                </button>
            </div>
            <button @click="openCreateComponentModal" class="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm">
                + Add Component Type
            </button>
        </div>

        <!-- Components Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div v-for="comp in sortedComponents" :key="comp.id" class="glass-panel p-4 rounded-lg flex flex-col justify-between group h-full hover:border-slate-500/50 transition-colors">
                <div>
                    <div class="flex justify-between items-start mb-1">
                        <h3 class="font-bold text-white text-sm truncate pr-2" :title="comp.name">{{ comp.name }}</h3>
                        <div v-if="comp.type" class="text-[10px] uppercase font-bold text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded border border-brand-500/20">
                            {{ comp.type }}
                        </div>
                    </div>
                    <p class="text-slate-400 text-xs mb-3 line-clamp-2 h-8">{{ comp.description || 'No description' }}</p>
                    <div class="text-[10px] font-mono text-slate-500 bg-slate-800 inline-block px-1.5 py-0.5 rounded border border-slate-700">
                        {{ comp.default_port || 'No port' }}
                    </div>
                </div>
                <div class="mt-3 pt-3 border-t border-slate-700/50 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button @click="openEditComponentModal(comp)" class="text-xs font-medium text-brand-400 hover:text-brand-300">
                        Edit
                    </button>
                    <button @click="deleteComponent(comp.id)" class="text-xs font-medium text-slate-500 hover:text-red-400">
                        Delete
                    </button>
                </div>
            </div>
            <div v-if="components.length === 0" class="text-slate-500 text-sm col-span-full text-center py-8">
                No component definitions found.
            </div>
        </div>

        <!-- Component Modal -->
        <div v-if="showComponentModal" class="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div class="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
                <h3 class="text-xl font-bold text-white mb-6">{{ componentModalMode === 'create' ? 'Add Component Type' : 'Edit Component Type' }}</h3>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs uppercase text-slate-500 font-bold mb-1">Name <span class="text-red-500">*</span></label>
                        <input v-model="newComponent.name" type="text" placeholder="e.g. VSM Controller" 
                            class="w-full bg-slate-800 border rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors"
                            :class="!newComponent.name ? 'border-red-500/50' : 'border-slate-600'" />
                    </div>
                    <div>
                        <label class="block text-xs uppercase text-slate-500 font-bold mb-1">Type</label>
                        <input v-model="newComponent.type" type="text" placeholder="e.g. Camera, Sensor" list="component-types" class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none" />
                        <datalist id="component-types">
                            <option value="Camera"></option>
                            <option value="Sensor"></option>
                            <option value="Controller"></option>
                            <option value="Gateway"></option>
                        </datalist>
                    </div>
                    <div>
                        <label class="block text-xs uppercase text-slate-500 font-bold mb-1">Description</label>
                        <textarea v-model="newComponent.description" placeholder="Description of the component..." rows="3" class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none"></textarea>
                    </div>
                    <div>
                        <label class="block text-xs uppercase text-slate-500 font-bold mb-1">Default Port</label>
                        <input v-model="newComponent.default_port" type="text" placeholder="e.g. /dev/ttyUSB0" class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none" />
                    </div>
                </div>

                <div class="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-700">
                    <button @click="showComponentModal = false" class="text-slate-400 hover:text-white font-medium px-4 py-2 transition-colors">
                        Cancel
                    </button>
                    <button @click="saveComponent" :disabled="!newComponent.name" class="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors">
                        Save
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
