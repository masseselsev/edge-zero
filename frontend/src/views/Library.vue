<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const activeTab = ref('images')
const images = ref([])
const scripts = ref([])
const uploading = ref(false)
const uploadStats = ref({
    loaded: 0,
    total: 0,
    speed: '',
    percent: 0
})
let abortController = null // Request cancellation controller
let pollingInterval = null

// Stats Helper
const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

// Forms
const uploadFile = ref(null)
const scriptFile = ref(null)

const components = ref([])
const showComponentModal = ref(false)
const newComponent = ref({
    name: '',
    description: '',
    default_port: ''
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

const fetchImages = async () => {
    try {
        const res = await axios.get('/api/library/images')
        images.value = res.data
        
        // Check if we need polling
        const hasProcessing = images.value.some(img => img.status === 'PROCESSING')
        if (hasProcessing && !pollingInterval) {
            startPolling()
        } else if (!hasProcessing && pollingInterval) {
            stopPolling()
        }
    } catch (e) {
        console.error(e)
    }
}

const startPolling = () => {
    pollingInterval = setInterval(fetchImages, 3000)
}

const stopPolling = () => {
    if (pollingInterval) {
        clearInterval(pollingInterval)
        pollingInterval = null
    }
}

const fetchScripts = async () => {
    try {
        const res = await axios.get('/api/library/scripts')
        scripts.value = res.data
    } catch (e) {
        console.error(e)
    }
}

const uploadImage = async () => {
    if (!uploadFile.value) return
    uploading.value = true
    const formData = new FormData()
    formData.append('file', uploadFile.value)

    
    abortController = new AbortController()

    try {
        await axios.post('/api/library/images', formData, {
            signal: abortController.signal,
            onUploadProgress: (progressEvent) => {
                const total = progressEvent.total
                const current = progressEvent.loaded
                const percent = Math.round((current * 100) / total)
                
                uploadStats.value = {
                    loaded: formatBytes(current),
                    total: formatBytes(total),
                    percent: percent,
                    speed: '' // TODO: Calc speed
                }
            }
        })
        uploadFile.value = null
        await fetchImages()
    } catch (e) {
        if (axios.isCancel(e)) {
            alert("Upload Cancelled")
        } else {
            alert("Upload Failed: " + e.message)
        }
    } finally {
        uploading.value = false
        abortController = null
    }
}

const uploadScript = async () => {
    if (!scriptFile.value) return
    uploading.value = true
    const formData = new FormData()
    formData.append('file', scriptFile.value)
    
    abortController = new AbortController()

    try {
        await axios.post('/api/library/scripts', formData, {
            signal: abortController.signal,
            onUploadProgress: (progressEvent) => {
                 const total = progressEvent.total
                const current = progressEvent.loaded
                const percent = Math.round((current * 100) / total)
                 uploadStats.value = {
                    loaded: formatBytes(current),
                    total: formatBytes(total),
                    percent: percent,
                    speed: '' 
                }
            }
        })
        scriptFile.value = null
        await fetchScripts()
    } catch (e) {
        alert("Upload Failed")
    } finally {
        uploading.value = false
    }
}

const cancelUpload = () => {
    if (abortController) {
        abortController.abort()
        abortController = null
    }
}

const deleteImage = async (id) => {
    if (!confirm("Delete OS Image?")) return
    try {
        await axios.delete(`/api/library/images/${id}`)
        await fetchImages()
    } catch (e) {
        alert("Delete failed")
    }
}

const handleFileUpload = (event) => {
    uploadFile.value = event.target.files[0]
}

const handleScriptUpload = (event) => {
    scriptFile.value = event.target.files[0]
}

const createComponent = async () => {
    try {
        await axios.post('/api/library/components', newComponent.value)
        showComponentModal.value = false
        newComponent.value = { name: '', description: '', default_port: '' }
        await fetchComponents()
        alert("Component Created Successfully")
    } catch (e) {
        alert("Failed to create component: " + (e.response?.data?.detail || e.message))
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
    fetchImages()
    fetchScripts()
    fetchComponents()
})

onUnmounted(() => {
    stopPolling()
})

// ... other functions ...

const deleteScript = async (id) => {
    if (!confirm("Are you sure?")) return
    try {
        await axios.delete(`/api/library/scripts/${id}`)
        await fetchScripts()
    } catch (e) {
        alert("Delete failed")
    }
}
</script>



<template>
  <div>
    <div class="mb-8">
        <h1 class="text-3xl font-bold text-white tracking-tight">{{ t('library.title') }}</h1>
        <p class="text-slate-400 mt-1">{{ t('library.subtitle') }}</p>
    </div>

    <!-- Tabs -->
    <div class="flex gap-4 border-b border-slate-700 mb-6">
        <button 
            @click="activeTab = 'images'"
            class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
            :class="activeTab === 'images' ? 'border-brand-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'"
        >
            OS Images
        </button>
        <button 
            @click="activeTab = 'scripts'"
             class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
            :class="activeTab === 'scripts' ? 'border-brand-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'"
        >
            Init Scripts
        </button>
    </div>

    <!-- Images Tab -->
    <div v-if="activeTab === 'images'" class="space-y-6">
        <!-- Upload Form -->
        <div class="glass-panel p-6 rounded-xl">
            <h3 class="text-lg font-bold text-white mb-4">{{ t('library.upload_image') }}</h3>
            <div class="flex gap-4 items-end">
                <div class="flex-1">
                    <label class="block text-xs uppercase text-slate-500 font-bold mb-1">{{ t('library.file') }}</label>
                    <input type="file" @change="handleFileUpload" class="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-700 file:text-white hover:file:bg-slate-600"/>
                </div>

                <div class="flex gap-2">
                    <button 
                        v-if="uploading"
                        @click="cancelUpload" 
                        class="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        {{ t('library.cancel') }}
                    </button>
                    <button 
                        @click="uploadImage" 
                        :disabled="uploading || !uploadFile"
                        class="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        {{ uploading ? t('library.uploading') : t('library.upload') }}
                    </button>
                </div>
            </div>
            <!-- Progress Bar -->
            <div v-if="uploading" class="mt-4">
                <div class="flex justify-between text-xs text-brand-400 mb-1 font-mono">
                    <span>{{ uploadStats.percent }}%</span>
                    <span>{{ uploadStats.loaded }} / {{ uploadStats.total }} — {{ uploadStats.speed }}</span>
                </div>
                <div class="w-full bg-slate-700 rounded-full h-2.5">
                    <div class="bg-brand-500 h-2.5 rounded-full transition-all duration-300" :style="{ width: uploadStats.percent + '%' }"></div>
                </div>
            </div>
        </div>

        <!-- Images List -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="img in images" :key="img.id" class="glass-panel p-4 rounded-xl flex justify-between items-center group">
                <div>
                    <div class="font-bold text-white">{{ img.filename }}</div>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="text-xs text-slate-400">{{ img.os_type }}</span>
                        <span 
                            v-if="img.status !== 'READY'"
                            class="text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider"
                            :class="{
                                'bg-brand-500/10 text-brand-400 animate-pulse': img.status === 'PROCESSING',
                                'bg-red-500/10 text-red-400': img.status === 'ERROR',
                                'bg-slate-700 text-slate-400': img.status === 'UPLOADED'
                            }"
                        >
                            {{ img.status }}
                        </span>
                        <span v-else class="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                            </svg>
                            Ready
                        </span>
                    </div>
                </div>
                <button @click="deleteImage(img.id)" class="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {{ t('common.delete') }}
                </button>
            </div>
            <div v-if="images.length === 0" class="text-slate-500 text-sm col-span-full text-center py-8">
                {{ t('library.no_images') }}
            </div>
        </div>
    </div>

    <!-- Scripts Tab -->
    <div v-if="activeTab === 'scripts'" class="space-y-6">
         <!-- Upload Form -->
        <div class="glass-panel p-6 rounded-xl">
            <h3 class="text-lg font-bold text-white mb-4">{{ t('library.upload_script') }}</h3>
            <div class="flex gap-4 items-end">
                <div class="flex-1">
                    <label class="block text-xs uppercase text-slate-500 font-bold mb-1">{{ t('library.file') }}</label>
                    <input type="file" @change="handleScriptUpload" class="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-700 file:text-white hover:file:bg-slate-600"/>
                </div>
                <div class="flex gap-2">
                     <button 
                        v-if="uploading"
                        @click="cancelUpload" 
                        class="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        {{ t('library.cancel') }}
                    </button>
                    <button 
                        @click="uploadScript" 
                        :disabled="uploading || !scriptFile"
                        class="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        {{ uploading ? t('library.uploading') : t('library.upload') }}
                    </button>
                </div>
            </div>
            <!-- Progress Bar -->
            <div v-if="uploading" class="mt-4">
                <div class="flex justify-between text-xs text-brand-400 mb-1 font-mono">
                    <span>{{ uploadStats.percent }}%</span>
                    <span>{{ uploadStats.loaded }} / {{ uploadStats.total }} — {{ uploadStats.speed }}</span>
                </div>
                <div class="w-full bg-slate-700 rounded-full h-2.5">
                    <div class="bg-brand-500 h-2.5 rounded-full transition-all duration-300" :style="{ width: uploadStats.percent + '%' }"></div>
                </div>
            </div>
        </div>

        <!-- Scripts List -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="script in scripts" :key="script.id" class="glass-panel p-4 rounded-xl flex justify-between items-center group">
                <div>
                    <div class="font-bold text-white">{{ script.filename }}</div>
                </div>
                <button @click="deleteScript(script.id)" class="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {{ t('common.delete') }}
                </button>
            </div>
            <div v-if="scripts.length === 0" class="text-slate-500 text-sm col-span-full text-center py-8">
                {{ t('library.no_scripts') }}
            </div>
        </div>
    </div>
  </div>
</template>
