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
  resendSignUpCode,
} from "aws-amplify/auth";
import { Amplify } from "aws-amplify";
import { useState, useEffect, useRef } from "react";
import { email, set } from "zod";
import outputs from "../../amplify_outputs.json";
import { responseCookiesToRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { InfoIcon } from "lucide-react";
import { UserReference } from "aws-cdk-lib/aws-appstream";
import { execPath } from "process";
import { Pass } from "aws-cdk-lib/aws-stepfunctions";
Amplify.configure(outputs);

export function LoginPage() {
  //State variables to store email and password
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showVerification, setShowVerification] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");
  const verificationEmail = useRef("");
  const toggleIsSignUp = () => {
    setIsSignUp((prev) => !prev);
  };
  useEffect(() => {
    console.log(email, password);
  }, [email, password]);

  async function handleLogin() {
    const loginEmail = email;
    const loginPassword = password;
    try {
      if (isSignUp) {
        //logic to handle sign up
        const { message, ...rest } = await signUp({
          username: loginEmail,
          password: loginPassword,
        });
      } else {
        //logic to handle sign in
        const { signInStep, nextStep } = await signIn({
          username: loginEmail,
          password: loginPassword,
        });
        if (nextStep.signInStep == "CONFIRM_SIGN_UP") {
          verificationEmail.current = loginEmail;
          setShowVerification(true);
        }
      }
    } catch (err) {
      console.log(err);
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
        <form action="" className="space-y-4">
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
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
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
              type="button"
              className="w-full hover:bg-primary/50"
              variant="outline"
              onClick={handleLogin}
            >
              {isSignUp ? "Sign up" : "Sign in"}
            </Button>
          }
          {showVerification && (
            <VerificationCode
              confirmationCode={confirmationCode}
              setConfirmationCode={setConfirmationCode}
              verificationEmail={verificationEmail.current}
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
            Don't have an account?{" "}
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
}: {
  confirmationCode: string;
  setConfirmationCode: Dispatch<SetStateAction<string>>;
  verificationEmail: string;
}) => {
  const [showResendCountdown, setShowResendCountdown] = useState(false);
  const [countdownTimer, setCountdownTimer] = useState(0);
  useEffect(() => {
    let countdown: NodeJS.Timeout | undefined;
    if (showResendCountdown) {
      setCountdownTimer(60);
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
      const { isSignUpComplete, nextStep } = await confirmSignUp({
        username: verificationEmail,
        confirmationCode: confirmationCode,
      });
    } catch (err) {} //TODO: render toast with error here
  };
  const GetNewVerificationCode = async () => {
    if (!showResendCountdown) {
      //Should only send request if there is no countdown on button.
      setShowResendCountdown(true);
      try {
        const output = await resendSignUpCode({ username: verificationEmail });
        console.log(output);
      } catch (err) {} //TODO: render toast with error here
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
            {!showResendCountdown ? "Recieve Code" : `Wait ${countdownTimer}s`}
          </Button>
        </div>
      </div>
    </div>
  );
};
