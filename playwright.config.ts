const { PlaywrightTestConfig } = require('@playwright/test');

const config: PlaywrightTestConfig = {
  use: {
    // Configure the browser type
    browserName: 'chromium',
    // Configure the launch options
    launchOptions: {
      headless: true,
    },
    // Configure the context options
    contextOptions: {
      acceptDownloads: true,
    },
  },
};

export default config;