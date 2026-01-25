<script setup>
</script>

<template>
  <aside class="w-64 bg-slate-800/80 backdrop-blur border-r border-slate-700 font-sans flex flex-col h-screen fixed left-0 top-0">
    <div class="h-16 flex items-center px-6 border-b border-slate-700">
      <span class="text-xl font-bold text-brand-400 tracking-tight">OVERWATCH</span>
    </div>

    <nav class="flex-1 px-3 py-4 space-y-1">
      <router-link to="/" class="flex items-center px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md group" active-class="bg-slate-700/50 text-white">
        <span class="truncate">Dashboard</span>
      </router-link>
      <router-link to="/inventory" class="flex items-center px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md group" active-class="bg-slate-700/50 text-white">
        <span class="truncate">Inventory</span>
      </router-link>
      <a href="#" class="flex items-center px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md group">
        <span class="truncate">Deployment</span>
      </a>
      <router-link to="/library" class="flex items-center px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md group" active-class="bg-slate-700/50 text-white">
        <span class="truncate">Library</span>
      </router-link>
    </nav>

    <div class="p-4 border-t border-slate-700">
      <div class="flex items-center">
        <div class="ml-3">
          <p class="text-xs font-medium text-slate-400 group-hover:text-white">System Status</p>
          <p class="text-xs text-green-400">● Online</p>
        </div>
      </div>
    </div>
  </aside>
</template>
