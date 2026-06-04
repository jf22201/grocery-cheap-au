"use client";
import { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/auth/cognito";
import { useRouter } from "next/navigation";

export default function useAuth() {
  const [user, setUser] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    getCurrentUser()
      .then((cognitoUser) => {
        if (cognitoUser) {
          setUser(cognitoUser.getUsername());
        } else {
          router.push("/login");
          router.refresh();
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
}
