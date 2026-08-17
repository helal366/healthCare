const text = "abcdQ2ABefgh34CDijk56EFmnop78GHqsrst9QZJuvwxQ5KLyz87MNabcd98Pefgh76QRijk54STmnop32UVqrstQQWX";
let passwordString:string="";
const createpasswordString=(digit:number)=>{
    for(let i=0; i<digit; i++){
        const index = Math.floor(Math.random()*text.length);
        const random = text[index];
        passwordString+=random;
    }
    return passwordString
}
const password = createpasswordString(6)
console.log({ password });