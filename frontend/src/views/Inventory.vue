<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const boxes = ref([])
const loading = ref(true)
const error = ref(null)
const selectedBoxIds = ref([])

const allSelected = computed({
    get: () => boxes.value.length > 0 && selectedBoxIds.value.length === boxes.value.length,
    set: (val) => {
        if (val) {
            selectedBoxIds.value = boxes.value.map(b => b.id)
        } else {
            selectedBoxIds.value = []
        }
    }
})

const fileInput = ref(null)

const fetchBoxes = async () => {
    loading.value = true
    error.value = null
    try {
        const response = await axios.get('/api/boxes/')
        boxes.value = response.data
    } catch (e) {
        console.error("Failed to fetch boxes:", e)
        error.value = "Failed to load inventory."
    } finally {
        loading.value = false
        selectedBoxIds.value = [] // Reset selection on reload
    }
}

const syncPxe = async () => {
    try {
        await axios.post('/api/provision/sync')
        alert("PXE Configuration Synced Successfully")
    } catch (e) {
        console.error(e)
        alert("Failed to sync PXE")
    }
}

const triggerImport = () => {
    fileInput.value.click()
}

const showDeviceModal = ref(false)
const newDevice = ref({
    internal_sn: '',
    mac_address: '',
    internal_sn: '',
    mac_address: '',
    location_id: '',
    notes: '',
    ssh_port: 2222,
    ssh_username: 'user',
    ssh_port: 2222,
    ssh_username: 'user',
    ssh_password: 'admin',
    template_id: ''
})

const isValidMac = computed(() => {
    if (!newDevice.value.mac_address) return false
    // Regex for MAC address (XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX)
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/
    return macRegex.test(newDevice.value.mac_address)
})

const createDevice = async () => {
    if (!isValidMac.value) {
        alert("Invalid MAC Address format. Use XX:XX:XX:XX:XX:XX")
        return
    }
    try {
        await axios.post('/api/boxes/', {
            ...newDevice.value,
            status: 'NEW'
        })
        showDeviceModal.value = false
        showDeviceModal.value = false
        newDevice.value = { internal_sn: '', mac_address: '', location_id: '', notes: '', template_id: '' }
        await fetchBoxes()
    } catch (e) {
        alert("Failed to create type: " + (e.response?.data?.detail || e.message))
    }
}
 
const handleFileUpload = async (event) => {
    // ... existing ...
    const file = event.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
        const res = await axios.post('/api/boxes/upload-csv', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        })
        alert(`Imported: Created ${res.data.created}, Updated ${res.data.updated}`)
        await fetchBoxes()
    } catch (e) {
        console.error(e)
        alert("Import failed")
    } finally {
        event.target.value = '' // Reset
    }
}

const getStatusColor = (status) => {
    const colors = {
        'NEW': 'bg-slate-500',
        'STAGING': 'bg-yellow-500',
        'INSTALLING': 'bg-blue-500 animate-pulse',
        'ACTIVE': 'bg-green-500',
        'MAINTENANCE': 'bg-red-500',
    }
    return colors[status] || 'bg-slate-500'
}

// --- Components Logic ---
const activeTab = ref('devices')
const components = ref([])
const showComponentModal = ref(false)
const componentModalMode = ref('create') // 'create' or 'edit'
const editingComponentId = ref(null)

const componentsSortBy = ref('name') // 'name' or 'type'

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

// --- Component Groups Logic ---
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

// --- Batch Actions ---
const showBatchTagModal = ref(false)
const showBatchTemplateModal = ref(false)
const selectedDeviceGroup = ref('')
const selectedTemplate = ref('')

const batchDelete = async () => {
    if (!confirm(`Delete ${selectedBoxIds.value.length} devices? This cannot be undone.`)) return
    
    try {
        await axios.post('/api/boxes/batch/delete', selectedBoxIds.value)
        await fetchBoxes()
        selectedBoxIds.value = []
    } catch (e) {
        alert("Batch delete failed")
    }
}

const batchApplyTag = async () => {
    if (!selectedDeviceGroup.value) return
    try {
        await axios.post(`/api/boxes/batch/apply-tag/${selectedDeviceGroup.value}`, selectedBoxIds.value)
        showBatchTagModal.value = false
        selectedDeviceGroup.value = ''
        await fetchBoxes()
        alert("Tags applied successfully")
    } catch (e) {
        alert("Batch tag failed")
    }
}

