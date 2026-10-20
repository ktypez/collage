import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	server: {
		allowedHosts: ['paseo.mcky.space']
	},
	plugins: [
		sveltekit({
			compilerOptions: {
				// force runes mode outside node_modules
				runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
			},
			// the whole app (UI + /api) ships as one Vercel project
			adapter: adapter()
		})
	]
});