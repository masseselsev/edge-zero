<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const scripts = ref([])
const loading = ref(true)
const fileInput = ref(null)

const hardwareComment = ref('')

const fetchScripts = async () => {
    loading.value = true
    try {
        const res = await axios.get('/api/init-scripts/')
        scripts.value = res.data
    } catch (e) {
        console.error(e)
    } finally {
        loading.value = false
    }
}

const triggerUpload = () => {
    if (!hardwareComment.value) {
        alert("Please provide a hardware comment before uploading.")
        return
    }
    if (fileInput.value) {
        fileInput.value.click()
    }
}

const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('hardware_comment', hardwareComment.value)

    try {
        await axios.post('/api/init-scripts/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        })
        hardwareComment.value = ''
        await fetchScripts()
        alert("Script uploaded successfully")
    } catch (e) {
        console.error(e)
        alert("Upload failed: " + (e.response?.data?.detail || e.message))
    } finally {
        event.target.value = ''
    }
}

const deleteScript = async (id) => {
    if (!confirm("Are you sure you want to delete this script?")) return
    try {
        await axios.delete(`/api/init-scripts/${id}`)
        await fetchScripts()
    } catch (e) {
        alert("Failed to delete script")
    }
}

const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString()
}

onMounted(() => {
    fetchScripts()
})

</script>

<template>
  <div>
    <div class="mb-8 flex justify-between items-center">
        <div>
            <h1 class="text-3xl font-bold text-white tracking-tight">Init Scripts</h1>
            <p class="text-slate-400 mt-1">Manage post-installation provisioning scripts</p>
        </div>
    </div>

    <!-- Upload Section -->
    <div class="glass-panel p-6 rounded-xl mb-8 border border-slate-700">
        <h3 class="text-lg font-bold text-white mb-4">Upload New Script</h3>
        <div class="flex gap-4 items-end">
            <div class="flex-1">
                <label class="block text-xs uppercase text-slate-500 font-bold mb-1">Hardware Comment <span class="text-red-500">*</span></label>
                <input v-model="hardwareComment" type="text" placeholder="e.g. Requires Smartmicro44 radar" class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-brand-500 focus:border-brand-500 outline-none" />
            </div>
            <button @click="triggerUpload" class="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2 rounded-lg font-medium transition-colors h-[42px]">
                Upload .sh File
            </button>
            <input type="file" ref="fileInput" class="hidden" accept=".sh" @change="handleFileUpload" />
        </div>
    </div>

    <!-- Scripts List -->
    <div class="glass-panel rounded-xl overflow-hidden border border-slate-700">
        <table class="w-full text-left">
            <thead class="bg-slate-800/50 text-slate-400 text-xs uppercase font-medium">
                <tr>
                    <th class="px-6 py-4">Filename</th>
                    <th class="px-6 py-4">Hardware Comment</th>
                    <th class="px-6 py-4">Uploaded At</th>
                    <th class="px-6 py-4">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-700">
                <tr v-for="script in scripts" :key="script.id" class="hover:bg-slate-700/30 transition-colors">
                    <td class="px-6 py-4 text-white font-medium">{{ script.filename }}</td>
                    <td class="px-6 py-4 text-slate-300">{{ script.hardware_comment }}</td>
                    <td class="px-6 py-4 text-slate-400 text-sm">{{ formatDate(script.created_at) }}</td>
                    <td class="px-6 py-4">
                        <button @click="deleteScript(script.id)" class="text-red-400 hover:text-red-300 text-sm font-medium">Delete</button>
                    </td>
                </tr>
                <tr v-if="scripts.length === 0">
                    <td colspan="4" class="px-6 py-8 text-center text-slate-500">
                        {{ loading ? 'Loading...' : 'No init scripts uploaded yet.' }}
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
  </div>
</template>
