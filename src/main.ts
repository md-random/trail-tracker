import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'leaflet/dist/leaflet.css'
import App from './App.vue'
import './index.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
