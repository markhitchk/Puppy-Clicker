import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
const fromHere=path=>fileURLToPath(new URL(path,import.meta.url));
export default defineConfig(({command})=>({
 plugins:[react()],
 define:{global:"globalThis","process.env":"{}"},
 resolve:{
  alias:[
   {find:/^react-native$/,replacement:fromHere("./src/native/webCompat.js")},
   {find:/^react-native-safe-area-context$/,replacement:fromHere("./src/native/webSafeArea.jsx")},
   {find:/^@react-native-async-storage\/async-storage$/,replacement:fromHere("./src/native/webStorage.js")},
   ...(command==="serve"&&process.env.PUPPY_E2E_FIXTURE==="1"?[
     {find:/^(?:\.\.\/)+supabase\.js$/,replacement:fromHere("./e2e/fixtures/mock-supabase.js")}
   ]:[])
  ]
 },
 server:{host:true}
}));
