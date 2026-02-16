"use client";
import useAuth from "../../hooks/useAuth";
import { signOut } from "aws-amplify/auth";
export default function Page() {
  const { user, loading } = useAuth();
  const logout = async () => {
    await signOut();
  };
  return (
    <div>
      <h1>home</h1>
      <button onClick={logout}>Sign Out</button>
    </div>
  );
}