const batchApplyTemplate = async () => {
    if (!selectedTemplate.value) return
    try {
        await axios.post(`/api/boxes/batch/apply-template/${selectedTemplate.value}`, selectedBoxIds.value)
        showBatchTemplateModal.value = false
        selectedTemplate.value = ''
        alert("Template applied successfully")
    } catch (e) {
        alert("Batch template failed")
    }
}

const batchProvision = async () => {
    if (!confirm(`Start provisioning for ${selectedBoxIds.value.length} devices? This will wipe data on the devices.`)) return
    try {
        await axios.post('/api/boxes/batch/provision', selectedBoxIds.value)
        await fetchBoxes()
        selectedBoxIds.value = []
        alert("Provisioning started. PXE configs updated.")
    } catch (e) {
        alert("Provisioning failed: " + (e.response?.data?.detail || e.message))
    }
}

const createComponentGroup = async () => {
    try {
        await axios.post('/api/library/groups', newComponentGroup.value)
        showComponentGroupModal.value = false
        newComponentGroup.value = { name: '', description: '', items: [] }
        await fetchComponentGroups()
        alert("Component Template Created Successfully")
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

// --- Device Groups Logic ---
const deviceGroups = ref([])
const showDeviceGroupModal = ref(false)
const newDeviceGroup = ref({
    name: '',
    description: ''
})

const locations = ref([])
const showLocationModal = ref(false)
const newLocation = ref({ name: '', description: '' })

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
    fetchBoxes()
    fetchComponents()
    fetchComponentGroups()
    fetchDeviceGroups()
    fetchLocations()
})
</script>

