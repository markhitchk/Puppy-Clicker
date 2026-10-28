
const storage={
 async getItem(key){try{return localStorage.getItem(key);}catch{return null;}},
 async setItem(key,value){try{localStorage.setItem(key,String(value));}catch{}},
 async removeItem(key){try{localStorage.removeItem(key);}catch{}},
 async getAllKeys(){try{return Object.keys(localStorage);}catch{return [];}}
};
export default storage;
