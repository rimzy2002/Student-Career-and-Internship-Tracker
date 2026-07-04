'use client';

import React from 'react';
import Link from 'next/link';
import { InteractiveRobotSpline } from '@/components/ui/interactive-3d-robot'
import { Button } from '@/components/ui/button'

export function Section() { 
  
  const ROBOT_SCENE_URL = "https://prod.spline.design/PyzDhpQ9E5f1E3MT/scene.splinecode";

  return (
   
    <div className="relative w-full h-screen overflow-hidden bg-black">

      <InteractiveRobotSpline
        scene={ROBOT_SCENE_URL}
        className="absolute inset-0 z-0 opacity-80" 
      />
    
      <div className="
        absolute inset-0 z-10
        pt-32 md:pt-48 lg:pt-56
        px-4 md:px-8            
        pointer-events-none     
        flex flex-col items-center
      ">
       
        <div className="
          text-center             
          text-white              
          drop-shadow-2xl          
          w-full max-w-4xl        
          mb-8
        ">
         
          <h1 className="
            text-4xl md:text-5xl lg:text-7xl 
            font-extrabold 
            tracking-tight
            mb-6
          ">
            Launch Your Career Journey
          </h1>
          <p className="
            text-lg md:text-xl lg:text-2xl 
            text-gray-200 
            max-w-2xl 
            mx-auto
            mb-10
          ">
            Track internships, manage applications, and land your dream job with an intelligent assistant by your side.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pointer-events-auto">
            <Link href="/register" className="inline-flex items-center justify-center h-11 px-8 text-lg font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-500/30 transition-transform hover:scale-105">
              Start Tracking for Free
            </Link>
            <Link href="#features" className="inline-flex items-center justify-center h-11 px-8 text-lg font-medium text-white border border-white/30 hover:bg-white/10 rounded-full backdrop-blur-sm transition-transform hover:scale-105">
              See How It Works
            </Link>
          </div>
        </div>
      </div>
      
      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center animate-bounce text-white/50">
        <span className="text-sm font-medium mb-2">Explore Features</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </div>

    </div> 
  );
}
