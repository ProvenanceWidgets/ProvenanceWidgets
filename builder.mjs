import concat from 'concat'
import fs from 'fs/promises'

concat(
    [
        './dist/web-components/runtime.js',
        './dist/web-components/polyfills.js',
        './dist/web-components/main.js'
    ], 
    './dist/web-components/index.js'
).then(() => 
    fs.cp('./dist/web-components', './dist/provenance-widgets/web-components', { recursive: true })
)