<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const route = useRoute()
const router = useRouter()
const box = ref(null)
const loading = ref(true)
const error = ref(null)

const componentDefinitions = ref([])
const templates = ref([])
const showComponentModal = ref(false)
const showTemplateModal = ref(false)
const selectedTemplate = ref('')
const newComponent = ref({
    definition_id: '',
    serial_number: ''
})

const fetchComponentDefinitions = async () => {
    try {
        const res = await axios.get('/api/library/components')
        componentDefinitions.value = res.data
    } catch (e) {
        console.error(e)
    }
}

const fetchTemplates = async () => {
    try {
        const res = await axios.get('/api/library/groups')
        templates.value = res.data
    } catch (e) {
        console.error(e)
    }
}

const addComponent = async () => {
    try {
        await axios.post(`/api/boxes/${box.value.id}/components`, newComponent.value)
        showComponentModal.value = false
        newComponent.value = { definition_id: '', serial_number: '' }
        // Refresh box
        const res = await axios.get(`/api/boxes/${box.value.id}`)
        box.value = res.data
        alert("Component Added Successfully")
    } catch (e) {
         alert("Failed to add component: " + (e.response?.data?.detail || e.message))
    }
}

const applyTemplate = async () => {
    try {
        const res = await axios.post(`/api/boxes/${box.value.id}/apply-group/${selectedTemplate.value}`)
        showTemplateModal.value = false
        selectedTemplate.value = ''
        // Refresh
        const boxRes = await axios.get(`/api/boxes/${box.value.id}`)
        box.value = boxRes.data
        alert(`Group Applied: Added ${res.data.added_count} components`)
    } catch (e) {
        alert("Failed to apply group: " + (e.response?.data?.detail || e.message))
    }
}

const removeComponent = async (compId) => {
    if (!confirm("Remove this component?")) return
    try {
        await axios.delete(`/api/boxes/components/${compId}`)
        
        // Refresh
        const res = await axios.get(`/api/boxes/${box.value.id}`)
        box.value = res.data
    } catch (e) {
        alert("Failed to remove component")
    }
}

const deviceGroups = ref([])
const availableDeviceGroups = ref([])
const showDeviceGroupModal = ref(false)
const selectedDeviceGroup = ref('')

const fetchDeviceGroups = async () => {
    try {
        const res = await axios.get('/api/device-groups/')
        availableDeviceGroups.value = res.data
    } catch (e) {
        console.error(e)
    }
}

const locations = ref([])
const isEditingLocation = ref(false)
const selectedLocationId = ref('')

const fetchLocations = async () => {
    try {
        const res = await axios.get('/api/locations/')
        locations.value = res.data
    } catch (e) { console.error(e) }
}

const updateLocation = async () => {
    try {
        await axios.put(`/api/boxes/${box.value.id}`, { location_id: selectedLocationId.value })
        isEditingLocation.value = false
        // Refresh
        const res = await axios.get(`/api/boxes/${box.value.id}`)
        box.value = res.data
    } catch (e) {
        alert("Failed to update location")
    }
}

const addDeviceGroup = async () => {
    try {
        await axios.post(`/api/boxes/${box.value.id}/groups/${selectedDeviceGroup.value}`)
        showDeviceGroupModal.value = false
        selectedDeviceGroup.value = ''
        // Refresh
        const res = await axios.get(`/api/boxes/${box.value.id}`)
        box.value = res.data
    } catch (e) {
        const detail = e.response?.data?.detail
        const errMsg = typeof detail === 'object' ? JSON.stringify(detail) : (detail || e.message)
        alert("Failed to add group: " + errMsg)
    }
}

const provisionBox = async () => {
    if (!confirm("Start provisioning for this device? This will set status to INSTALLING.")) return
    try {
        await axios.post('/api/boxes/batch/provision', [box.value.id])
        // Refresh
        const res = await axios.get(`/api/boxes/${box.value.id}`)
        box.value = res.data
        alert("Provisioning started")
    } catch (e) {
        alert("Provisioning failed")
    }
}

