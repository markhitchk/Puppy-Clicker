import {defineConfig,devices} from '@playwright/test';
import base from './playwright.config.js';
export default defineConfig({...base,testIgnore:[],testMatch:'**/safari-touch.spec.js',use:{...base.use,...devices['iPhone 14'],browserName:'webkit',launchOptions:{}}});
