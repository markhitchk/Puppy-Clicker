import React from 'react';
import {NativeModules} from 'react-native';
import PuppyStartupScreen from './PuppyStartupScreen.jsx';
import {publicStartupIssue} from './startupErrors.js';

// React render failures are recoverable only by remounting the UI. This boundary
// must not touch encrypted saves, reset identities or upload diagnostics.
export default class PuppyErrorBoundary extends React.Component {
 constructor(props){super(props);this.state={failed:false,retryIndex:0};}
 static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(error){
  // Diagnostic stack is exposed only when running the local Playwright fixture.
  if(typeof window!=="undefined"&&window.location.hostname==="127.0.0.1")
   console.error("PUPPY_E2E_RENDER_FAILURE",error?.stack||String(error));
  // A safe local marker, not a stack trace, is best effort; never block UI.
  try{Promise.resolve(NativeModules.PuppyBetaAccount?.recordStartupCrash?.('PUPPY-CRASH-902')).catch(()=>{});}catch{}
 }
 retry=()=>{
  // Do not wipe PupEye sessions or local settings on errors.
  // Clear only the operational crash marker after an explicit retry.
  try{
   Promise.resolve(NativeModules.PuppyBetaAccount?.clearStartupCrash?.())
    .catch(()=>{})
    .finally(()=>this.setState(s=>({failed:false,retryIndex:s.retryIndex+1})));
  }catch{this.setState(s=>({failed:false,retryIndex:s.retryIndex+1}));}
 };
 render(){
  if(this.state.failed)return <PuppyStartupScreen phase="crash" issue={publicStartupIssue('PUPPY-CRASH-902')} retry={this.retry}/>;
  return <React.Fragment key={this.state.retryIndex}>{this.props.children}</React.Fragment>;
 }
}
