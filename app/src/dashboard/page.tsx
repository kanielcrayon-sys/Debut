'use client';

import Header from "@/app/src/components/headerP/header2";
import Sidebar from "@/app/src/components/sidebar/sidebar";
import "./style.css";
import CorpsE from "@/app/src/components/body/body";
import { Children } from "react";


export default function dashbord(){
return(

    <html lang="en"  className="ligth" >

        <body>


            <div className="main flex  " >
                <div className="sidebarWrapper w-[18%] h-screen    ">
                     <Sidebar></Sidebar>

                </div>
                <div className="rightContent">
                    
                </div>
               
                <div>
                    <CorpsE/>
                </div>
                <div className="rightContent w-[90%]">
                    <Header/>
                    <div>
                        
                    </div>
                </div>
            </div>

        </body>


      

    </html>
        
            
            
        
  );
  
}