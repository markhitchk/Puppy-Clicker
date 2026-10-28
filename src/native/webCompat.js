export * from "react-native-web";
export const NativeModules={};
export const Vibration={vibrate:()=>{},cancel:()=>{}};
export const ToastAndroid={SHORT:0,LONG:1,show:()=>{}};
export const StatusBar=()=>null;
StatusBar.currentHeight=0;
export const requireNativeComponent=()=>()=>null;
export const BackHandler={addEventListener:()=>({remove:()=>{}}),exitApp:()=>{}};
export const Alert={alert:(title,message,buttons)=>{
 if(typeof window==="undefined")return;
 const info=[title,message].filter(Boolean).join("\n");
 if(!buttons?.length){window.alert(info);return;}
 const cancel=buttons.find(b=>b.style==="cancel"),choice=buttons.find(b=>b.style!=="cancel");
 if(!cancel){window.alert(info);choice?.onPress?.();return;}
 if(window.confirm(info))choice?.onPress?.();
}};
