"use client";
import useAuth from "../../hooks/useAuth";
export default function Page() {
  const { user, loading } = useAuth();
  return (
    <div>
      <h1>home</h1>
    </div>
  );
}
