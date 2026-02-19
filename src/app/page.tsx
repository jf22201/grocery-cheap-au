"use client";
import AddProduct from "@/components/AddProduct";
import useAuth from "../../hooks/useAuth";
import { signOut } from "aws-amplify/auth";
import { useState } from "react";
export default function Page() {
  const { user, loading } = useAuth();
  // const [ showModal, setShowModal ] = useState(false);
  const logout = async () => {
    await signOut();
  };
  const [showModal,setShowModal] = useState(false);
  return (
    <div>
      <h1>home</h1>
      <button onClick={logout}>Sign Out</button>
      <button onClick={() => {
        setShowModal(true);
      }}>asldjandsa</button>
      <AddProduct openTrigger={showModal} setOpenTrigger={setShowModal}/>
    </div>
    
  );}