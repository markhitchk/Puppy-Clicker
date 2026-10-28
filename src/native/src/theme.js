import {effectiveMotion,paletteFor,scaleStyles,uiScaleFactor} from './engine/settings.js';
// One app surface. Existing scenes share this palette and rebuild their style
// dictionaries only when appearance changes, never on animation frames.
const webPalette=preferences=>{
 const accent=(!preferences.accentHex||preferences.accentHex.toUpperCase()==='#00B8F0')?'#00E5FF':preferences.accentHex;
 // Default to the supplied dark design while retaining explicit accessibility preferences.
 const base=paletteFor({...preferences,accentHex:accent,themeMode:preferences.themeMode==='light'?'light':'dark'},true);
 if(!base.dark)return base;
 const high=preferences.highContrast===true;
 return {...base,bg:'#0A0C12',surface:'#12151F',card:high?'#252D3D':'#1A1E2B',line:high?'#A0BDD0':'rgba(0,229,255,0.25)',text:'#FFFFFF',muted:high?'#E7EDF1':'#A0A8C0',gold:'#FFD166',green:'#34D399'};
};
export const colors=webPalette({});
export const interaction={buttons:true};
let revision=0,scale=1,signature='';
export function applyAppearance(preferences,systemDark){
 interaction.buttons=effectiveMotion(preferences).buttons;
 const palette=webPalette(preferences),nextScale=uiScaleFactor(preferences);
 const next=JSON.stringify([palette,nextScale]);
 if(next!==signature){Object.assign(colors,palette);scale=nextScale;signature=next;revision++;}
 return palette;
}
export function themedStyles(factory){
 let version=-1,cache;
 return new Proxy({}, {get(_target,key){if(version!==revision){cache=scaleStyles(factory(),scale);version=revision;}return cache[key];}});
}
