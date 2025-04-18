"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/hooks/useAuth";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

interface LoginFormState {
  email: string;
  password: string;
}

interface ResetFormState {
  email: string;
}

interface NewPasswordFormState {
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function LoginPage(): JSX.Element {
  const router = useRouter();
  const [isResetMode, setIsResetMode] = useState<boolean>(false);
  const [isNewPasswordMode, setIsNewPasswordMode] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loginForm, setLoginForm] = useState<LoginFormState>({
    email: "",
    password: "",
  });

  const [resetForm, setResetForm] = useState<ResetFormState>({
    email: "",
  });

  const [newPasswordForm, setNewPasswordForm] = useState<NewPasswordFormState>({
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const validateEmail = (email: string): boolean => {
    return Boolean(email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/));
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 6;
  };

  const { login } = useAuth();

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newErrors: FormErrors = {};

    if (!validateEmail(loginForm.email)) {
      newErrors.email = "Please enter a valid email";
    }
    if (!validatePassword(loginForm.password)) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(loginForm.email, loginForm.password);

      if (!result.success) {
        throw new Error(result.error);
      }

      router.push("/dashboard");
      toast.success("Logged in successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to login");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetRequest = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newErrors: FormErrors = {};

    if (!validateEmail(resetForm.email)) {
      newErrors.email = "Please enter a valid email";
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        resetForm.email,
        {
          redirectTo: `${window.location.origin}/login?reset=true`,
        }
      );
      if (error) throw error;
      toast.success("Password reset instructions sent to your email");
      setIsResetMode(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to send reset instructions"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewPasswordSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newErrors: FormErrors = {};

    if (!validatePassword(newPasswordForm.password)) {
      newErrors.password = "Password must be at least 6 characters";
    }
    if (newPasswordForm.password !== newPasswordForm.confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPasswordForm.password,
      });

      if (error) throw error;

      toast.success("Password updated successfully");
      router.push("/login");
      window.location.reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update password"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    setErrors((prev) => ({
      ...prev,
      [name]: undefined,
    }));
  };

  const handleResetChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setResetForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    setErrors((prev) => ({
      ...prev,
      [name]: undefined,
    }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleNewPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    setErrors((prev) => ({
      ...prev,
      [name]: undefined,
    }));
  };

  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const checkUserAndToken = async () => {
      const params = new URLSearchParams(window.location.search);
      const resetToken = params.get("reset");
      const accessToken = params.get("access_token");

      if (resetToken || accessToken) {
        setIsNewPasswordMode(true);
        return;
      }

      // Check if user is already authenticated
      if (isAuthenticated) {
        router.push("/dashboard");
      }
    };
    checkUserAndToken();
  }, [router, isAuthenticated]);

  if (isResetMode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>
              Enter your email to receive password reset instructions
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleResetRequest}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  name="email"
                  value={resetForm.email}
                  onChange={handleResetChange}
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Reset Instructions"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsResetMode(false)}
              >
                Back to Login
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  if (isNewPasswordMode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Set New Password</CardTitle>
            <CardDescription>Please enter your new password</CardDescription>
          </CardHeader>
          <form onSubmit={handleNewPasswordSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  name="password"
                  value={newPasswordForm.password}
                  onChange={handleNewPasswordChange}
                  placeholder="••••••••"
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  name="confirmPassword"
                  value={newPasswordForm.confirmPassword}
                  onChange={handleNewPasswordChange}
                  placeholder="••••••••"
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Password"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                name="email"
                value={loginForm.email}
                onChange={handleLoginChange}
                placeholder="john@example.com"
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>
            <div className="space-y-2 relative">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-3 flex items-center text-gray-500"
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            <Button
              type="button"
              variant="link"
              className="px-0 text-sm"
              onClick={() => setIsResetMode(true)}
            >
              Forgot your password?
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Logging in..." : "Login"}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
