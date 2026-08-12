import { defineConfig } from 'vite'
import { appConfig } from '@shaked/vite-preset'

export default defineConfig(appConfig({ base: '/shaked/cv/' }))
