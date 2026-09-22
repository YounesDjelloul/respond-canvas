import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import './style.css'
import App from './App.vue'
import { queryClient } from './app/query-client'
import { reportApplicationError } from './app/report-application-error'
import { router } from './app/router'

const app = createApp(App)

app.config.errorHandler = (error, _instance, info) => {
  reportApplicationError(error, `vue:${info}`)
}

window.addEventListener('unhandledrejection', (event) => {
  reportApplicationError(event.reason, 'unhandled-promise')
})

app.use(createPinia())
app.use(router)
app.use(VueQueryPlugin, { queryClient })

app.mount('#app')
