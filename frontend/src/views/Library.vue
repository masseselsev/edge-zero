<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

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
const uploadOsType = ref('DEBIAN')
const scriptFile = ref(null)

onMounted(() => {
    fetchImages()
    fetchScripts()
})

const fetchImages = async () => {
    try {
        const res = await axios.get('/api/library/images')
        images.value = res.data
    } catch (e) {
        console.error(e)
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

const handleFileUpload = (event) => {
    uploadFile.value = event.target.files[0]
}

const handleScriptUpload = (event) => {
    scriptFile.value = event.target.files[0]
}

const cancelUpload = () => {
    if (abortController) {
        abortController.abort()
        abortController = null
        uploading.value = false
        uploadStats.value = { loaded: 0, total: 0, speed: '', percent: 0 }
    }
}

const uploadImage = async () => {
    if (!uploadFile.value) return
    
    uploading.value = true
    uploadStats.value = { loaded: 0, total: 0, speed: '0 B/s', percent: 0 }
    
    abortController = new AbortController()

    const startTime = Date.now()
    const formData = new FormData()
    formData.append('file', uploadFile.value)
    formData.append('os_type', uploadOsType.value)
    
    try {
        await axios.post('/api/library/images', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            signal: abortController.signal,
            onUploadProgress: (progressEvent) => {
                const { loaded, total } = progressEvent
                const timeElapsed = (Date.now() - startTime) / 1000 // seconds
                const bps = loaded / timeElapsed
                
                uploadStats.value = {
                    loaded: formatBytes(loaded),
                    total: formatBytes(total),
                    speed: `${formatBytes(bps)}/s`,
                    percent: Math.round((loaded * 100) / total)
                }
            }
        })
        uploadFile.value = null
        await fetchImages()
    } catch (e) {
        if (axios.isCancel(e)) {
             console.log("Upload cancelled")
        } else {
             alert("Upload failed: " + e.response?.data?.detail || e.message)
        }
    } finally {
        uploading.value = false
        abortController = null
    }
}

const uploadScript = async () => {
    if (!scriptFile.value) return
    
    uploading.value = true
    uploadStats.value = { loaded: 0, total: 0, speed: '0 B/s', percent: 0 }
     
    abortController = new AbortController()

    const startTime = Date.now()
    const formData = new FormData()
    formData.append('file', scriptFile.value)
    
    try {
        await axios.post('/api/library/scripts', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            signal: abortController.signal,
            onUploadProgress: (progressEvent) => {
                const { loaded, total } = progressEvent
                const timeElapsed = (Date.now() - startTime) / 1000 // seconds
                const bps = loaded / timeElapsed
                
                uploadStats.value = {
                    loaded: formatBytes(loaded),
                    total: formatBytes(total),
                    speed: `${formatBytes(bps)}/s`,
                    percent: Math.round((loaded * 100) / total)
                }
            }
        })
        scriptFile.value = null
        await fetchScripts()
    } catch (e) {
         if (axios.isCancel(e)) {
             console.log("Upload cancelled")
        } else {
            alert("Script upload failed: " + e.response?.data?.detail || e.message)
        }
    } finally {
        uploading.value = false
        abortController = null
    }
}

const deleteImage = async (id) => {
    if (!confirm("Are you sure?")) return
    try {
        await axios.delete(`/api/library/images/${id}`)
        await fetchImages()
    } catch (e) {
        alert("Delete failed")
    }
}

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
        <h1 class="text-3xl font-bold text-white tracking-tight">Library</h1>
        <p class="text-slate-400 mt-1">Manage OS images and init scripts.</p>
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
            <h3 class="text-lg font-bold text-white mb-4">Upload Image</h3>
            <div class="flex gap-4 items-end">
                <div class="flex-1">
                    <label class="block text-xs uppercase text-slate-500 font-bold mb-1">File</label>
                    <input type="file" @change="handleFileUpload" class="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-700 file:text-white hover:file:bg-slate-600"/>
                </div>
                 <div>
                    <label class="block text-xs uppercase text-slate-500 font-bold mb-1">Type</label>
                    <select v-model="uploadOsType" class="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-full p-2.5">
                        <option value="DEBIAN">Debian</option>
                        <option value="UBUNTU">Ubuntu</option>
                    </select>
                </div>
                <div class="flex gap-2">
                    <button 
                        v-if="uploading"
                        @click="cancelUpload" 
                        class="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        @click="uploadImage" 
                        :disabled="uploading || !uploadFile"
                        class="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        {{ uploading ? 'Uploading...' : 'Upload' }}
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
                    <div class="text-xs text-slate-400 mt-1">{{ img.os_type }}</div>
                </div>
                <button @click="deleteImage(img.id)" class="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Delete
                </button>
            </div>
            <div v-if="images.length === 0" class="text-slate-500 text-sm col-span-full text-center py-8">
                No images found.
            </div>
        </div>
    </div>

    <!-- Scripts Tab -->
    <div v-else class="space-y-6">
         <!-- Upload Form -->
        <div class="glass-panel p-6 rounded-xl">
            <h3 class="text-lg font-bold text-white mb-4">Upload Script</h3>
            <div class="flex gap-4 items-end">
                <div class="flex-1">
                    <label class="block text-xs uppercase text-slate-500 font-bold mb-1">Script File</label>
                    <input type="file" @change="handleScriptUpload" class="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-700 file:text-white hover:file:bg-slate-600"/>
                </div>
                <div class="flex gap-2">
                     <button 
                        v-if="uploading"
                        @click="cancelUpload" 
                        class="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        @click="uploadScript" 
                        :disabled="uploading || !scriptFile"
                        class="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        {{ uploading ? 'Uploading...' : 'Upload' }}
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
                    Delete
                </button>
            </div>
            <div v-if="scripts.length === 0" class="text-slate-500 text-sm col-span-full text-center py-8">
                No scripts found.
            </div>
        </div>
    </div>
  </div>
</template>
