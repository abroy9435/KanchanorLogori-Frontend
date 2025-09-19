// import React, { useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { getMyProfile } from "../../shared/services/userService";

// export default function Gate() {
//   const navigate = useNavigate();

//   useEffect(() => {
//     let alive = true;
//     (async () => {
//       try {
//         await getMyProfile();
//         if (alive) navigate("/feed", { replace: true }); // existing user
//       } catch (err: any) {
//         const code = err?.response?.status;
//         if (code === 404) {
//           if (alive) navigate("/register", { replace: true }); // new user
//         } else if (code === 401) {
//           if (alive) navigate("/", { replace: true }); // not authenticated
//         } else {
//           console.error(err);
//           if (alive) navigate("/error", { replace: true });
//         }
//       }
//     })();
//     return () => { alive = false; };
//   }, [navigate]);

//   return <div className="text-white p-8">Checking your profile…</div>;
// }
