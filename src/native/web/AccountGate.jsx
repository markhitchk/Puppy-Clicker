import React,{createContext,useContext,useEffect,useState} from "react";
import {View,Text,TextInput,Pressable,Image,ActivityIndicator} from "react-native";
import {client} from "../../supabase.js";
import WebRegister from "../../WebRegister.jsx";
import {beginPuppyDiscord,completePuppyDiscordCallback,hasPuppyDiscordCallback,
 clearPendingDiscord,verifyPuppySession,signInPupUsername,puppyAuthMessage} from "./puppyOAuth.js";

const C=createContext(null);
export const useWebAccount=()=>useContext(C);
const action={backgroundColor:"#00b8f0",padding:15,borderRadius:13,alignItems:"center",marginTop:10};
const text={color:"#f5fcff",fontSize:14};

export default function WebAccountGate({children}){
 const recovery=globalThis.location?.pathname==="/recovery";
 const [user,setUser]=useState(null),[pupAccount,setPupAccount]=useState(null);
 const [loading,setLoading]=useState(true),[login,setLogin]=useState(""),[password,setPassword]=useState("");
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const [mode,setMode]=useState(()=>(
  globalThis.location?.pathname==="/register"||
  new URLSearchParams(globalThis.location?.search||"").get("mode")==="register"
 )?"register":"signin");
 const chooseMode=next=>{
  if(busy||recovery)return;
  setError("");setPassword("");setMode(next);
 };
 const [callbackFailed,setCallbackFailed]=useState(false);
 useEffect(()=>{
  let alive=true,starting=true,verification=0;
  const verify=async()=>{
   const request=++verification;
   if(!client){if(alive){setLoading(false);setError("Puppy account service is unavailable.");}return;}
   try{
    const result=await client.auth.getUser();
    if(result.error||!result.data?.user){
     if(alive&&request===verification){setUser(null);setPupAccount(null);setLoading(false);}return;
    }
    // Supabase Auth also hosts users of other services. Only the verified Pup
    // Account server link can grant access to this game's website.
    const account=await verifyPuppySession(client);
    if(alive&&request===verification){setUser(result.data.user);setPupAccount(account);setLoading(false);setError("");}
   }catch(e){
    if(alive&&request===verification){setUser(null);setPupAccount(null);setLoading(false);
     setError(puppyAuthMessage(e));}
   }
  };
  const {data}=client?.auth.onAuthStateChange(()=>{
   setTimeout(()=>{if(alive&&!starting)void verify();},0);
  })||{};
  const start=async()=>{
   if(client&&hasPuppyDiscordCallback()){
    try{await completePuppyDiscordCallback(client);}
    catch(e){
     if(alive){setError(puppyAuthMessage(e));setCallbackFailed(true);setLoading(false);}
     return;
    }
   }
   if(alive){starting=false;await verify();}
  };
  void start();
  return()=>{alive=false;data?.subscription?.unsubscribe();};
 },[]);

 const loginDiscord=async()=>{
  if(!client||busy)return;
  setBusy(true);setError("");
  try{
   try{globalThis.sessionStorage?.setItem("puppy-web-discord-return-v1",
    recovery?"/recovery":globalThis.location?.pathname==="/account"?"/account":"/play");}catch{}
   const url=await beginPuppyDiscord();
   // Discord returns to /auth/discord/callback in this same browser on
   // Android, iOS, and desktop, never to the Android app's custom URI.
   window.location.assign(url);
  }catch(e){
   setError(puppyAuthMessage(e));
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
  }catch(e){setError(puppyAuthMessage(e));}
  finally{setBusy(false);setPassword("");}
 };
 if(callbackFailed)return <View style={{padding:28,backgroundColor:'#19313e',gap:16}}>
  <Text accessibilityRole="header" style={{...text,fontSize:24}}>Pup Account sign-in could not complete</Text>
  <Text accessibilityRole="alert" style={text}>{error}</Text>
  <a href="/play" style={{color:'#8ce9ff'}}>Return to sign-in</a>
  <a href="/recovery" style={{color:'#8ce9ff'}}>Account recovery</a>
 </View>;
 if(loading)return <View style={{flex:1,justifyContent:"center",alignItems:"center",backgroundColor:"#0d1e29",gap:12}}>
  <ActivityIndicator color="#00b8f0" size="large"/><Text style={text}>Verifying Pup Account…</Text>
 </View>;
 if(!user||!pupAccount)return <View style={{flex:1,backgroundColor:"#0d1e29",alignItems:"center",justifyContent:"center",padding:20}}>
  <View style={{backgroundColor:"#19313e",padding:28,borderRadius:24,maxWidth:500,width:"100%",gap:13,borderWidth:1,borderColor:"#315466"}}>
   <Image source={{uri:"/assets/logos/puppy_clicker.png"}} resizeMode="contain" style={{height:85,width:110,alignSelf:"center"}}/>
   <Text accessibilityRole="header" style={{fontSize:27,fontWeight:"900",color:"#fff",textAlign:"center"}}>{recovery?"🔐 Pup Account Recovery":"🐶 Puppy Clicker · Pup Account"}</Text>
   {!recovery?<View style={{flexDirection:"row",backgroundColor:"#0d1e29",borderRadius:14,padding:4,gap:5}} accessibilityRole="tablist">
    <Pressable accessibilityRole="tab" accessibilityState={{selected:mode==="signin"}}
     disabled={busy} onPress={()=>chooseMode("signin")}
     style={{flex:1,paddingVertical:13,borderRadius:11,backgroundColor:mode==="signin"?"#00b8f0":"transparent",alignItems:"center"}}>
     <Text style={{fontWeight:"900",color:mode==="signin"?"#001622":"#bcd1df"}}>Sign In</Text>
    </Pressable>
    <Pressable accessibilityRole="tab" accessibilityState={{selected:mode==="register"}}
     disabled={busy} onPress={()=>chooseMode("register")}
     style={{flex:1,paddingVertical:13,borderRadius:11,backgroundColor:mode==="register"?"#00b8f0":"transparent",alignItems:"center"}}>
     <Text style={{fontWeight:"900",color:mode==="register"?"#001622":"#bcd1df"}}>Create Account</Text>
    </Pressable>
   </View>:null}
   {(mode==="signin"||recovery)?<>
    <Text style={{...text,color:"#bcd1df",textAlign:"center"}}>{recovery
     ?"Use the Discord account already linked to your Pup Account. Ownership is verified before recovery."
     :"Sign in with your existing Pup Account. Discord returns to this website after authorization."}</Text>
    <Pressable accessibilityRole="button" disabled={busy||!client} onPress={loginDiscord} style={action}>
     <Text style={{fontWeight:"900",color:"#001622"}}>{busy?"Opening Discord…":recovery?"Recover with linked Discord":"Continue with Puppy Clicker Discord"}</Text>
    </Pressable>
    <Text style={{...text,textAlign:"center"}}>Or sign in with your Pup username</Text>
    <TextInput accessibilityLabel="Pup username" autoComplete="username" placeholder="Pup Account username"
     placeholderTextColor="#8fa2ad" autoCapitalize="none" value={login} onChangeText={setLogin}
     style={{backgroundColor:"#0d1e29",color:"#fff",padding:12,borderRadius:10}}/>
    <TextInput accessibilityLabel="Pup password" autoComplete="current-password" placeholder="Password"
     placeholderTextColor="#8fa2ad" secureTextEntry value={password} onChangeText={setPassword}
     style={{backgroundColor:"#0d1e29",color:"#fff",padding:12,borderRadius:10}}/>
    <Pressable accessibilityRole="button" disabled={busy||!client} onPress={loginPup} style={action}>
     <Text style={{fontWeight:"900",color:"#001622"}}>{busy?"Verifying…":"Sign in to Pup Account"}</Text>
    </Pressable>
    {!!error&&<Text accessibilityRole="alert" style={{color:"#ffb4ad"}}>{error}</Text>}
    {recovery?<Text style={{...text,fontSize:12,color:"#bbccdc",lineHeight:20}}>
     No access to Discord or your password? Use the Android app's Settings → Support or another official Puppy Clicker support channel. Support requires independent proof of ownership.
    </Text>:null}
    <a href={recovery?"/account":"/recovery"} style={{color:"#8ce9ff",fontSize:14,fontWeight:800,textAlign:"center",padding:7}}>
     {recovery?"← Back to Pup Account sign-in":"Forgot your username or password? Recover account"}
    </a>
    <Text style={{...text,fontSize:11,color:"#adc1ce"}}>Pup Account verification protects your identity and cloud progress on web and Android.</Text>
   </>:<WebRegister onAuthenticated={(newUser,account)=>{
    setUser(newUser);setPupAccount(account);setError("");
    if(globalThis.location?.pathname==="/register")
     globalThis.history?.replaceState?.(globalThis.history.state,"","/account");
   }} onSignIn={()=>chooseMode("signin")}/>}
  </View>
 </View>;
 return <C.Provider value={{user,client,pupAccount,signOut:()=>client.auth.signOut()}}>{children}</C.Provider>;
}