<template>
    <div class="mb-8 flex justify-between items-center">
        <div>
            <h1 class="text-3xl font-bold text-white tracking-tight">{{ t('inventory.title') }}</h1>
            <p class="text-slate-400 mt-1">{{ t('inventory.subtitle') }}</p>
        </div>
        <div class="flex gap-3">
             <button @click="syncPxe" class="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                {{ t('inventory.sync_pxe') }}
            </button>
             <button @click="triggerImport" class="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                {{ t('inventory.import_csv') }}
            </button>
            <input type="file" ref="fileInput" class="hidden" accept=".csv" @change="handleFileUpload" />
        </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-4 border-b border-slate-700 mb-6">
        <button 
            @click="activeTab = 'devices'"
            class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
            :class="activeTab === 'devices' ? 'border-brand-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'"
        >
            {{ t('inventory.tabs.devices') }}
        </button>
        <button 
            @click="activeTab = 'components'"
             class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
            :class="activeTab === 'components' ? 'border-brand-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'"
        >
            {{ t('inventory.tabs.components') }}
        </button>
        <button 
            @click="activeTab = 'templates'"
             class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
            :class="activeTab === 'templates' ? 'border-brand-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'"
        >
            {{ t('inventory.tabs.templates') }}
        </button>
        <button 
            @click="activeTab = 'device_groups'"
            class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
            :class="activeTab === 'device_groups' ? 'border-brand-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'"
        >
            {{ t('inventory.tabs.groups') }}
        </button>
        <button 
            @click="activeTab = 'locations'"
            class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
            :class="activeTab === 'locations' ? 'border-brand-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'"
        >
            {{ t('inventory.tabs.locations') }}
        </button>
        </div>
    
    <!-- Devices Tab -->
    <div v-if="activeTab === 'devices'">
        <div class="h-16 flex items-center justify-between mb-4 bg-slate-800/30 border border-slate-700/30 rounded-xl px-4">
             <!-- Batch Actions Left -->
            <div class="flex items-center gap-4 min-w-0" v-if="selectedBoxIds.length > 0">
                 <div class="flex items-center gap-3">
                    <span class="text-white font-medium whitespace-nowrap">{{ selectedBoxIds.length }} selected</span>
                    <div class="h-5 w-px bg-slate-700"></div>
                     <button @click="selectedBoxIds = []" class="text-slate-500 hover:text-white text-sm whitespace-nowrap">Clear</button>
                </div>
                 <div class="h-5 w-px bg-slate-700 hidden md:block"></div>
                <div class="flex items-center gap-4 overflow-x-auto">
                    <button @click="batchDelete" class="text-red-400 hover:text-red-300 text-sm font-medium flex items-center gap-1 whitespace-nowrap">
                        Delete
                    </button>
                    <button @click="showBatchTagModal = true" class="text-brand-400 hover:text-brand-300 text-sm font-medium flex items-center gap-1 whitespace-nowrap">
                        Add Tag
                    </button>
                     <button @click="showBatchTemplateModal = true" class="text-brand-400 hover:text-brand-300 text-sm font-medium flex items-center gap-1 whitespace-nowrap">
                        Apply Template
                    </button>
                    <div class="h-4 w-px bg-slate-700 mx-2"></div>
                    <button @click="batchProvision" class="text-blue-400 hover:text-blue-300 text-sm font-bold flex items-center gap-1 whitespace-nowrap">
                        PROVISION
                    </button>
                </div>
            </div>
            <div v-else class="text-slate-500 text-sm">
                 <!-- Placeholder or summary stats could go here -->
                 Select devices to perform batch actions
            </div>

            <!-- Add Device Right -->
            <button @click="showDeviceModal = true" class="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg font-medium transition-colors ml-4 whitespace-nowrap">
                + {{ t('inventory.add_device') }}
            </button>
        </div>

        <!-- Error State -->
        <div v-if="error" class="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg mb-6">
            {{ error }}
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="text-center py-12 text-slate-500">
            {{ t('inventory.loading') }}
        </div>

        <!-- Empty State -->
        <div v-else-if="boxes.length === 0" class="text-center py-12 text-slate-500 glass-panel rounded-xl">
             {{ t('inventory.no_devices') }}
        </div>

        <div v-else>
            <!-- Table -->
            <div class="glass-panel rounded-xl overflow-hidden">
            <table class="w-full text-left">
                <thead class="bg-slate-800/50 text-slate-400 text-xs uppercase font-medium">
                    <tr>
                        <th class="px-6 py-4 w-10">
                            <input type="checkbox" v-model="allSelected" class="rounded border-slate-600 bg-slate-700 text-brand-600 focus:ring-brand-500">
                        </th>
                        <th class="px-6 py-4">{{ t('inventory.table.status') }}</th>
                        <th class="px-6 py-4">{{ t('inventory.table.internal_sn') }}</th>
                        <th class="px-6 py-4">{{ t('inventory.table.mac_address') }}</th>
                        <th class="px-6 py-4">{{ t('inventory.table.ip_address') }}</th>
                        <th class="px-6 py-4">{{ t('inventory.table.location') }}</th>
                        <th class="px-6 py-4">{{ t('inventory.table.actions') }}</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-700">
                    <tr v-for="box in boxes" :key="box.id" class="hover:bg-slate-700/30 transition-colors" :class="{'bg-slate-700/20': selectedBoxIds.includes(box.id)}">
                        <td class="px-6 py-4">
                             <input type="checkbox" :value="box.id" v-model="selectedBoxIds" class="rounded border-slate-600 bg-slate-700 text-brand-600 focus:ring-brand-500">
                        </td>
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-2">
                                <span class="w-2.5 h-2.5 rounded-full" :class="getStatusColor(box.status)"></span>
                                <span class="text-sm font-medium text-white">{{ box.status }}</span>
                            </div>
                        </td>
                        <td class="px-6 py-4">
                            <div class="text-white font-medium">{{ box.internal_sn }}</div>
                            <div v-if="box.device_groups && box.device_groups.length > 0" class="flex flex-wrap gap-1 mt-1">
                                <span v-for="tag in box.device_groups" :key="tag.id" class="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded border border-slate-600">
                                    {{ tag.name }}
                                </span>
                            </div>
                        </td>
                        <td class="px-6 py-4 text-slate-300 font-mono text-sm">{{ box.mac_address }}</td>
                        <td class="px-6 py-4 text-slate-300 font-mono text-sm">{{ box.ip_address || '-' }}</td>
                        <td class="px-6 py-4 text-slate-300">{{ box.location?.name || '-' }}</td>
                        <td class="px-6 py-4">
                             <router-link :to="'/inventory/' + box.id" class="text-brand-400 hover:text-brand-300 font-medium text-sm">
                                {{ t('inventory.table.details') }}
                            </router-link>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

    <!-- Components Tab -->
    <div v-if="activeTab === 'components'" class="space-y-6">
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
    </div>

    <!-- Templates Tab -->
    <div v-if="activeTab === 'templates'" class="space-y-6">
        <!-- Add Button -->
        <div class="flex justify-end">
            <button @click="showComponentGroupModal = true" class="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                + Add Template
            </button>
        </div>

        <!-- Groups Grid -->
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
    </div>
    
    <!-- Device Groups Tab -->
    <div v-if="activeTab === 'device_groups'" class="space-y-6">
        <!-- Add Button -->
        <div class="flex justify-end">
            <button @click="showDeviceGroupModal = true" class="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                + Add Device Group
            </button>
        </div>

        <!-- Groups Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="grp in deviceGroups" :key="grp.id" class="glass-panel p-6 rounded-xl flex flex-col justify-between group h-full">
                <div>
                    <h3 class="font-bold text-white text-lg mb-2">{{ grp.name }}</h3>
                    <p class="text-slate-400 text-sm mb-4 line-clamp-2">{{ grp.description || 'No description' }}</p>
                </div>
                <div class="mt-4 pt-4 border-t border-slate-700/50 flex justify-end">
                    <button @click="deleteDeviceGroup(grp.id)" class="text-slate-500 hover:text-red-400 text-sm font-medium transition-colors">
                        Delete
                    </button>
                </div>
            </div>
            <div v-if="deviceGroups.length === 0" class="text-slate-500 text-sm col-span-full text-center py-8">
                No device groups found.
            </div>
        </div>
    </div>

    <!-- Locations Tab -->
    <div v-if="activeTab === 'locations'">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold text-white">Locations</h2>
            <button @click="showLocationModal = true" class="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
                <span>+</span> Add Location
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
                        Delete
                    </button>
                </div>
            </div>
            <div v-if="locations.length === 0" class="text-slate-500 text-sm col-span-full text-center py-8">
                No locations found.
            </div>
        </div>
    </div>

    <!-- Add Device Modal -->
    <div v-if="showDeviceModal" class="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
        <div class="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 class="text-xl font-bold text-white mb-6">Add New Device</h3>
            
            <div class="space-y-4">
                <div>
                    <label class="block text-xs uppercase text-slate-500 font-bold mb-1">Internal SN / Hostname <span class="text-red-500">*</span></label>
                    <input v-model="newDevice.internal_sn" type="text" placeholder="e.g. DEVICE-001" 
                        class="w-full bg-slate-800 border rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors"
                        :class="!newDevice.internal_sn ? 'border-red-500/50' : 'border-slate-600'" />
                </div>
                <div>
                    <label class="block text-xs uppercase text-slate-500 font-bold mb-1">MAC Address <span class="text-red-500">*</span></label>
                    <input v-model="newDevice.mac_address" type="text" placeholder="e.g. 00:11:22:33:44:55" 
                        class="w-full bg-slate-800 border rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors"
                        :class="(!newDevice.mac_address || (newDevice.mac_address && !isValidMac)) ? 'border-red-500/50' : 'border-slate-600'" />
                    <p v-if="newDevice.mac_address && !isValidMac" class="text-xs text-red-500 mt-1">Invalid format (XX:XX:XX:XX:XX:XX)</p>
                </div>
                <div>
                    <label class="block text-xs uppercase text-slate-500 font-bold mb-1">{{ t('inventory.table.location') }}</label>
                    <select v-model="newDevice.location_id" 
                        class="bg-slate-800 border text-white text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-full p-2.5 transition-colors border-slate-600">
                        <option value="">Select Location</option>
                        <option v-for="loc in locations" :key="loc.id" :value="loc.id">
                            {{ loc.name }}
                        </option>
                    </select>
                </div>
                
                <div class="border-t border-slate-700 pt-4 mt-4">
                    <h4 class="text-sm font-bold text-white mb-3">{{ t('box_details.ssh_config') }}</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs uppercase text-slate-500 font-bold mb-1">{{ t('box_details.ssh_port') }}</label>
                            <input v-model="newDevice.ssh_port" type="number" class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none" />
                        </div>
                        <div>
                             <label class="block text-xs uppercase text-slate-500 font-bold mb-1">{{ t('box_details.ssh_username') }}</label>
                            <input v-model="newDevice.ssh_username" type="text" class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none" />
                        </div>
                         <div class="col-span-2">
                             <label class="block text-xs uppercase text-slate-500 font-bold mb-1">{{ t('box_details.ssh_password') }}</label>
                            <input v-model="newDevice.ssh_password" type="text" class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none" />
                        </div>
                    </div>
                </div>
                <div>
                    <label class="block text-xs uppercase text-slate-500 font-bold mb-1">Notes</label>
                    <textarea v-model="newDevice.notes" placeholder="Optional notes" rows="3" class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none"></textarea>
                </div>
            </div>
            
            <div class="mt-4 border-t border-slate-700 pt-4">
                <label class="block text-xs uppercase text-slate-500 font-bold mb-1">Apply Template (Optional)</label>
                <select v-model="newDevice.template_id" class="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-full p-2.5">
                    <option value="">None</option>
                    <option v-for="grp in componentGroups" :key="grp.id" :value="grp.id">
                        {{ grp.name }} ({{ grp.items.length }} items)
                    </option>
                </select>
                <p class="text-xs text-slate-500 mt-1">Automatically add components from selected template.</p>
            </div>

            <div class="flex justify-end gap-3 mt-8">
                <button @click="showDeviceModal = false" class="text-slate-400 hover:text-white font-medium px-4 py-2 transition-colors">
                    Cancel
                </button>
                <button @click="createDevice" :disabled="!newDevice.internal_sn || !isValidMac" class="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors">
                    Create
                </button>
            </div>
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

            <div class="flex justify-end gap-3 mt-8">
                <button @click="showComponentModal = false" class="text-slate-400 hover:text-white font-medium px-4 py-2 transition-colors">
                    Cancel
                </button>
                <button @click="saveComponent" :disabled="!newComponent.name" class="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors">
                    {{ componentModalMode === 'create' ? 'Create' : 'Save' }}
                </button>
            </div>
        </div>
    </div>

    <!-- Batch Tag Modal -->
    <div v-if="showBatchTagModal" class="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
        <div class="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 class="text-xl font-bold text-white mb-6">Batch Add Tag</h3>
            <p class="text-slate-400 text-sm mb-4">Add tag to {{ selectedBoxIds.length }} selected devices.</p>
            
            <div class="space-y-4">
                <div>
                    <label class="block text-xs uppercase text-slate-500 font-bold mb-1">Tag (Group)</label>
                    <select v-model="selectedDeviceGroup" class="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-full p-2.5">
                        <option value="" disabled>Select Tag</option>
                        <option v-for="grp in deviceGroups" :key="grp.id" :value="grp.id">
                            {{ grp.name }}
                        </option>
                    </select>
                </div>
            </div>

            <div class="flex justify-end gap-3 mt-8">
                <button @click="showBatchTagModal = false" class="text-slate-400 hover:text-white font-medium px-4 py-2 transition-colors">
                    Cancel
                </button>
                <button @click="batchApplyTag" :disabled="!selectedDeviceGroup" class="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors">
                     Apply Tag
                </button>
            </div>
        </div>
    </div>

    <!-- Batch Template Modal -->
    <div v-if="showBatchTemplateModal" class="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
        <div class="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 class="text-xl font-bold text-white mb-6">Batch Apply Template</h3>
            <p class="text-slate-400 text-sm mb-4">Apply template to {{ selectedBoxIds.length }} selected devices.</p>
            
            <div class="space-y-4">
                <div>
                    <label class="block text-xs uppercase text-slate-500 font-bold mb-1">Template</label>
                    <select v-model="selectedTemplate" class="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-full p-2.5">
                        <option value="" disabled>Select Template</option>
                        <option v-for="tmpl in componentGroups" :key="tmpl.id" :value="tmpl.id">
                            {{ tmpl.name }} ({{ tmpl.items.length }} items)
                        </option>
                    </select>
                </div>
            </div>

            <div class="flex justify-end gap-3 mt-8">
                <button @click="showBatchTemplateModal = false" class="text-slate-400 hover:text-white font-medium px-4 py-2 transition-colors">
                    Cancel
                </button>
                <button @click="batchApplyTemplate" :disabled="!selectedTemplate" class="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors">
                     Apply Template
                </button>
            </div>
        </div>
    </div>

    <!-- Component Template Modal -->
    <div v-if="showComponentGroupModal" class="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
        <div class="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 class="text-xl font-bold text-white mb-6">Add Component Template</h3>
            
            <div class="space-y-4">
                <div>
                    <label class="block text-xs uppercase text-slate-500 font-bold mb-1">Name <span class="text-red-500">*</span></label>
                    <input v-model="newComponentGroup.name" type="text" placeholder="e.g. Standard Sensor Kit" 
                        class="w-full bg-slate-800 border rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors"
                        :class="!newComponentGroup.name ? 'border-red-500/50' : 'border-slate-600'" />
                </div>
                <div>
                    <label class="block text-xs uppercase text-slate-500 font-bold mb-1">Description</label>
                    <textarea v-model="newComponentGroup.description" placeholder="Description of the template..." rows="3" class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none"></textarea>
                </div>
                
                <!-- Simple multi-select for components (MVP) -->
                <div>
                    <label class="block text-xs uppercase text-slate-500 font-bold mb-1">Include Components</label>
                    <div class="max-h-40 overflow-y-auto bg-slate-800 border border-slate-600 rounded-lg p-2 space-y-2">
                        <div v-for="comp in components" :key="comp.id" class="flex items-center gap-2">
                            <input type="checkbox" :value="comp.id" @change="(e) => {
                                if(e.target.checked) {
                                    newComponentGroup.items.push({ definition_id: comp.id, count: 1 })
                                } else {
                                    newComponentGroup.items = newComponentGroup.items.filter(i => i.definition_id !== comp.id)
                                }
                            }" class="rounded border-slate-600 bg-slate-700 text-brand-500 focus:ring-brand-500"/>
                            <span class="text-sm text-slate-300">{{ comp.name }}</span>
                        </div>
                    </div>
                    <p class="text-xs text-slate-500 mt-1">Select components to include in this group.</p>
                </div>
            </div>

            <div class="flex justify-end gap-3 mt-8">
                <button @click="showComponentGroupModal = false" class="text-slate-400 hover:text-white font-medium px-4 py-2 transition-colors">
                    Cancel
                </button>
                <button @click="createComponentGroup" :disabled="!newComponentGroup.name" class="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors">
                    Create
                </button>
            </div>
        </div>
    </div>

    <!-- Device Group Modal -->
    <div v-if="showDeviceGroupModal" class="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
        <div class="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 class="text-xl font-bold text-white mb-6">Add Device Group</h3>
            
            <div class="space-y-4">
                <div>
                    <label class="block text-xs uppercase text-slate-500 font-bold mb-1">Name <span class="text-red-500">*</span></label>
                    <input v-model="newDeviceGroup.name" type="text" placeholder="e.g. Production" 
                        class="w-full bg-slate-800 border rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors" 
                        :class="!newDeviceGroup.name ? 'border-red-500/50' : 'border-slate-600'" />
                </div>
                <div>
                    <label class="block text-xs uppercase text-slate-500 font-bold mb-1">Description</label>
                    <textarea v-model="newDeviceGroup.description" placeholder="Description of the group..." rows="3" class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none"></textarea>
                </div>
            </div>

            <div class="flex justify-end gap-3 mt-8">
                <button @click="showDeviceGroupModal = false" class="text-slate-400 hover:text-white font-medium px-4 py-2 transition-colors">
                    Cancel
                </button>
                <button @click="createDeviceGroup" :disabled="!newDeviceGroup.name" class="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors">
                    Create
                </button>
            </div>
        </div>
    </div>

    <!-- Location Modal -->
    <div v-if="showLocationModal" class="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
        <div class="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 class="text-xl font-bold text-white mb-6">Add Location</h3>
            
            <div class="space-y-4">
                <div>
                    <label class="block text-xs uppercase text-slate-500 font-bold mb-1">Name <span class="text-red-500">*</span></label>
                    <input v-model="newLocation.name" type="text" placeholder="e.g. Server Room A" 
                        class="w-full bg-slate-800 border rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors" 
                        :class="!newLocation.name ? 'border-red-500/50' : 'border-slate-600'" />
                </div>
                <div>
                    <label class="block text-xs uppercase text-slate-500 font-bold mb-1">Description</label>
                    <textarea v-model="newLocation.description" placeholder="Description..." rows="3" class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none"></textarea>
                </div>
            </div>

            <div class="flex justify-end gap-3 mt-8">
                <button @click="showLocationModal = false" class="text-slate-400 hover:text-white font-medium px-4 py-2 transition-colors">
                    Cancel
                </button>
                <button @click="createLocation" :disabled="!newLocation.name" class="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors">
                    Create
                </button>
            </div>
        </div>
    </div>
</template>
