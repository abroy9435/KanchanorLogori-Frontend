"use client";
import { signOut } from "firebase/auth";
import { auth } from "../../shared/utils/firebase";
import DesktopLayout from "../layouts/DesktopLayout";

import { INTERESTS } from "../../shared/constants/interests";
import { useEffect, useState } from "react";
import { getRandomProfiles, setLike } from "../../shared/api";
import type { UserProfileToShow, UserProfileOnReceive } from "../../shared/types";
import { Button } from "../../shared/components/button";
import { Card, CardContent } from "../../shared/components/card";

export default function Feed() {
  const [profiles, setProfiles] = useState<UserProfileToShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(true); // 👈 per-avatar loading

  // fetch random profiles
  useEffect(() => {
    async function fetchProfiles() {
      try {
        const data: UserProfileOnReceive[] = await getRandomProfiles();

        // map backend → frontend type
        const mappedProfiles: UserProfileToShow[] = data.map((p) => ({
          uid: p.uid,
          name: p.name,
          email: p.email,
          dateOfBirth: p.dateofbirth,
          gender: p.gender,
          bio: p.bio,
          avataar: p.avataar
            ? `https://r2-image-proxy.files-tu-dating-app.workers.dev/${p.avataar}`
            : "/profile_placeholder.jpg",
          preferred_gender: p.preferred_gender,
          school_name: p.school_name,
          programme_name: p.programme_name,
          department_name: p.department_name,
          personality: p.personality,
          looking_for: p.looking_for,
          interests: p.interests
            .map((id: number) => {
              const match = INTERESTS.find((i) => i.id === id);
              return match ? match.name : null;
            })
            .filter((name: string | null): name is string => name !== null),
          has_liked: false,
          is_blocked: false,
          has_blocked: false,
          posts: [],
        }));

        setProfiles(mappedProfiles);
      } catch (err) {
        console.error("Error fetching profiles:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProfiles();
  }, []);

  // reset avatar loader when switching profile
  useEffect(() => {
    setImageLoading(true);
  }, [currentIndex]);

  // like a profile
  const handleLike = async (profileId: string) => {
    try {
      await setLike({ likes: [profileId] });
      nextProfile();
    } catch (err) {
      console.error("Error liking profile", err);
    }
  };

  // skip profile
  const nextProfile = () => {
    setCurrentIndex((prev: number) => prev + 1);
  };

  if (loading) {
    return (
      <DesktopLayout>
        <div className="p-6">
          <div className="p-8 text-white w-screen h-screen flex flex-col justify-center items-center">
            Loading profiles...
          </div>
        </div>
      </DesktopLayout>
    );
  }

  if (currentIndex >= profiles.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-300">
        <h2 className="text-xl font-semibold">No more profiles to show!</h2>
        <p className="text-gray-400 mt-2">
          The platform is still in its early stage, stay tuned for more profiles
          to show up!
        </p>
      </div>
    );
  }

  const profile = profiles[currentIndex];

  return (
    <DesktopLayout>
      <div className="p-6 flex flex-col items-center justify-center h-screen w-screen">
        <div className="flex flex-col items-center justify-center h-full p-6">
          <Card className="bg-gray-900 text-white flex flex-col items-center justify-center w-full max-w-md rounded-2xl shadow-lg">
            <div className="relative w-[300px] items-center justify-center">
              {/* Show loading avatar while actual avatar is loading */}
              {imageLoading && (
                <img
                  src="/profile_loading.png"
                  alt="Loading avatar"
                  className="absolute rounded-t-2xl object-cover w-full h-64"
                />
              )}

              <img
                src={profile.avataar || "/profile_placeholder.jpg"}
                alt={profile.name}
                className={`rounded-t-2xl object-cover w-full h-64 transition-opacity duration-300 ${
                  imageLoading ? "opacity-0" : "opacity-100"
                }`}
                onLoad={() => setImageLoading(false)}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/profile_placeholder.jpg";
                  setImageLoading(false);
                }}
              />
            </div>

            <CardContent className="p-4">
              <h2 className="text-xl font-bold">{profile.name}</h2>
              <p className="text-sm text-gray-400">
                {profile.gender} • {profile.department_name} • {profile.programme_name}
              </p>

              {/* Interests Section */}
              <div className="mt-3 px-6 flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <span
                    key={interest}
                    className="px-3 py-1 text-sm rounded-full bg-pink-600/20 text-pink-400 border border-pink-500/30"
                  >
                    {interest}
                  </span>
                ))}
              </div>

              <p className="mt-3 text-gray-300 text-sm">{profile.bio}</p>

              <div className="flex justify-between mt-6">
                <Button
                  variant="ghost"
                  className="text-gray-400 hover:text-white"
                  onClick={nextProfile}
                >
                  Skip
                </Button>
                <Button
                  variant="default"
                  className="bg-pink-600 hover:bg-pink-700"
                  onClick={() => handleLike(profile.uid)}
                >
                  Like
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DesktopLayout>
  );
}
