<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

const router = useRouter()
const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const login = async () => {
    loading.value = true
    error.value = ''
    try {
        const formData = new URLSearchParams()
        formData.append('username', username.value)
        formData.append('password', password.value)

        const res = await axios.post('/api/auth/login', formData)
        localStorage.setItem('token', res.data.access_token)
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`
        router.push('/')
    } catch (e) {
        error.value = 'Invalid username or password'
    } finally {
        loading.value = false
    }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-900">
    <div class="max-w-md w-full space-y-8 glass-panel p-8 rounded-xl border border-slate-700">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-white">
          Sign in to Overwatch
        </h2>
      </div>
      <form class="mt-8 space-y-6" @submit.prevent="login">
        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="username" class="sr-only">Username</label>
            <input id="username" name="username" type="text" required v-model="username" class="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-600 bg-slate-800 placeholder-slate-500 text-white rounded-t-md focus:outline-none focus:ring-brand-500 focus:border-brand-500 focus:z-10 sm:text-sm" placeholder="Username">
          </div>
          <div>
            <label for="password" class="sr-only">Password</label>
            <input id="password" name="password" type="password" required v-model="password" class="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-600 bg-slate-800 placeholder-slate-500 text-white rounded-b-md focus:outline-none focus:ring-brand-500 focus:border-brand-500 focus:z-10 sm:text-sm" placeholder="Password">
          </div>
        </div>

        <div v-if="error" class="text-red-500 text-sm text-center">
            {{ error }}
        </div>

        <div>
          <button type="submit" :disabled="loading" class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-colors">
            {{ loading ? 'Signing in...' : 'Sign in' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
