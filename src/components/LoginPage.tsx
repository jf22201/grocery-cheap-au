import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";


export function LoginPage() {

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-3 text-center">
        <div className="flex justify-center">
          <p>App Image</p>
        </div>
        <CardTitle className="text-2xl">App Name</CardTitle>
        <CardDescription>
          App Description...
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action="" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email"
              type="email"
              placeholder="youremail@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password"
              type="password"
              placeholder="••••••••••••"
              required
            />
          </div>
          <Button type="submit" className="w-full hover:bg-primary/50" variant="outline">Sign In</Button>
        </form>

        <div className="flex items-center gap-4">
            <Separator className="flex-1" />
            <span className="text-sm text-muted-foreground">OR</span>
            <Separator className="flex-1" />
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full">
              Continue with Google
            </Button>
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full">
              Continue with Outlook
            </Button>
          </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground">
            Don't have an account?{" "}
            <button className="hover:text-primary/100">
              Sign up
            </button>
          </div>
        </CardFooter>
    </Card>
  );
}