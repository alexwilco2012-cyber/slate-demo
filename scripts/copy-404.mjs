// GitHub Pages has no SPA fallback: serving index.html as 404.html lets deep
// links like /slate-demo/landlord/jobs load the app instead of a 404 page.
import { copyFileSync } from 'node:fs'
copyFileSync('dist/index.html', 'dist/404.html')
