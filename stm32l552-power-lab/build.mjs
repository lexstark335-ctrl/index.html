import fs from 'node:fs/promises';
const template=await fs.readFile(new URL('./src/index.template.html',import.meta.url),'utf8');
const app=await fs.readFile(new URL('./src/app.js',import.meta.url),'utf8');
const database=JSON.parse(await fs.readFile(new URL('./data/power-database.json',import.meta.url),'utf8'));
const embedded=JSON.stringify(database).replaceAll('</','<\\/');
const html=template.replace('__DATA__',embedded).replace('__APP__',app);
await fs.writeFile(new URL('./index.html',import.meta.url),html);
console.log(`Built index.html: ${database.rows.length} records, ${Object.keys(database.conditions).length} conditions`);
