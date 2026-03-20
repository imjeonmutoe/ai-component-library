import type { Config } from 'tailwindcss';
import sharedConfig from '@ai-lib/tailwind-config';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [sharedConfig],
};

export default config;