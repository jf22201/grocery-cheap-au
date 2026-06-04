"use client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Separator } from "./ui/separator";
import {
  signIn,
  signUp,
  confirmSignUp,
  resendConfirmationCode,
} from "@/lib/auth/cognito";
import React, {
  useState,
  useEffect,
  useRef,
  SetStateAction,
  Dispatch,
} from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
export function LoginPage() {
  //State variables to store email and password
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showVerification, setShowVerification] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");
  const verificationEmail = useRef("");
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  const toggleIsSignUp = () => {
    setIsSignUp((prev) => !prev);
  };
  const router = useRouter();
  async function handleLogin(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const loginEmail = email;
    const loginPassword = password;
    try {
      if (isSignUp) {
        //logic to handle sign up
        if (password !== confirmPassword) {
          toast.error("Passwords do not match!", { position: "top-center" });
        } else {
          //passwords match, attempt sign up
          const { userConfirmed } = await signUp(loginEmail, loginPassword);
          if (!userConfirmed) {
            verificationEmail.current = loginEmail;
            toast.info("Verification code sent to email.", {
              position: "top-center",
            });
            setShowVerification(true);
          }
        }
      } else {
        //logic to handle sign in
        await signIn(loginEmail, loginPassword);
        toast.success("Logged in successfully!", { position: "top-center" });
        router.push("/");
      }
    } catch (err) {
      console.log(err);
      if (err instanceof Error) {
        toast.error(err.message, { position: "top-center" });
      } else {
        toast.error("Unexpected error occured", { position: "top-center" });
      }
    }
  }
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-3 text-center">
        <div className="flex justify-center">
          <p>App Image</p>
        </div>
        <CardTitle className="text-2xl">App Name</CardTitle>
        <CardDescription>App Description...</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleLogin} action="" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              placeholder="youremail@example.com"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? "Hide" : "Show"}
            </Button>
          </div>
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="password">Confirm Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          )}
          {
            <Button
              type="submit"
              className="w-full hover:bg-primary/50"
              variant="outline"
            >
              {isSignUp ? "Sign up" : "Sign in"}
            </Button>
          }
          {showVerification && (
            <VerificationCode
              confirmationCode={confirmationCode}
              setConfirmationCode={setConfirmationCode}
              verificationEmail={verificationEmail}
              setShowVerification={setShowVerification}
              setIsSignUp={setIsSignUp}
            ></VerificationCode>
          )}
        </form>

        <div className="flex items-center gap-4">
          <Separator className="flex-1" />
          <span className="text-sm text-muted-foreground">OR</span>
          <Separator className="flex-1" />
        </div>

        <div className="space-y-3">
          <Button type="button" variant="outline" className="w-full">
            Continue with Google
          </Button>
        </div>

        <div className="space-y-3">
          <Button type="button" variant="outline" className="w-full">
            Continue with Outlook
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        {!isSignUp ? (
          <div className="text-sm text-center text-muted-foreground">
            {"Don't have an account? "}
            <button className="hover:text-primary/100" onClick={toggleIsSignUp}>
              Sign up
            </button>
          </div>
        ) : (
          <div className="text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <button className="hover:text-primary/100" onClick={toggleIsSignUp}>
              Sign in
            </button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

const VerificationCode = ({
  confirmationCode,
  setConfirmationCode,
  verificationEmail,
  setShowVerification,
  setIsSignUp,
}: {
  confirmationCode: string;
  setConfirmationCode: Dispatch<SetStateAction<string>>;
  verificationEmail: React.RefObject<string>;
  setShowVerification: Dispatch<SetStateAction<boolean>>;
  setIsSignUp: Dispatch<SetStateAction<boolean>>;
}) => {
  const [showResendCountdown, setShowResendCountdown] = useState(false);
  const [countdownTimer, setCountdownTimer] = useState(0);
  useEffect(() => {
    let countdown: NodeJS.Timeout | undefined;
    if (showResendCountdown) {
      const countdown = setInterval(
        () =>
          setCountdownTimer((old) => {
            if (old < 1) {
              //When counter hits 0, hide the countdown and stop interval.
              setShowResendCountdown(false);
              clearInterval(countdown);
              return 0;
            }
            return old - 1;
          }),
        1000,
      ); //Countdown by 1 each second.
    }
    return () => clearInterval(countdown);
  }, [showResendCountdown]);
  useEffect(() => {}, []);
  const VerificationSubmit = async () => {
    try {
      console.log(verificationEmail, confirmationCode);
      await confirmSignUp(verificationEmail.current, confirmationCode);
      setShowVerification(false);
      setIsSignUp(false);
      toast.success("Account verified successfully! Please sign in.", {
        position: "top-center",
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message, { position: "top-center" });
      } else {
        toast.error("Unexpected error occurred", { position: "top-center" });
      }
    }
  };
  const GetNewVerificationCode = async () => {
    if (!showResendCountdown) {
      //Should only send request if there is no countdown on button.
      setCountdownTimer(60);
      setShowResendCountdown(true);
      try {
        await resendConfirmationCode(verificationEmail.current);
      } catch (err: unknown) {
        if (err instanceof Error) {
          toast.error(err.message, { position: "top-center" });
        } else {
          toast.error("Unexpected error occured", { position: "top-center" });
        }
      }
    }
  };
  return (
    <div>
      <div className="flex flex-col">
        <div className="space-y-2 py-4">
          <Input
            id="verificationcode"
            type="input"
            placeholder="123456"
            value={confirmationCode}
            onChange={(e) => setConfirmationCode(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" className="flex-1" onClick={VerificationSubmit}>
            Submit
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={GetNewVerificationCode}
          >
            {!showResendCountdown ? "Resend Code" : `Wait ${countdownTimer}s`}
          </Button>
        </div>
      </div>
    </div>
  );
};
