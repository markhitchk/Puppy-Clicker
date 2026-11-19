import React,{useEffect,useState} from "react";

// Keep a native password input for browser autofill and password managers.
// Changing visibility never changes the input's name, value, or autocomplete.
export default function PasswordField({id,visibilityLabel="password",value,disabled=false,...inputProps}){
 const [visible,setVisible]=useState(false);
 useEffect(()=>{if(value==="")setVisible(false);},[value]);
 return <div className="pup-password-field">
  <input {...inputProps} id={id} type={visible?"text":"password"} value={value} disabled={disabled}/>
  <button type="button" className="pup-password-visibility" disabled={disabled}
   aria-controls={id} aria-pressed={visible}
   aria-label={(visible?"Hide ":"Show ")+visibilityLabel}
   onClick={()=>setVisible(current=>!current)}>
   <span aria-hidden="true">{visible?"🙈":"👁️"}</span>
   <span>{visible?"Hide":"Show"}</span>
  </button>
 </div>;
}
