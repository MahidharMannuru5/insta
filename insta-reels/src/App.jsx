import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

import ReelSlider from "./components/ReelSlider";

function App() {
  return (
    <div className="h-screen w-full bg-black text-white">
      <ReelSlider />
    </div>
  );
}



export default App;

