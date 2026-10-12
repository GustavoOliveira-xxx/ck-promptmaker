import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/e2e',fullyParallel:false,workers:1,retries:process.env.CI?1:0,
 reporter:[['list'],['html',{open:'never'}]],
 use:{baseURL:'http://127.0.0.1:4173',trace:'retain-on-failure',screenshot:'only-on-failure',launchOptions:{args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream'],...(process.env.CK_BROWSER?{executablePath:process.env.CK_BROWSER}:{})}},
 webServer:{command:'node scripts/serve.mjs --dist',url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI},
 projects:[{name:'mobile-chromium',use:{...devices['Pixel 7']}}]
});

