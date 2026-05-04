<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const boxes = ref([])
const loading = ref(true)
const error = ref(null)
const selectedBoxIds = ref([])

const locations = ref([])
const componentGroups = ref([])
const deviceGroups = ref([])
const osImages = ref([])

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
        selectedBoxIds.value = []
    }
}

const fetchData = async () => {
    try {
        const [locRes, groupRes, dgroupRes, osRes] = await Promise.all([
            axios.get('/api/locations/'),
            axios.get('/api/library/groups'),
            axios.get('/api/device-groups/'),
            axios.get('/api/library/images')
        ])
        locations.value = locRes.data
        componentGroups.value = groupRes.data
        deviceGroups.value = dgroupRes.data
        osImages.value = osRes.data
    } catch(e) {
        console.error(e)
    }
}

// Add Device Logic
const showDeviceModal = ref(false)
const newDevice = ref({
    internal_sn: '',
    mac_address: '',
    location_id: '',
    notes: '',
    ssh_port: 2222,
    ssh_username: 'user',
    ssh_password: 'admin',
    template_id: '',
    os_image_id: ''
})

const isValidMac = computed(() => {
    if (!newDevice.value.mac_address) return false
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/
    return macRegex.test(newDevice.value.mac_address)
})

const createDevice = async () => {
    if (!isValidMac.value) {
        alert("Invalid MAC Address format. Use XX:XX:XX:XX:XX:XX")
        return
    }
    try {
        const payload = { ...newDevice.value, status: 'NEW' }
        if (!payload.location_id) payload.location_id = null
        if (!payload.template_id) payload.template_id = null
        if (!payload.os_image_id) payload.os_image_id = null
        
        await axios.post('/api/boxes/', payload)
        showDeviceModal.value = false
        newDevice.value = { internal_sn: '', mac_address: '', location_id: '', notes: '', template_id: '' }
        await fetchBoxes()
    } catch (e) {
        const detail = e.response?.data?.detail
        const errMsg = typeof detail === 'object' ? JSON.stringify(detail) : (detail || e.message)
        alert("Failed to create device: " + errMsg)
    }
}

// Batch Actions Logic
const showBatchTagModal = ref(false)
const showBatchTemplateModal = ref(false)
const selectedDeviceGroup = ref('')
const selectedTemplate = ref('')

const batchDelete = async () => {
    if (!confirm(t('inventory.batch.delete_confirm', { count: selectedBoxIds.value.length }))) return
    try {
        await axios.post('/api/boxes/batch/delete', selectedBoxIds.value)
        await fetchBoxes()
    } catch (e) {
        alert(t('inventory.batch.delete_fail'))
    }
}

const batchApplyTag = async () => {
    if (!selectedDeviceGroup.value) return
    try {
        await axios.post(`/api/boxes/batch/apply-tag/${selectedDeviceGroup.value}`, selectedBoxIds.value)
        showBatchTagModal.value = false
        selectedDeviceGroup.value = ''
        await fetchBoxes()
        alert(t('inventory.batch.tag_success'))
    } catch (e) {
        alert(t('inventory.batch.tag_fail'))
    }
}

const batchApplyTemplate = async () => {
    if (!selectedTemplate.value) return
    try {
        await axios.post(`/api/boxes/batch/apply-template/${selectedTemplate.value}`, selectedBoxIds.value)
        showBatchTemplateModal.value = false
        selectedTemplate.value = ''
        alert(t('inventory.batch.template_success'))
    } catch (e) {
        alert(t('inventory.batch.template_fail'))
    }
}

