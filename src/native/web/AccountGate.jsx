import React,{createContext,useContext,useEffect,useState} from "react";
import {View,Text,TextInput,Pressable,Image,ActivityIndicator} from "react-native";
import {client} from "../../supabase.js";
import {beginPuppyDiscord,completePuppyDiscordCallback,hasPuppyDiscordCallback,
 clearPendingDiscord,verifyPuppySession,signInPupUsername} from "./puppyOAuth.js";

const C=createContext(null);
export const useWebAccount=()=>useContext(C);
const action={backgroundColor:"#00b8f0",padding:15,borderRadius:13,alignItems:"center",marginTop:10};
const text={color:"#f5fcff",fontSize:14};

export default function WebAccountGate({children}){
 const [user,setUser]=useState(null),[pupAccount,setPupAccount]=useState(null);
 const [loading,setLoading]=useState(true),[login,setLogin]=useState(""),[password,setPassword]=useState("");
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 useEffect(()=>{
  let alive=true;
  const verify=async()=>{
   if(!client){if(alive){setLoading(false);setError("Puppy account service is unavailable.");}return;}
   try{
    const result=await client.auth.getUser();
    if(result.error||!result.data?.user){
     if(alive){setUser(null);setPupAccount(null);setLoading(false);}return;
    }
    // Supabase Auth also hosts users of other services. Only the verified Pup
    // Account server link can grant access to this game's website.
    const account=await verifyPuppySession(client);
    if(alive){setUser(result.data.user);setPupAccount(account);setLoading(false);setError("");}
   }catch(e){
    if(alive){setUser(null);setPupAccount(null);setLoading(false);
     setError("Could not verify a Puppy Clicker Pup Account. Use Puppy Discord or your Pup username.");}
   }
  };
  const {data}=client?.auth.onAuthStateChange(()=>{
   queueMicrotask(()=>{if(alive)void verify();});
  })||{};
  const start=async()=>{
   if(client&&hasPuppyDiscordCallback()){
    try{await completePuppyDiscordCallback(client);}
    catch(e){
     if(alive)setError(String(e?.message||"PUP_DISCORD_LOGIN_FAILED").replace(/_/g," "));
    }
   }
   if(alive)await verify();
  };
  void start();
  return()=>{alive=false;data?.subscription?.unsubscribe();};
 },[]);

 const loginDiscord=async()=>{
  if(!client||busy)return;
  setBusy(true);setError("");
  try{
   try{globalThis.sessionStorage?.setItem("puppy-web-discord-return-v1",
    globalThis.location?.pathname==="/account"?"/account":"/play");}catch{}
   const url=await beginPuppyDiscord();
   // Discord returns to /auth/discord/callback in this same browser on
   // Android, iOS, and desktop, never to the Android app's custom URI.
   window.location.assign(url);
  }catch(e){
   setError(String(e?.message||"PUP_DISCORD_AUTH_FAILED").replace(/_/g," "));
   setBusy(false);
  }
 };
 const loginPup=async()=>{
  if(!login.trim()||!password){setError("Enter your Pup username and password.");return;}
  setBusy(true);setError("");
  try{
   clearPendingDiscord();
   const account=await signInPupUsername(client,login.trim(),password);
   const {data}=await client.auth.getUser();
   if(data?.user){setUser(data.user);setPupAccount(account);}
  }catch(e){setError(e?.message==="PUP_SIGNIN_INVALID"?"Incorrect Pup username or password.":String(e?.message||"PUP_SIGNIN_FAILED").replace(/_/g," "));}
  finally{setBusy(false);setPassword("");}
 };
 if(loading)return <View style={{flex:1,justifyContent:"center",alignItems:"center",backgroundColor:"#0d1e29",gap:12}}>
  <ActivityIndicator color="#00b8f0" size="large"/><Text style={text}>Verifying Pup Account…</Text>
 </View>;
 if(!user||!pupAccount)return <View style={{flex:1,backgroundColor:"#0d1e29",alignItems:"center",justifyContent:"center",padding:20}}>
  <View style={{backgroundColor:"#19313e",padding:28,borderRadius:24,maxWidth:460,width:"100%",gap:13}}>
   <Image source={{uri:"/assets/logos/puppy_clicker.png"}} resizeMode="contain" style={{height:95,width:120,alignSelf:"center"}}/>
   <Text style={{fontSize:27,fontWeight:"900",color:"#fff",textAlign:"center"}}>🐶 Puppy Clicker · Pup Account</Text>
   <Text style={{...text,color:"#bcd1df",textAlign:"center"}}>Sign in using your existing Pup Account. Discord returns to this website after authorization.</Text>
   <Pressable accessibilityRole="button" disabled={busy||!client} onPress={loginDiscord} style={action}>
    <Text style={{fontWeight:"900",color:"#001622"}}>{busy?"Opening Discord…":"Continue with Puppy Clicker Discord"}</Text>
   </Pressable>
   <Text style={{...text,textAlign:"center"}}>Or sign in with your Pup username</Text>
   <TextInput accessibilityLabel="Pup username" placeholder="Pup Account username" placeholderTextColor="#8fa2ad" autoCapitalize="none"
     value={login} onChangeText={setLogin} style={{backgroundColor:"#0d1e29",color:"#fff",padding:12,borderRadius:10}}/>
   <TextInput accessibilityLabel="Pup password" placeholder="Password" placeholderTextColor="#8fa2ad" secureTextEntry value={password} onChangeText={setPassword}
     style={{backgroundColor:"#0d1e29",color:"#fff",padding:12,borderRadius:10}}/>
   <Pressable accessibilityRole="button" disabled={busy||!client} onPress={loginPup} style={action}>
    <Text style={{fontWeight:"900",color:"#001622"}}>{busy?"Verifying…":"Sign in to Pup Account"}</Text>
   </Pressable>
   {!!error&&<Text accessibilityRole="alert" style={{color:"#ffb4ad"}}>{error}</Text>}
   <Text style={{...text,fontSize:11,color:"#adc1ce"}}>Discord returns to the website. Your Pup Account identity and protected cloud progress are verified before gameplay.</Text>
  </View>
 </View>;
 return <C.Provider value={{user,client,pupAccount,signOut:()=>client.auth.signOut()}}>{children}</C.Provider>;
}