const showEditDeviceModal = ref(false)
const editDeviceData = ref({})

const openEditModal = () => {
    editDeviceData.value = {
        internal_sn: box.value.internal_sn,
        mac_address: box.value.mac_address,
        location_id: box.value.location_id,
        notes: box.value.notes,
        ssh_port: box.value.ssh_port,
        ssh_username: box.value.ssh_username,
        ssh_password: box.value.ssh_password,
    }
    showEditDeviceModal.value = true
}

const saveDeviceChanges = async () => {
    try {
        await axios.put(`/api/boxes/${box.value.id}`, editDeviceData.value)
        // Refresh
        const res = await axios.get(`/api/boxes/${box.value.id}`)
        box.value = res.data
        showEditDeviceModal.value = false
        alert("Device updated successfully")
    } catch (e) {
        const detail = e.response?.data?.detail
        const errMsg = typeof detail === 'object' ? JSON.stringify(detail) : (detail || e.message)
        alert("Failed to update device: " + errMsg)
    }
}

const removeDeviceGroup = async (groupId) => {
    if (!confirm("Remove this tag?")) return
    try {
        await axios.delete(`/api/boxes/${box.value.id}/groups/${groupId}`)
        // Refresh
        const res = await axios.get(`/api/boxes/${box.value.id}`)
        box.value = res.data
    } catch (e) {
        alert("Failed to remove tag")
    }
}

onMounted(async () => {
    try {
        const response = await axios.get(`/api/boxes/${route.params.id}`)
        box.value = response.data
        fetchComponentDefinitions()

        fetchTemplates()
        fetchDeviceGroups()
        fetchLocations()
    } catch (e) {
        error.value = "Failed to load box details."
        console.error(e)
    } finally {
        loading.value = false
    }
})

// ... deleteBox ...


