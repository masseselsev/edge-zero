import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import Inventory from '../views/Inventory.vue'
import BoxDetails from '../views/BoxDetails.vue'
import Library from '../views/Library.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'dashboard',
            component: Dashboard
        },
        {
            path: '/inventory',
            name: 'inventory',
            component: Inventory
        },
        {
            path: '/inventory/:id',
            name: 'box-details',
            component: BoxDetails
        },
        {
            path: '/library',
            name: 'library',
            component: Library
        },
        {
            path: '/settings',
            name: 'settings',
            component: () => import('../views/Settings.vue')
        }
    ]
})

export default router
