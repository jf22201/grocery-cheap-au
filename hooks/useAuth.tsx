"use client";
import { useState, useEffect } from "react";
import { getCurrentUser } from "aws-amplify/auth";
import { useRouter } from "next/navigation";

export default function useAuth() {
  const [user, setUser] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  async function CheckAuth() {
    try {
      const authUser = await getCurrentUser();
      //if we reach here there is a valid user logged in
      console.log(authUser);
      const username = authUser?.username;
      setUser(username);
    } catch (err) {
      if (err instanceof Error) {
        //treat any auth error as unauthorized.
        router.push("/login");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    CheckAuth();
  }, []);
  return { user, loading };
}
