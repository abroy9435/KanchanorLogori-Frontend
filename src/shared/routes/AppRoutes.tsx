// src/shared/routes/AppRoutes.tsx
// import React from "react";
// import { Routes, Route, Navigate } from "react-router-dom";

// import ProtectedRoute from "./Protectedroute";
// import { useDevice } from "../hooks/useDevice";
// import { useAuth } from "../context/AuthContext";

// // Desktop pages
// import LoginDesktop from "../../desktop/pages/Login";
// import FeedDesktop from "../../desktop/pages/feed";
// import DiscoverDesktop from "../../desktop/pages/discover";
// import PostDesktop from "../../desktop/pages/post";
// import RegisterDesktop from "../../desktop/pages/Register";
// import GateDesktop from "../../desktop/pages/Gate";

// // Mobile pages
// import LoginMobile from "../../mobile/pages/LoginMobile";
// import FeedMobile from "../../mobile/pages/FeedMobile";
// import DiscoverMobile from "../../mobile/pages/DiscoverMobile";
// import PostMobile from "../../mobile/pages/PostMobile";
// import RegisterMobile from "../../mobile/pages/RegisterMobile";
// import GateMobile from "../../mobile/pages/GateMobile";

// export default function AppRoutes() {
//   const { isMobile } = useDevice();
//   const { user } = useAuth(); // ✅ get user from context

//   // Desktop routes
//   if (!isMobile) {
//     return (
//       <Routes>
//         <Route path="/" element={<LoginDesktop />} />
//         <Route
//           path="/feed"
//           element={
//             <ProtectedRoute>
//               <FeedDesktop />
//             </ProtectedRoute>
//           }
//         />
//         <Route
//           path="/discover"
//           element={
//             <ProtectedRoute>
//               <DiscoverDesktop />
//             </ProtectedRoute>
//           }
//         />
//         <Route
//           path="/post"
//           element={
//             <ProtectedRoute>
//               <PostDesktop />
//             </ProtectedRoute>
//           }
//         />
//         <Route
//           path="/register"
//           element={
//             <ProtectedRoute>
//               <RegisterDesktop />
//             </ProtectedRoute>
//           }
//         />
//         <Route
//           path="/gate"
//           element={
//             <ProtectedRoute>
//               <GateDesktop />
//             </ProtectedRoute>
//           }
//         />
//         <Route path="*" element={<div className="p-8 text-white">Not Found</div>} />
//       </Routes>
//     );
//   }

//   // Mobile routes
//   return (
//     <Routes>
//       {/* If logged in already, skip Login and go to /gate */}
//       <Route
//         path="/"
//         element={user ? <Navigate to="/gate" replace /> : <LoginMobile />}
//       />
//       <Route
//         path="/feed"
//         element={
//           <ProtectedRoute>
//             <FeedMobile />
//           </ProtectedRoute>
//         }
//       />
//       <Route
//         path="/discover"
//         element={
//           <ProtectedRoute>
//             <DiscoverMobile />
//           </ProtectedRoute>
//         }
//       />
//       <Route
//         path="/post"
//         element={
//           <ProtectedRoute>
//             <PostMobile />
//           </ProtectedRoute>
//         }
//       />
//       <Route
//         path="/register"
//         element={
//           <ProtectedRoute>
//             <RegisterMobile />
//           </ProtectedRoute>
//         }
//       />
//       <Route
//         path="/gate"
//         element={
//           <ProtectedRoute>
//             <GateMobile />
//           </ProtectedRoute>
//         }
//       />
//       <Route path="*" element={<div className="p-4 text-white">Not Found</div>} />
//     </Routes>
//   );
// }

// src/shared/routes/AppRoutes.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import MobileLayout from "../../mobile/layout/MobileLayout";

import ProtectedRoute from "./Protectedroute";
import { useDevice } from "../hooks/useDevice";

