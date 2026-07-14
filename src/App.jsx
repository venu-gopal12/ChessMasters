  import React from "react";
  import { BrowserRouter , Routes, Route} from "react-router-dom";
  import Navbar from "./components/Navbar";
  import Coachdash from "./components/Coachdash";
  import Notifications from "./components/Notifications";
  import VerifyEmail from "./components/VerifyEmail";
  import './App.css';

  function App() {
    return (
     <BrowserRouter> 
          <Navbar /> {/* Navbar remains consistent across all pages */}
          <Routes>
            {/* Default route to Coachdash */}
            <Route path="/" element={<Coachdash />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            
          </Routes>
    </BrowserRouter>
    );
  }

  export default App;
