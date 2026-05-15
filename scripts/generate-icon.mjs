import pngToIco from 'png-to-ico'
import { writeFileSync } from 'fs'

const buf = await pngToIco('resources/icon.png')
writeFileSync('resources/icon.ico', buf)
console.log('icon.ico generated:', buf.length, 'bytes')
