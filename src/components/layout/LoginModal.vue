<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="emit('close')">
      <div class="modal-content glass animate-scale-in">
        <div class="modal-header">
          <h3>🔒 Supabase Admin Login</h3>
          <button class="btn-close" @click="emit('close')">✕</button>
        </div>

        <form @submit.prevent="handleLogin" class="modal-form">
          <div class="modal-body">
            <p class="modal-hint">
              Enter your Supabase administrator email and password.
            </p>

            <div class="form-group">
              <label for="email">Admin Email</label>
              <input
                id="email"
                v-model="email"
                type="email"
                required
                placeholder="admin@example.com"
                ref="emailInput"
              />
            </div>

            <div class="form-group">
              <label for="password">Password</label>
              <input
                id="password"
                v-model="password"
                type="password"
                required
                placeholder="••••••••"
                ref="passwordInput"
              />
            </div>

            <div v-if="store.authError" class="auth-error animate-fade-in">
              ⚠️ {{ store.authError }}
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="emit('close')">Cancel</button>
            <button type="submit" class="btn-primary" :disabled="loading">
              {{ loading ? 'Connecting...' : 'Connect' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePhotoStore } from '@/stores/photoStore'

const emit = defineEmits<{
  close: []
  success: []
}>()

const store = usePhotoStore()

const email = ref('')
const password = ref('')
const loading = ref(false)

const emailInput = ref<HTMLInputElement | null>(null)

onMounted(() => {
  emailInput.value?.focus()
})

const handleLogin = async (): Promise<void> => {
  loading.value = true
  const success = await store.login(email.value, password.value)
  loading.value = false
  if (success) {
    emit('success')
    emit('close')
  }
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-content {
  width: 100%;
  max-width: 400px;
  background: rgba(15, 15, 15, 0.85) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 16px !important;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5) !important;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 0.5px solid rgba(255, 255, 255, 0.08);
}

.modal-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #fff;
}

.btn-close {
  background: rgba(255, 255, 255, 0.05);
  border: 0.5px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.modal-form {
  display: flex;
  flex-direction: column;
}

.modal-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.modal-hint {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.4;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-group label {
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.form-group input {
  background: rgba(255, 255, 255, 0.05);
  border: 0.5px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 0.65rem 0.75rem;
  border-radius: 8px;
  font-size: 0.9rem;
  outline: none;
  transition: all 0.2s;
}

.form-group input:focus {
  border-color: hsl(var(--primary-color) / 0.5);
  background: rgba(255, 255, 255, 0.08);
}

.auth-error {
  font-size: 0.8rem;
  color: hsl(var(--danger));
  background: rgba(235, 87, 87, 0.1);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: 1px solid rgba(235, 87, 87, 0.2);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-top: 0.5px solid rgba(255, 255, 255, 0.08);
}

.modal-footer button {
  padding: 0.5rem 1.25rem;
  font-size: 0.85rem;
}
</style>
