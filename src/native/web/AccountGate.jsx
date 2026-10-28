import React,{createContext,useContext,useEffect,useRef,useState} from "react";
import {View,Text,TextInput,Pressable,Image,ActivityIndicator} from "react-native";
import {client} from "../../supabase.js";
import {beginPuppyDiscord,finishPuppyDiscord,hasPuppyDiscordCallback,
 verifyPuppySession,signInPupUsername} from "./puppyOAuth.js";

const C=createContext(null);
export const useWebAccount=()=>useContext(C);
const action={backgroundColor:"#00b8f0",padding:15,borderRadius:13,alignItems:"center",marginTop:10};
const text={color:"#f5fcff",fontSize:14};
export default function WebAccountGate({children}){
 const [user,setUser]=useState(null),[pupAccount,setPupAccount]=useState(null);
 const callbackPending=useRef(hasPuppyDiscordCallback());
 const callbackFailed=useRef(false);
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
    // Supabase's auth.users table is shared with ARC Raiders. A generic
    // Supabase user is NEVER enough to enter this game.
    const account=await verifyPuppySession(client);
    if(alive){setUser(result.data.user);setPupAccount(account);setLoading(false);setError("");}
   }catch(e){
    if(alive){
     setUser(null);setPupAccount(null);setLoading(false);
     setError(String(e?.message||"PUP_ACCOUNT_SESSION_REQUIRED").includes("PUP_ACCOUNT_SESSION_REQUIRED")
      ?"This is not a verified Puppy Clicker account. Sign in with the Puppy Clicker Discord authorization.":"Could not verify your Pup Account. Retry sign-in.");
    }
   }
  };
  const {data}=client?.auth.onAuthStateChange((_event,_session)=>{
   // A pending OAuth callback must finish state/PKCE verification before
   // any existing Supabase session (including ARC) is allowed into the game.
   if(callbackPending.current||callbackFailed.current)return;
   queueMicrotask(()=>{if(alive&&!callbackPending.current&&!callbackFailed.current)void verify();});
  })||{};
  (async()=>{
   const callback=hasPuppyDiscordCallback();
   try{
    if(client&&callback)await finishPuppyDiscord(client);
    callbackPending.current=false;
    if(alive)await verify();
   }catch(e){
    // Failed state/PKCE verification cannot retain a previous game session.
    callbackPending.current=false;
    if(callback){callbackFailed.current=true;await client?.auth.signOut().catch(()=>{});}
    if(alive){setUser(null);setPupAccount(null);setLoading(false);
     setError(String(e?.message||"PUP_DISCORD_AUTH_FAILED").replace(/_/g," "));}
   }
  })();
  return()=>{alive=false;data?.subscription?.unsubscribe();};
 },[]);
 const loginDiscord=async()=>{
  if(!client)return;setBusy(true);setError("");
  try{await beginPuppyDiscord();}
  catch(e){setError(String(e?.message||"PUP_DISCORD_AUTH_FAILED").replace(/_/g," "));setBusy(false);}
 };
 const loginPup=async()=>{
  if(!login.trim()||!password){setError("Enter your Pup username and password.");return;}
  setBusy(true);setError("");
  try{
   callbackFailed.current=false;
   const account=await signInPupUsername(client,login.trim(),password);
   const {data}=await client.auth.getUser();
   if(data?.user){setUser(data.user);setPupAccount(account);}
  }catch(e){
   setError(e?.message==="PUP_SIGNIN_INVALID"?"Incorrect Pup username or password.":String(e?.message||"PUP_SIGNIN_FAILED").replace(/_/g," "));
  }finally{setBusy(false);setPassword("");}
 };
 if(loading)return <View style={{flex:1,justifyContent:"center",alignItems:"center",backgroundColor:"#0d1e29",gap:12}}>
  <ActivityIndicator color="#00b8f0" size="large"/><Text style={text}>Verifying Pup Account…</Text>
 </View>;
 if(!user||!pupAccount)return <View style={{flex:1,backgroundColor:"#0d1e29",alignItems:"center",justifyContent:"center",padding:20}}>
  <View style={{backgroundColor:"#19313e",padding:28,borderRadius:24,maxWidth:460,width:"100%",gap:13}}>
   <Image source={{uri:"/assets/logos/puppy_clicker.png"}} resizeMode="contain" style={{height:95,width:120,alignSelf:"center"}}/>
   <Text style={{fontSize:27,fontWeight:"900",color:"#fff",textAlign:"center"}}>🐶 Puppy Clicker · Pup Account</Text>
   <Text style={{...text,color:"#bcd1df",textAlign:"center"}}>Sign in with your existing Pup Account. Discord opens the Puppy Clicker authorization—not ARC Raiders Ranked.</Text>
   <Pressable accessibilityRole="button" disabled={busy||!client} onPress={loginDiscord} style={action}>
    <Text style={{fontWeight:"900",color:"#001622"}}>Continue with Puppy Clicker Discord</Text>
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
   <Text style={{...text,fontSize:11,color:"#adc1ce"}}>Existing Pup Accounts only. Android's signed PupEye progression and device identity remain protected. Website saves remain separate.</Text>
  </View>
 </View>;
 return <C.Provider value={{user,client,pupAccount,signOut:()=>client.auth.signOut()}}>{children}</C.Provider>;
}
