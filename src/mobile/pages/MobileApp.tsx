// src/mobile/pages/MobileApp.tsx
/*
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './LoginMobile'; // you can create mobile Login later

export default function MobileApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/mobile-login" element={<div className="p-4">Mobile Home (placeholder)</div>} />
      </Routes>
    </BrowserRouter>
  );
}
*/
// src/mobile/pages/MobileApp.tsx
// src/mobile/pages/MobileApp.tsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import MobileLayout from "../layout/MobileLayout";
import FeedMobile from "./FeedMobile";
import GateMobile from "./GateMobile";

export default function MobileApp() {
  return (
    <Routes>
      <Route path="/" element={<GateMobile />} />
      <Route element={<MobileLayout />}>
        <Route path="/feed" element={<FeedMobile />} />
        <Route path="/post" element={<div className="p-4">Post Page</div>} />
        <Route path="/discover" element={<div className="p-4">Discover Page</div>} />
        <Route path="/messages" element={<div className="p-4">Messages Page</div>} />
        <Route path="/profile" element={<div className="p-4">Profile Page</div>} />
      </Route>
    </Routes>
  );
}



