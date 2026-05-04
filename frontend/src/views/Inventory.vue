<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { useI18n } from 'vue-i18n'

import DevicesTab from '../components/inventory/DevicesTab.vue'
import ComponentsTab from '../components/inventory/ComponentsTab.vue'
import TemplatesTab from '../components/inventory/TemplatesTab.vue'
import DeviceGroupsTab from '../components/inventory/DeviceGroupsTab.vue'
import LocationsTab from '../components/inventory/LocationsTab.vue'

const { t } = useI18n()

const activeTab = ref('devices')
const fileInput = ref(null)
const devicesTabRef = ref(null)

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
    if (fileInput.value) {
        fileInput.value.click()
    }
}

const handleFileUpload = async (event) => {
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
        if (devicesTabRef.value) {
            devicesTabRef.value.fetchBoxes()
        }
    } catch (e) {
        console.error(e)
        alert("Import failed")
    } finally {
        event.target.value = ''
    }
}

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
            {{ t('inventory.tabs.device_groups') }}
        </button>
        <button 
            @click="activeTab = 'locations'"
            class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
            :class="activeTab === 'locations' ? 'border-brand-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'"
        >
            {{ t('inventory.tabs.locations') }}
        </button>
    </div>

    <!-- Content -->
    <div>
        <DevicesTab v-if="activeTab === 'devices'" ref="devicesTabRef" />
        <ComponentsTab v-if="activeTab === 'components'" />
        <TemplatesTab v-if="activeTab === 'templates'" />
        <DeviceGroupsTab v-if="activeTab === 'device_groups'" />
        <LocationsTab v-if="activeTab === 'locations'" />
    </div>
</template>
