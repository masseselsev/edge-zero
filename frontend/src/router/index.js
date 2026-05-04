import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import Inventory from '../views/Inventory.vue'
import BoxDetails from '../views/BoxDetails.vue'
import Library from '../views/Library.vue'
import InitScripts from '../views/InitScripts.vue'
import Login from '../views/Login.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/login',
            name: 'login',
            component: Login,
            meta: { requiresAuth: false }
        },
        {
            path: '/',
            name: 'dashboard',
            component: Dashboard,
            meta: { requiresAuth: true }
        },
        {
            path: '/inventory',
            name: 'inventory',
            component: Inventory,
            meta: { requiresAuth: true }
        },
        {
            path: '/inventory/:id',
            name: 'box-details',
            component: BoxDetails,
            meta: { requiresAuth: true }
        },
        {
            path: '/library',
            name: 'library',
            component: Library,
            meta: { requiresAuth: true }
        },
        {
            path: '/settings',
            name: 'settings',
            component: () => import('../views/Settings.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/scripts',
            name: 'scripts',
            component: InitScripts,
            meta: { requiresAuth: true }
        },
        {
            path: '/:pathMatch(.*)*',
            redirect: '/'
        }
    ]
})

router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('token')
    if (to.meta.requiresAuth && !token) {
        next({ name: 'login' })
    } else if (to.name === 'login' && token) {
        next({ name: 'dashboard' })
    } else {
        next()
    }
})

export default router
