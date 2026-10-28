
import React, {createContext,useContext,useEffect,useState} from "react";
import {View,Text,TextInput,Pressable,Image,ActivityIndicator} from "react-native";
import {client} from "../../supabase.js";
const C=createContext(null);
export const useWebAccount=()=>useContext(C);
const action={backgroundColor:"#00b8f0",padding:15,borderRadius:13,alignItems:"center",marginTop:10};
const text={color:"#f5fcff",fontSize:14};
export default function WebAccountGate({children}){
 const [user,setUser]=useState(null),[loading,setLoading]=useState(true);
 const [email,setEmail]=useState(""),[password,setPassword]=useState("");
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 useEffect(()=>{
  let alive=true;
  const verify=async()=>{
   if(!client){if(alive){setLoading(false);setError("Website account service is not configured.");}return;}
   try{
    const result=await client.auth.getUser();
    if(alive){setUser(result.error?null:result.data?.user||null);setLoading(false);}
   }catch{if(alive){setUser(null);setLoading(false);setError("Could not check your account. Retry signing in.");}}
  };
  const {data}=client?.auth.onAuthStateChange(()=>{void verify();})||{};
  void verify();
  return()=>{alive=false;data?.subscription?.unsubscribe();};
 },[]);
 const loginDiscord=async()=>{
  if(!client)return;setBusy(true);setError("");
  try{
   const {error:e}=await client.auth.signInWithOAuth({provider:"discord",
    options:{redirectTo:window.location.origin+window.location.pathname}});
   if(e)throw e;
  }catch{setError("Discord sign-in could not start. Try again.");}finally{setBusy(false);}
 };
 const loginEmail=async()=>{
  if(!email.trim()||!password){setError("Enter email and password.");return;}
  setBusy(true);setError("");
  try{
   const {error:e}=await client.auth.signInWithPassword({email:email.trim(),password});
   if(e)throw e;
  }catch{setError("Email/password sign-in failed. Check your credentials.");}finally{setBusy(false);setPassword("");}
 };
 if(loading)return <View style={{flex:1,justifyContent:"center",alignItems:"center",backgroundColor:"#0d1e29",gap:12}}>
  <ActivityIndicator color="#00b8f0" size="large"/><Text style={text}>Checking Puppy Clicker account…</Text>
 </View>;
 if(!user)return <View style={{flex:1,backgroundColor:"#0d1e29",alignItems:"center",justifyContent:"center",padding:20}}>
  <View style={{backgroundColor:"#19313e",padding:28,borderRadius:24,maxWidth:460,width:"100%",gap:13}}>
   <Image source={{uri:"/assets/logos/puppy_clicker.png"}} resizeMode="contain" style={{height:95,width:120,alignSelf:"center"}}/>
   <Text style={{fontSize:27,fontWeight:"900",color:"#fff",textAlign:"center"}}>🐶 Puppy Clicker</Text>
   <Text style={{...text,color:"#bcd1df",textAlign:"center"}}>Sign in to play the full React Native Web interface. No guest gameplay or local guest save is created.</Text>
   <Pressable accessibilityRole="button" disabled={busy||!client} onPress={loginDiscord} style={action}>
    <Text style={{fontWeight:"900",color:"#001622"}}>Continue with Discord</Text>
   </Pressable>
   <Text style={{...text,textAlign:"center"}}>Or sign in with your account email</Text>
   <TextInput accessibilityLabel="Account email" placeholder="Email" placeholderTextColor="#8fa2ad" autoComplete="email" autoCapitalize="none" keyboardType="email-address"
     value={email} onChangeText={setEmail} style={{backgroundColor:"#0d1e29",color:"#fff",padding:12,borderRadius:10}}/>
   <TextInput accessibilityLabel="Account password" placeholder="Password" placeholderTextColor="#8fa2ad" secureTextEntry value={password} onChangeText={setPassword}
     style={{backgroundColor:"#0d1e29",color:"#fff",padding:12,borderRadius:10}}/>
   <Pressable accessibilityRole="button" disabled={busy||!client} onPress={loginEmail} style={action}>
    <Text style={{fontWeight:"900",color:"#001622"}}>{busy?"Signing in…":"Sign in"}</Text>
   </Pressable>
   {!!error&&<Text accessibilityRole="alert" style={{color:"#ffb4ad"}}>{error}</Text>}
   <Text style={{...text,fontSize:11,color:"#adc1ce"}}>Browser saves remain separate from the Android PupEye signed save. Existing Android progress will not be overwritten.</Text>
  </View>
 </View>;
 return <C.Provider value={{user,client,signOut:()=>client.auth.signOut()}}>{children}</C.Provider>;
}