// Desktop pages
import LoginDesktop from "../../desktop/pages/Login";
import FeedDesktop from "../../desktop/pages/feed";
import DiscoverDesktop from "../../desktop/pages/discover";
import PostDesktop from "../../desktop/pages/post";
import RegisterDesktop from "../../desktop/pages/Register";
import GateDesktop from "../../desktop/pages/Gate";

// Mobile pages
import LoginMobile from "../../mobile/pages/LoginMobile";
import FeedMobile from "../../mobile/pages/FeedMobile";
import DiscoverMobile from "../../mobile/pages/DiscoverMobile";
import UserProfileMobile from "../../mobile/pages/ProfileMobile";
import PostMobile from "../../mobile/pages/PostMobile";
import RegisterMobile from "../../mobile/pages/Register";
import GateMobile from "../../mobile/pages/GateMobile";
import { useAuth } from "../context/AuthContext";
import SettingsMobile from "../../mobile/pages/SettingsMobile";
import ChatListMobile from "../../mobile/pages/ChatsListMobile";
import ChatRoomMobile from "../../mobile/pages/ChatRoom";
import EditProfileMobile from "../../mobile/pages/EditProfileMobile";
import DiscoverUserProfile from "../../mobile/pages/DiscoverUserProfile";


export default function AppRoutes() {

  const { isMobile } = useDevice();
  const { user } = useAuth();  // <-- this brings `user` into scope

  console.log("AppRoutes rendered, isMobile=", isMobile, "user=", user);

  // Desktop routes
  if (!isMobile) {
    return (
      <Routes>
        <Route path="/" element={<LoginDesktop />} />
        <Route
          path="/feed"
          element={
            <ProtectedRoute>
              <FeedDesktop />
            </ProtectedRoute>
          }
        />
        <Route
          path="/discover"
          element={
            <ProtectedRoute>
              <DiscoverDesktop />
            </ProtectedRoute>
          }
        />
        <Route
          path="/post"
          element={
            <ProtectedRoute>
              <PostDesktop />
            </ProtectedRoute>
          }
        />
        <Route
          path="/register"
          element={
            <ProtectedRoute>
              <RegisterDesktop />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gate"
          element={
            <ProtectedRoute>
              <GateDesktop />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<div className="p-8 text-white">Not Found</div>} />
      </Routes>
    );
  }


 // ✅ Mobile routes – with MobileLayout
return (
  <Routes>
    {/* Login stays outside layout */}
    <Route
      path="/"
      element={user ? <Navigate to="/gate" replace /> : <LoginMobile />}
    />

    {/*Chatroom Staysoutside mobilelayout*/}
    <Route
      path="/chats/:conversationId"
      element={
        <ProtectedRoute>
          <ChatRoomMobile />
        </ProtectedRoute>
      }
    />

    <Route
      path="/register"
      element={
        <ProtectedRoute>
          <RegisterMobile/>
        </ProtectedRoute>
        }
    />

    <Route 
      path="/edit-profile" 
      element={
        <ProtectedRoute>
        <EditProfileMobile />
        </ProtectedRoute>
        } 
    />
    <Route
        path="/gate"
        element={
          <ProtectedRoute>
            <GateMobile />
          </ProtectedRoute>
        }
      />
    {/* All other pages inside MobileLayout */}
    <Route element={<MobileLayout />}>
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <UserProfileMobile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsMobile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/feed"
        element={
          <ProtectedRoute>
            <FeedMobile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/discover"
        element={
          <ProtectedRoute>
            <DiscoverMobile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/post"
        element={
          <ProtectedRoute>
            <PostMobile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chats"
        element={
          <ProtectedRoute>
            <ChatListMobile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/discover/profile/:uid"
        element={
          <ProtectedRoute>
            <DiscoverUserProfile />
          </ProtectedRoute>
        }
      />

    </Route>

    {/* Fallback */}
    <Route path="*" element={<div className="p-4 text-white">Not Found</div>} />
  </Routes>
);
}
