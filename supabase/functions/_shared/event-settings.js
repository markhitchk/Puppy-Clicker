export const EVENT_SETTINGS=Object.freeze([
 {id:'all_events',name:'All seasonal and special events',description:'Master switch for registered event gameplay.'},
 {id:'christmas_2026',name:'Christmas 2026',description:'Santa Paws Advent Calendar and Christmas event access.'},
 {id:'winter_effects',name:'Winter effects',description:'Sitewide snow and holiday decorations.'}
]);
export const isEventSetting=id=>EVENT_SETTINGS.some(event=>event.id===id);
export function normalizeEventSettings(value){
 const result={};for(const event of EVENT_SETTINGS){if(typeof value?.[event.id]!=='boolean')return null;result[event.id]=value[event.id];}return result;
}
export const christmasEnabled=settings=>settings?.all_events===true&&settings?.christmas_2026===true;
export const winterEnabled=settings=>settings?.all_events===true&&settings?.winter_effects===true;
