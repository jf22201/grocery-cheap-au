"use client";
import { LoginPage } from "@/components/LoginPage";
import {
  getCurrentUser,
  AuthUser,
  fetchAuthSession,
  AuthSession,
  signOut,
  AuthError,
} from "aws-amplify/auth";

const func = async () => {
  try {
    const authUser = await getCurrentUser();
    //if we reach here the there was no problem retriving the auth user
    console.log(authUser);
    return true;
  } catch (err) {
    if (err instanceof Error) {
      if (err.name == "UserUnAuthenticatedException") {
        return false;
      }
    }
  }
};
const func2 = async () => {
  try {
    await signOut();
  } catch (err) {}
};
export default function Page() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4">
      <LoginPage></LoginPage>
      <button onClick={func}>asd</button>
      <button onClick={func2}>logout</button>
    </div>
  );
}
