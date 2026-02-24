"use client";

import AddProduct from "@/components/AddProduct";
import useAuth from "../../hooks/useAuth";
import { signOut } from "aws-amplify/auth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
export default function Page() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [showModal, setShowModal] = useState(false);

  const logout = async () => {
    await signOut();
    router.push("/login")
  };

  return (
    <div className="min-h-screen flex flex-col">
      
      <div className="w-full bg-black px-6 py-3 flex justify-between items-center gap-3">
        

        <Button
          variant="secondary"
          className="bg-white text-black hover:bg-gray-200"
          size="icon"
          onClick={() => setShowModal(true)}
        >
          <Plus className="h-5 w-5" />
        </Button>

        <Button
          variant="secondary"
          className="bg-white text-black hover:bg-gray-200"
          onClick={logout}
        >
          Sign Out
        </Button>
      </div>

      <div className="p-6">
        <h1 className="text-2xl font-semibold">Home</h1>
      </div>

      <AddProduct openTrigger={showModal} setOpenTrigger={setShowModal} />
    </div>
  );
}