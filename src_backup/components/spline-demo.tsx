'use client';

import React from 'react';
import { InteractiveRobotSpline } from '@/components/ui/interactive-3d-robot'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export function Section() { 
  
  const ROBOT_SCENE_URL = "https://prod.spline.design/PyzDhpQ9E5f1E3MT/scene.splinecode";

  return (
   
    <div className="relative w-screen h-screen overflow-hidden">

      <InteractiveRobotSpline
        scene={ROBOT_SCENE_URL}
        className="absolute inset-0 z-0" 
      />

    
      <div className="
        absolute inset-0 z-10
        pt-20 md:pt-32 lg:pt-40
        px-4 md:px-8            
        pointer-events-none     
        flex flex-col items-center
      ">
       
        <div className="
          text-center             
          text-white              
          drop-shadow-lg          
          w-full max-w-2xl        
          mb-8
        ">
         
          <h1 className="
            text-2xl md:text-3xl lg:text-4xl xl:text-5xl 
            font-bold 
           
          ">
            This is interactive 3d robot Whobee
          </h1>
        </div>

        <Card className="pointer-events-auto max-w-sm bg-black/40 backdrop-blur-md border-white/20 text-white shadow-2xl">
          <CardHeader>
            <CardTitle>Robot Capabilities</CardTitle>
            <CardDescription className="text-gray-300">Interact with the model to see it in action.</CardDescription>
          </CardHeader>
          <CardContent>
            <img 
              src="https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=600&auto=format&fit=crop" 
              alt="Robot visualization" 
              className="rounded-md object-cover h-48 w-full mb-4"
            />
            <p className="text-sm">
              Drag your mouse to rotate Whobee and explore the 3D details.
            </p>
          </CardContent>
        </Card>
      </div>

    </div> 
  );
}