const batchProvision = async () => {
    if (!confirm(t('inventory.batch.provision_confirm', { count: selectedBoxIds.value.length }))) return
    try {
        await axios.post('/api/boxes/batch/provision', selectedBoxIds.value)
        await fetchBoxes()
        alert(t('inventory.batch.provision_started'))
    } catch (e) {
        alert("Provisioning failed: " + (e.response?.data?.detail || e.message))
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

onMounted(() => {
    fetchBoxes()
    fetchData()
})

// Expose fetchBoxes for parent component's triggerImport hook if needed
defineExpose({ fetchBoxes })
</script>

<template>
    <div>
        <div class="h-16 flex items-center justify-between mb-4 bg-slate-800/30 border border-slate-700/30 rounded-xl px-4">
             <!-- Batch Actions Left -->
            <div class="flex items-center gap-4 min-w-0" v-if="selectedBoxIds.length > 0">
                 <div class="flex items-center gap-3">
                    <span class="text-white font-medium whitespace-nowrap">{{ t('inventory.batch.selected', { count: selectedBoxIds.length }) }}</span>
                    <div class="h-5 w-px bg-slate-700"></div>
                     <button @click="selectedBoxIds = []" class="text-slate-500 hover:text-white text-sm whitespace-nowrap">{{ t('inventory.batch.clear') }}</button>
                </div>
                 <div class="h-5 w-px bg-slate-700 hidden md:block"></div>
                <div class="flex items-center gap-4 overflow-x-auto">
                    <button @click="batchDelete" class="text-red-400 hover:text-red-300 text-sm font-medium flex items-center gap-1 whitespace-nowrap">
                        {{ t('inventory.batch.delete') }}
                    </button>
                    <button @click="showBatchTagModal = true" class="text-brand-400 hover:text-brand-300 text-sm font-medium flex items-center gap-1 whitespace-nowrap">
                        {{ t('inventory.batch.add_tag') }}
                    </button>
                     <button @click="showBatchTemplateModal = true" class="text-brand-400 hover:text-brand-300 text-sm font-medium flex items-center gap-1 whitespace-nowrap">
                        {{ t('inventory.batch.apply_template') }}
                    </button>
                    <div class="h-4 w-px bg-slate-700 mx-2"></div>
                    <button @click="batchProvision" class="text-blue-400 hover:text-blue-300 text-sm font-bold flex items-center gap-1 whitespace-nowrap">
                        {{ t('inventory.batch.provision') }}
                    </button>
                </div>
            </div>
            <div v-else class="text-slate-500 text-sm">
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

        <!-- Add Device Modal -->
        <div v-if="showDeviceModal" class="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div class="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-2xl shadow-2xl">
                <h3 class="text-xl font-bold text-white mb-6">{{ t('inventory.add_device') }}</h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-xs uppercase text-slate-500 font-bold mb-1">{{ t('inventory.table.internal_sn') }} / Hostname <span class="text-red-500">*</span></label>
                            <input v-model="newDevice.internal_sn" type="text" placeholder="e.g. DEVICE-001" 
                                class="w-full bg-slate-800 border rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors"
                                :class="!newDevice.internal_sn ? 'border-red-500/50' : 'border-slate-600'" />
                        </div>
                        <div>
                            <label class="block text-xs uppercase text-slate-500 font-bold mb-1">{{ t('inventory.table.mac_address') }} <span class="text-red-500">*</span></label>
                            <input v-model="newDevice.mac_address" type="text" placeholder="e.g. 00:11:22:33:44:55" 
                                class="w-full bg-slate-800 border rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors"
                                :class="(!newDevice.mac_address || (newDevice.mac_address && !isValidMac)) ? 'border-red-500/50' : 'border-slate-600'" />
                            <p v-if="newDevice.mac_address && !isValidMac" class="text-xs text-red-500 mt-1">Invalid format</p>
                        </div>
                        <div>
                            <label class="block text-xs uppercase text-slate-500 font-bold mb-1">{{ t('inventory.table.location') }}</label>
                            <select v-model="newDevice.location_id" 
                                class="bg-slate-800 border text-white text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-full p-2.5 transition-colors border-slate-600">
                                <option value="">{{ t('inventory.modal.select_location') }}</option>
                                <option v-for="loc in locations" :key="loc.id" :value="loc.id">{{ loc.name }}</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs uppercase text-slate-500 font-bold mb-1">{{ t('inventory.modal.apply_template') }}</label>
                            <select v-model="newDevice.template_id" class="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-full p-2.5">
                                <option value="">{{ t('inventory.modal.none') }}</option>
                                <option v-for="grp in componentGroups" :key="grp.id" :value="grp.id">
                                    {{ grp.name }}
                                </option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs uppercase text-slate-500 font-bold mb-1">OS Image</label>
                            <select v-model="newDevice.os_image_id" class="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-full p-2.5">
                                <option value="">None (Standard Debian)</option>
                                <option v-for="img in osImages" :key="img.id" :value="img.id">
                                    {{ img.filename }} ({{ img.os_type }})
                                </option>
                            </select>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <div class="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                            <h4 class="text-xs font-bold text-slate-400 uppercase mb-3">{{ t('box_details.ssh_config') }}</h4>
                            <div class="space-y-3">
                                <div class="grid grid-cols-2 gap-3">
                                    <div>
                                        <label class="block text-[10px] uppercase text-slate-500 font-bold mb-1">{{ t('box_details.ssh_port') }}</label>
                                        <input v-model="newDevice.ssh_port" type="number" class="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:ring-brand-500 focus:border-brand-500 outline-none" />
                                    </div>
                                    <div>
                                        <label class="block text-[10px] uppercase text-slate-500 font-bold mb-1">{{ t('box_details.ssh_username') }}</label>
                                        <input v-model="newDevice.ssh_username" type="text" class="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:ring-brand-500 focus:border-brand-500 outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-[10px] uppercase text-slate-500 font-bold mb-1">{{ t('box_details.ssh_password') }}</label>
                                    <input v-model="newDevice.ssh_password" type="text" class="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:ring-brand-500 focus:border-brand-500 outline-none" />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label class="block text-xs uppercase text-slate-500 font-bold mb-1">{{ t('inventory.modal.notes') }}</label>
                            <textarea v-model="newDevice.notes" :placeholder="t('inventory.modal.optional_notes')" rows="4" class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none resize-none"></textarea>
                        </div>
                    </div>
                </div>

                <div class="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-700">
                    <button @click="showDeviceModal = false" class="text-slate-400 hover:text-white font-medium px-4 py-2 transition-colors">
                        {{ t('common.cancel') }}
                    </button>
                    <button @click="createDevice" :disabled="!newDevice.internal_sn || !isValidMac" class="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors">
                        {{ t('common.create') }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Batch Apply Tag Modal -->
        <div v-if="showBatchTagModal" class="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div class="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-sm shadow-2xl">
                <h3 class="text-xl font-bold text-white mb-4">Apply Tag</h3>
                <select v-model="selectedDeviceGroup" class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white mb-6">
                    <option value="">Select a tag...</option>
                    <option v-for="g in deviceGroups" :key="g.id" :value="g.id">{{ g.name }}</option>
                </select>
                <div class="flex justify-end gap-3">
                    <button @click="showBatchTagModal = false" class="text-slate-400 hover:text-white px-4 py-2">Cancel</button>
                    <button @click="batchApplyTag" :disabled="!selectedDeviceGroup" class="bg-brand-600 text-white px-4 py-2 rounded disabled:opacity-50">Apply</button>
                </div>
            </div>
        </div>

        <!-- Batch Apply Template Modal -->
        <div v-if="showBatchTemplateModal" class="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div class="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-sm shadow-2xl">
                <h3 class="text-xl font-bold text-white mb-4">Apply Template</h3>
                <select v-model="selectedTemplate" class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white mb-6">
                    <option value="">Select a template...</option>
                    <option v-for="t in componentGroups" :key="t.id" :value="t.id">{{ t.name }}</option>
                </select>
                <div class="flex justify-end gap-3">
                    <button @click="showBatchTemplateModal = false" class="text-slate-400 hover:text-white px-4 py-2">Cancel</button>
                    <button @click="batchApplyTemplate" :disabled="!selectedTemplate" class="bg-brand-600 text-white px-4 py-2 rounded disabled:opacity-50">Apply</button>
                </div>
            </div>
        </div>

    </div>
</template>
