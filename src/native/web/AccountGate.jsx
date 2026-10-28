import React,{createContext,useContext,useEffect,useRef,useState} from "react";
import {View,Text,TextInput,Pressable,Image,ActivityIndicator} from "react-native";
import {client} from "../../supabase.js";
import {beginPuppyDiscord,checkPendingPuppyDiscord,getPendingDiscord,clearPendingDiscord,
 verifyPuppySession,signInPupUsername} from "./puppyOAuth.js";
const C=createContext(null);
export const useWebAccount=()=>useContext(C);
const action={backgroundColor:"#00b8f0",padding:15,borderRadius:13,alignItems:"center",marginTop:10};
const text={color:"#f5fcff",fontSize:14};
export default function WebAccountGate({children}){
 const [user,setUser]=useState(null),[pupAccount,setPupAccount]=useState(null);
 const [loading,setLoading]=useState(true),[login,setLogin]=useState(""),[password,setPassword]=useState("");
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const [loginUrl,setLoginUrl]=useState("");
 const [waiting,setWaiting]=useState(false),polling=useRef(false);
 useEffect(()=>{
  let alive=true;
  const verify=async()=>{
   if(!client){if(alive){setLoading(false);setError("Puppy account service is unavailable.");}return;}
   try{
    const result=await client.auth.getUser();
    if(result.error||!result.data?.user){
     if(alive){setUser(null);setPupAccount(null);setLoading(false);}return;
    }
    // Supabase Auth also stores ARC Raiders users. Only a verified Pup
    // Account server link can enter Puppy Clicker's actual game.
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
  void verify();
  if(getPendingDiscord())setWaiting(true);
  // The browser may be reopened by the Android app after Discord completes.
  // Poll only from the originating browser with its independent secret.
  const interval=setInterval(async()=>{
   if(!alive||!client||polling.current||!getPendingDiscord())return;
   polling.current=true;
   try{
    const result=await checkPendingPuppyDiscord(client);
    if(result.status==="complete"&&alive){
     setWaiting(false);setBusy(false);setLoginUrl("");await verify();
    }else if(alive)setWaiting(true);
   }catch(e){
    if(alive){clearPendingDiscord();setWaiting(false);setBusy(false);
     setError(String(e?.message||"PUP_DISCORD_LOGIN_FAILED").replace(/_/g," "));}
   }finally{polling.current=false;}
  },1700);
  return()=>{alive=false;clearInterval(interval);data?.subscription?.unsubscribe();};
 },[]);
 const loginDiscord=async()=>{
  if(!client||busy)return;setBusy(true);setError("");
  try{
   const url=await beginPuppyDiscord();
   setLoginUrl(url);setWaiting(true);
   setBusy(false);
   // Redirects of the form discord-...:/authorize/callback must be handled
   // by an installed UPDATED Puppy Clicker React Native Android app.
   if(/Android/i.test(navigator.userAgent))window.location.assign(url);
  }catch(e){
   setError(String(e?.message||"PUP_DISCORD_AUTH_FAILED").replace(/_/g," "));
   setBusy(false);
  }
 };
 const loginPup=async()=>{
  if(!login.trim()||!password){setError("Enter your Pup username and password.");return;}
  setBusy(true);setError("");
  try{
   clearPendingDiscord();setWaiting(false);setLoginUrl("");
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
   <Text style={{...text,color:"#bcd1df",textAlign:"center"}}>Sign in using your existing Pup Account. Discord uses only the Android application's registered redirect.</Text>
   <Pressable accessibilityRole="button" disabled={busy||!client||waiting} onPress={loginDiscord} style={action}>
    <Text style={{fontWeight:"900",color:"#001622"}}>{waiting?"Discord sign-in pending…":"Continue with Puppy Clicker Discord"}</Text>
   </Pressable>
   {waiting&&<View style={{gap:10,padding:10,backgroundColor:"#0d1e29",borderRadius:12}}>
    <ActivityIndicator color="#00b8f0"/>
    <Text style={{...text,textAlign:"center"}}>Authorize Discord on an Android phone with the updated Puppy Clicker app, then return to this browser. This sign-in expires in five minutes.</Text>
    {!!loginUrl&&!/Android/i.test(navigator.userAgent)&&<>
     <Text style={{...text,fontSize:12}}>On desktop, copy this Discord authorization link and open it on your Android phone:</Text>
     <TextInput accessibilityLabel="Puppy Discord mobile authorization link" selectable value={loginUrl} editable={false} style={{color:"#fff",backgroundColor:"#19313e",padding:10,borderRadius:8}}/>
     <Pressable accessibilityRole="button" style={action} onPress={()=>{void navigator.clipboard?.writeText(loginUrl).catch(()=>{});}}>
      <Text style={{...text,fontWeight:"800"}}>Copy sign-in link for Android</Text>
     </Pressable>
    </>}
    <Pressable accessibilityRole="button" onPress={()=>{clearPendingDiscord();setWaiting(false);setLoginUrl("");setError("");}}>
     <Text style={{...text,textAlign:"center",color:"#bcd1df"}}>Cancel sign-in</Text>
    </Pressable>
   </View>}
   <Text style={{...text,textAlign:"center"}}>Or sign in with your Pup username</Text>
   <TextInput accessibilityLabel="Pup username" placeholder="Pup Account username" placeholderTextColor="#8fa2ad" autoCapitalize="none"
     value={login} onChangeText={setLogin} style={{backgroundColor:"#0d1e29",color:"#fff",padding:12,borderRadius:10}}/>
   <TextInput accessibilityLabel="Pup password" placeholder="Password" placeholderTextColor="#8fa2ad" secureTextEntry value={password} onChangeText={setPassword}
     style={{backgroundColor:"#0d1e29",color:"#fff",padding:12,borderRadius:10}}/>
   <Pressable accessibilityRole="button" disabled={busy||!client} onPress={loginPup} style={action}>
    <Text style={{fontWeight:"900",color:"#001622"}}>{busy?"Verifying…":"Sign in to Pup Account"}</Text>
   </Pressable>
   {!!error&&<Text accessibilityRole="alert" style={{color:"#ffb4ad"}}>{error}</Text>}
   <Text style={{...text,fontSize:11,color:"#adc1ce"}}>Android app required for Discord login. Existing Pup Accounts only. Android PupEye saves stay protected and separate from website progress.</Text>
  </View>
 </View>;
 return <C.Provider value={{user,client,pupAccount,signOut:()=>client.auth.signOut()}}>{children}</C.Provider>;
}
