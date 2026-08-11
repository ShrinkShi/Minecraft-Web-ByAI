import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir:'./tests/e2e',
  timeout:90_000,
  expect:{timeout:15_000},
  fullyParallel:false,
  workers:1,
  retries:process.env.CI?1:0,
  reporter:process.env.CI?[['line'],['html',{open:'never'}]]:'list',
  use:{
    baseURL:'http://127.0.0.1:4173',
    headless:true,
    viewport:{width:1280,height:720},
    trace:'retain-on-failure',
    screenshot:'only-on-failure',
    video:'off',
    launchOptions:{args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']}
  },
  projects:[{name:'chromium',use:{browserName:'chromium'}}],
  webServer:{
    command:'node scripts/serve.mjs',
    url:'http://127.0.0.1:4173',
    reuseExistingServer:!process.env.CI,
    timeout:15_000
  }
});
