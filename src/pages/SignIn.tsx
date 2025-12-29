import { useState, useEffect } from 'react';
import HCaptchaWidget from '@/components/HCaptchaWidget';
import { useNavigate } from 'react-router-dom';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/hooks/useAuth';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub } from 'react-icons/fa';
import { useToast } from '@/hooks/use-toast';
import { env } from '@/lib/env';

const HCAPTCHA_SITEKEY = import.meta.env.VITE_HCAPTCHA_SITEKEY || '';
const VERIFY_HCAPTCHA_URL = `${env.supabase.url}/functions/v1/verify-hcaptcha`;
const SignIn = () => {
  const { signIn, signUp, signInWithGoogle, signInWithGithub, user, loading: authLoading } = useAuth();

  const navigate = useNavigate();
  const { toast } = useToast();

  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast({
        title: "Google sign-in failed",
        description: error.message || "Unable to sign in with Google.",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  const handleGithubSignIn = async () => {
    setIsSubmitting(true);
    const { error } = await signInWithGithub();
    if (error) {
      toast({
        title: "GitHub sign-in failed",
        description: error.message || "Unable to sign in with GitHub.",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setCaptchaError(null);
    if (!captchaToken) {
      setCaptchaError('Please complete the captcha.');
      return;
    }
    setIsSubmitting(true);
    // Verify hCaptcha token server-side
    try {
      const verifyRes = await fetch(VERIFY_HCAPTCHA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: captchaToken }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        setCaptchaError('Captcha verification failed. Please try again.');
        setIsSubmitting(false);
        return;
      }
    } catch (err) {
      setCaptchaError('Captcha verification error.');
      setIsSubmitting(false);
      return;
    }
    const { error } = await signIn(signInEmail, signInPassword);
    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign in",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Signed in successfully",
      });
      navigate('/');
    }
    setIsSubmitting(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setCaptchaError(null);
    if (signUpPassword !== signUpConfirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    if (!captchaToken) {
      setCaptchaError('Please complete the captcha.');
      return;
    }
    setIsSubmitting(true);
    // Verify hCaptcha token server-side
    try {
      const verifyRes = await fetch(VERIFY_HCAPTCHA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: captchaToken }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        setCaptchaError('Captcha verification failed. Please try again.');
        setIsSubmitting(false);
        return;
      }
    } catch (err) {
      setCaptchaError('Captcha verification error.');
      setIsSubmitting(false);
      return;
    }
    const { error } = await signUp(signUpEmail, signUpPassword, fullName);
    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign up",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Account created successfully! Please check your email for a verification link.",
      });
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <Card>
                  <div className="flex flex-col gap-4 p-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex items-center justify-center gap-2"
                      onClick={handleGoogleSignIn}
                      disabled={isSubmitting}
                    >
                      <FcGoogle className="w-5 h-5" />
                      Continue with Google
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex items-center justify-center gap-2"
                      onClick={handleGithubSignIn}
                      disabled={isSubmitting}
                    >
                      <FaGithub className="w-5 h-5" />
                      Continue with GitHub
                    </Button>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-center">Welcome Back</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your@/gmail.com"
                          value={signInEmail}
                          onChange={(e) => setSignInEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={signInPassword}
                          onChange={(e) => setSignInPassword(e.target.value)}
                          required
                        />
                      </div>
                      <HCaptchaWidget
                        sitekey={HCAPTCHA_SITEKEY}
                        onVerify={token => { setCaptchaToken(token); setCaptchaError(null); }}
                        onExpire={() => { setCaptchaToken(null); setCaptchaError('Captcha expired.'); }}
                        onError={() => setCaptchaError('Captcha error.')}
                        disabled={isSubmitting}
                      />
                      {captchaError && <div className="text-red-500 text-sm mb-2">{captchaError}</div>}
                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? 'Signing in...' : 'Sign In'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="signup">
                <Card>
                  <div className="flex flex-col gap-4 p-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex items-center justify-center gap-2"
                      onClick={handleGoogleSignIn}
                      disabled={isSubmitting}
                    >
                      <FcGoogle className="w-5 h-5" />
                      Sign up with Google
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex items-center justify-center gap-2"
                      onClick={handleGithubSignIn}
                      disabled={isSubmitting}
                    >
                      <FaGithub className="w-5 h-5" />
                      Sign up with GitHub
                    </Button>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-center">Create Account</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          placeholder="Your full name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="your@email.com"
                          value={signUpEmail}
                          onChange={(e) => setSignUpEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <Input
                          id="signup-password"
                          type="password"
                          value={signUpPassword}
                          onChange={(e) => setSignUpPassword(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={signUpConfirmPassword}
                          onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                          required
                        />
                      </div>
                      <HCaptchaWidget
                        sitekey={HCAPTCHA_SITEKEY}
                        onVerify={token => { setCaptchaToken(token); setCaptchaError(null); }}
                        onExpire={() => { setCaptchaToken(null); setCaptchaError('Captcha expired.'); }}
                        onError={() => setCaptchaError('Captcha error.')}
                        disabled={isSubmitting}
                      />
                      {captchaError && <div className="text-red-500 text-sm mb-2">{captchaError}</div>}
                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? 'Creating account...' : 'Create Account'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SignIn;