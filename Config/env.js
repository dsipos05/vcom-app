/* This file is loaded before our application scripts in...
   SystemAdmin/logon/index.html,
   ControlPanel/index.html, and in
   SystemAdmin/index.html
   Any file that wants to access these environment variables
   can access window.__env and evaluate these properties
*/
(()=>{

let properties = {
  /* Branding */
    // Intracom
      companyName:"Intracom",
      productName:"VCOM",
      favicon:"/img/intracomfav.png",
      logo:"/img/IntraCom_Logo_Black_189_50.png",
      splashVSAImageURL:"/img/vsa2.png",
      splashVCPImageURL:"/img/no\ logo.jpg",
      splashHomeLink:"https://intracomsystems.com",
  /* End Branding */
  };

  try{
    window.__env ={};
    Object.assign(window.__env,properties);
  }catch(e){
    console.log("env.js headless javascript, no window");
  }

  try{
    module.exports = properties;
  }catch(e){
    console.log("cant export env.js properties")
  }
})()