const deleteBox = async () => {
    if (!confirm("Are you sure you want to delete this device?")) return
    
    try {
        await axios.delete(`/api/boxes/${box.value.id}`)
        router.push('/inventory')
    } catch (e) {
        console.error(e)
        alert("Failed to delete device")
    }
}

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
    <div class="mb-8 flex justify-between items-center">
        <div class="flex items-center gap-4">
            <router-link to="/inventory" class="text-slate-400 hover:text-white transition-colors">
                ← {{ t('box_details.back') }}
            </router-link>
            <h1 class="text-3xl font-bold text-white tracking-tight flex items-center gap-4">
                {{ box.internal_sn }}
                <span class="text-sm font-normal py-1 px-3 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-2">
                     <span class="w-2 h-2 rounded-full" :class="getStatusColor(box.status)"></span>
                     {{ box.status }}
                </span>
            </h1>
        </div>
        <div class="flex gap-2">
            <button @click="openEditModal" class="text-slate-400 hover:text-white font-medium px-4 py-2 rounded-lg border border-slate-600 bg-slate-800 transition-colors">
                Edit
            </button>
            <button @click="provisionBox" class="text-blue-400 hover:text-blue-300 font-medium px-4 py-2 rounded-lg border border-blue-500/30 bg-blue-500/10 transition-colors">
                Provision
            </button>
            <button @click="deleteBox" class="text-red-400 hover:text-red-300 font-medium px-4 py-2 rounded-lg border border-red-500/30 bg-red-500/10 transition-colors">
                {{ t('common.delete') }}
            </button>
        </div>
    </div>

    <!-- Info Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Main Info -->
        <div class="glass-panel p-6 rounded-xl space-y-4">
            <h3 class="text-lg font-bold text-white border-b border-slate-700 pb-2">{{ t('box_details.device_info') }}</h3>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs uppercase text-slate-500 font-bold mb-1">{{ t('box_details.mac_address') }}</label>
                    <div class="font-mono text-slate-200">{{ box.mac_address }}</div>
                </div>
                <div>
                     <label class="block text-xs uppercase text-slate-500 font-bold mb-1">{{ t('box_details.ip_address') }}</label>
                    <div class="font-mono text-slate-200">{{ box.ip_address || t('box_details.not_assigned') }}</div>
                </div>
                <div>
                     <label class="block text-xs uppercase text-slate-500 font-bold mb-1">{{ t('box_details.location') }}</label>
                    <div v-if="!isEditingLocation" class="flex items-center gap-2 group">
                        <div class="text-slate-200">{{ box.location?.name || t('box_details.unknown') }}</div>
                        <button @click="isEditingLocation = true; selectedLocationId = box.location?.id || ''" class="text-xs text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity">Edit</button>
                    </div>
                     <div v-else class="flex items-center gap-2">
                         <select v-model="selectedLocationId" class="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white">
                             <option value="">Unknown</option>
                             <option v-for="loc in locations" :key="loc.id" :value="loc.id">{{ loc.name }}</option>
                         </select>
                         <button @click="updateLocation" class="text-xs text-green-500 hover:text-green-400">Save</button>
                         <button @click="isEditingLocation = false" class="text-xs text-slate-500 hover:text-white">Cancel</button>
                     </div>
                </div>
                <div>
                     <label class="block text-xs uppercase text-slate-500 font-bold mb-1">{{ t('box_details.tags') }}</label>
                     <div class="flex flex-wrap gap-2">
                        <span v-for="tag in box.device_groups" :key="tag.id" class="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-600 flex items-center gap-1 group">
                            {{ tag.name }}
                            <button @click="removeDeviceGroup(tag.id)" class="text-slate-500 hover:text-white ml-1 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                        </span>
                        <button @click="showDeviceGroupModal = true" class="text-xs text-brand-400 hover:text-brand-300 border border-brand-500/30 px-2 py-1 rounded bg-brand-500/10 transition-colors">
                            + {{ t('box_details.add_tag') }}
                        </button>
                    </div>
                </div>
                 <div>
                     <label class="block text-xs uppercase text-slate-500 font-bold mb-1">{{ t('box_details.id') }}</label>
                    <div class="font-mono text-xs text-slate-400 truncate">{{ box.id }}</div>
                </div>
                
                <div class="col-span-2 border-t border-slate-700/50 pt-4 mt-2">
                    <h4 class="text-xs uppercase text-brand-400 font-bold mb-3">{{ t('box_details.ssh_config') }}</h4>
                    <div class="grid grid-cols-3 gap-4">
                        <div>
                             <label class="block text-xs uppercase text-slate-500 font-bold mb-1">{{ t('box_details.ssh_port') }}</label>
                             <div class="font-mono text-slate-200">{{ box.ssh_port }}</div>
                        </div>
                        <div>
                             <label class="block text-xs uppercase text-slate-500 font-bold mb-1">{{ t('box_details.ssh_username') }}</label>
                             <div class="font-mono text-slate-200">{{ box.ssh_username }}</div>
                        </div>
                        <div>
                             <label class="block text-xs uppercase text-slate-500 font-bold mb-1">{{ t('box_details.ssh_password') }}</label>
                             <div class="font-mono text-slate-200 blur-[2px] hover:blur-none transition-all cursor-pointer select-none">{{ box.ssh_password }}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

         <!-- Components -->
         <div class="glass-panel p-6 rounded-xl space-y-4">
            <div class="flex justify-between items-center border-b border-slate-700 pb-2">
                <h3 class="text-lg font-bold text-white">{{ t('box_details.components') }}</h3>
                <div class="flex gap-2">
                    <button @click="showTemplateModal = true" class="text-brand-400 hover:text-brand-300 text-sm font-medium border border-brand-500/30 px-3 py-1 rounded bg-brand-500/10">{{ t('box_details.apply_template') }}</button>
                    <button @click="showComponentModal = true" class="text-brand-400 hover:text-brand-300 text-sm font-medium border border-brand-500/30 px-3 py-1 rounded bg-brand-500/10">+ {{ t('common.add') }}</button>
                </div>
            </div>
            
            <div v-if="box.components && box.components.length > 0" class="space-y-3">
                <div v-for="comp in box.components" :key="comp.id" class="bg-slate-800/50 rounded-lg p-3 flex justify-between items-center group">
                    <div>
                        <div class="font-bold text-white text-sm">{{ comp.definition?.name || 'Unknown Component' }}</div>
                        <div class="text-xs text-slate-400" v-if="comp.serial_number">SN: {{ comp.serial_number }}</div>
                    </div>
                     <button @click="removeComponent(comp.id)" class="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>
            <p v-else class="text-slate-500 text-sm">{{ t('box_details.no_components') }}</p>
        </div>
    </div>

    <!-- Component Modal -->
    <div v-if="showComponentModal" class="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
        <div class="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 class="text-xl font-bold text-white mb-6">Add Component</h3>
            
            <div class="space-y-4">
                <div>
                    <label class="block text-xs uppercase text-slate-500 font-bold mb-1">Type <span class="text-red-500">*</span></label>
                    <select v-model="newComponent.definition_id" 
                        class="bg-slate-800 border text-white text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-full p-2.5 transition-colors"
                        :class="!newComponent.definition_id ? 'border-red-500/50' : 'border-slate-700'">
                        <option value="" disabled>Select Component Type</option>
                        <option v-for="def in componentDefinitions" :key="def.id" :value="def.id">
                            {{ def.name }}
                        </option>
                    </select>
                </div>
                <div>
                     <label class="block text-xs uppercase text-slate-500 font-bold mb-1">Serial Number</label>
                    <input v-model="newComponent.serial_number" type="text" placeholder="Optional SN" class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none" />
                </div>
            </div>

            <div class="flex justify-end gap-3 mt-8">
                <button @click="showComponentModal = false" class="text-slate-400 hover:text-white font-medium px-4 py-2 transition-colors">
                    Cancel
                </button>
                <button @click="addComponent" :disabled="!newComponent.definition_id" class="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors">
                     Add
                </button>
            </div>
        </div>
    </div>

    <!-- Apply Template Modal -->
    <div v-if="showTemplateModal" class="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
        <div class="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 class="text-xl font-bold text-white mb-6">{{ t('box_details.apply_template_title') }}</h3>
            <p class="text-slate-400 text-sm mb-4">{{ t('box_details.apply_template_desc') }}</p>
            
            <div class="space-y-4">
                <div>
                    <label class="block text-xs uppercase text-slate-500 font-bold mb-1">{{ t('box_details.template_label') }} <span class="text-red-500">*</span></label>
                    <select v-model="selectedTemplate" 
                        class="bg-slate-800 border text-white text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-full p-2.5 transition-colors"
                        :class="!selectedTemplate ? 'border-red-500/50' : 'border-slate-700'">
                        <option value="" disabled>{{ t('box_details.select_template') }}</option>
                        <option v-for="tmpl in templates" :key="tmpl.id" :value="tmpl.id">
                            {{ tmpl.name }} ({{ tmpl.items.length }} items)
                        </option>
                    </select>
                </div>
            </div>

            <div class="flex justify-end gap-3 mt-8">
                <button @click="showTemplateModal = false" class="text-slate-400 hover:text-white font-medium px-4 py-2 transition-colors">
                    {{ t('common.cancel') }}
                </button>
                <button @click="applyTemplate" :disabled="!selectedTemplate" class="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors">
                     {{ t('common.apply') }}
                </button>
            </div>
        </div>
    </div>
    <!-- Add Tag Modal -->
    <div v-if="showDeviceGroupModal" class="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
        <div class="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 class="text-xl font-bold text-white mb-6">{{ t('box_details.add_tag_title') }}</h3>
            
            <div class="space-y-4">
                <div>
                    <label class="block text-xs uppercase text-slate-500 font-bold mb-1">{{ t('box_details.tag_label') }} <span class="text-red-500">*</span></label>
                    <select v-model="selectedDeviceGroup" 
                        class="bg-slate-800 border text-white text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-full p-2.5 transition-colors"
                        :class="!selectedDeviceGroup ? 'border-red-500/50' : 'border-slate-700'">
                        <option value="" disabled>{{ t('box_details.select_tag') }}</option>
                        <option v-for="grp in availableDeviceGroups" :key="grp.id" :value="grp.id">
                            {{ grp.name }}
                        </option>
                    </select>
                </div>
            </div>

            <div class="flex justify-end gap-3 mt-8">
                <button @click="showDeviceGroupModal = false" class="text-slate-400 hover:text-white font-medium px-4 py-2 transition-colors">
                    {{ t('common.cancel') }}
                </button>
                <button @click="addDeviceGroup" :disabled="!selectedDeviceGroup" class="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors">
                     {{ t('box_details.add_tag') }}
                </button>
            </div>
        </div>
    </div>
    </div>
    
    <!-- Edit Device Modal -->
    <div v-if="showEditDeviceModal" class="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
        <div class="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-2xl shadow-2xl">
            <h3 class="text-xl font-bold text-white mb-6">Edit Device</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Left Column: Identity -->
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs uppercase text-slate-500 font-bold mb-1">{{ t('inventory.table.internal_sn') }} / Hostname</label>
                        <input v-model="editDeviceData.internal_sn" type="text" 
                            class="w-full bg-slate-800 border rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors border-slate-600" />
                    </div>
                    <div>
                        <label class="block text-xs uppercase text-slate-500 font-bold mb-1">{{ t('inventory.table.mac_address') }}</label>
                        <input v-model="editDeviceData.mac_address" type="text" 
                            class="w-full bg-slate-800 border rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors border-slate-600" />
                    </div>
                    <div>
                        <label class="block text-xs uppercase text-slate-500 font-bold mb-1">{{ t('inventory.table.location') }}</label>
                        <select v-model="editDeviceData.location_id" 
                            class="bg-slate-800 border text-white text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-full p-2.5 transition-colors border-slate-600">
                            <option value="">{{ t('inventory.modal.select_location') }}</option>
                            <option v-for="loc in locations" :key="loc.id" :value="loc.id">
                                {{ loc.name }}
                            </option>
                        </select>
                    </div>
                </div>

                <!-- Right Column: Config -->
                <div class="space-y-4">
                    <div class="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                        <h4 class="text-xs font-bold text-slate-400 uppercase mb-3">{{ t('box_details.ssh_config') }}</h4>
                        <div class="space-y-3">
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-[10px] uppercase text-slate-500 font-bold mb-1">{{ t('box_details.ssh_port') }}</label>
                                    <input v-model="editDeviceData.ssh_port" type="number" class="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:ring-brand-500 focus:border-brand-500 outline-none" />
                                </div>
                                <div>
                                    <label class="block text-[10px] uppercase text-slate-500 font-bold mb-1">{{ t('box_details.ssh_username') }}</label>
                                    <input v-model="editDeviceData.ssh_username" type="text" class="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:ring-brand-500 focus:border-brand-500 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase text-slate-500 font-bold mb-1">{{ t('box_details.ssh_password') }}</label>
                                <input v-model="editDeviceData.ssh_password" type="text" class="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:ring-brand-500 focus:border-brand-500 outline-none" />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs uppercase text-slate-500 font-bold mb-1">{{ t('inventory.modal.notes') }}</label>
                        <textarea v-model="editDeviceData.notes" rows="4" class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none resize-none"></textarea>
                    </div>
                </div>
            </div>

            <div class="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-700">
                <button @click="showEditDeviceModal = false" class="text-slate-400 hover:text-white font-medium px-4 py-2 transition-colors">
                    {{ t('common.cancel') }}
                </button>
                <button @click="saveDeviceChanges" class="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                    {{ t('common.save') }}
                </button>
            </div>
        </div>
    </div>
</template>
