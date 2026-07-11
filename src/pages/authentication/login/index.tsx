import type { LoginRequest } from "@/api/services/user-service";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Navigate, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useLogin, useUserToken } from "@/store/user-store";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";

export default function LoginForm() {
  const navigate = useNavigate();

  const login = useLogin();
  const token = useUserToken();

  const form = useForm<LoginRequest>();
  const { setFocus } = form;

  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(
    () => !!localStorage.getItem("remembered_name"),
  );

  useEffect(() => {
    const remembered = localStorage.getItem("remembered_name");
    if (remembered) {
      form.setValue("name", remembered);
      setTimeout(() => setFocus("password"), 0);
    } else {
      setTimeout(() => setFocus("name"), 0);
    }
  }, [form, setFocus]);

  const handleFinish = async (values: LoginRequest) => {
    setLoading(true);
    try {
      if (rememberMe) {
        localStorage.setItem("remembered_name", values.name);
      } else {
        localStorage.removeItem("remembered_name");
      }

      const response = await login(values);
      if (response.success) {
        navigate("/overview/", { replace: true });
      } else {
        toast.error(
          response.error === 1000
            ? "Benutzername oder Passwort falsch."
            : "Anmeldung fehlgeschlagen.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (token.authentication_token) {
    return <Navigate to="/overview/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center flex-col px-4 bg-gradient-to-b from-accent/40 to-background">
      <div className="flex items-center gap-3 mb-8">
        <img
          src="/logo-black.png"
          alt="Insulink"
          className="h-11 w-11 block dark:hidden"
        />
        <img
          src="/logo-white.png"
          alt="Insulink"
          className="h-11 w-11 hidden dark:block"
        />
        <span className="font-bold text-3xl tracking-tight">Insulink</span>
      </div>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Willkommen zurück</CardTitle>
          <CardDescription>
            Melde dich mit deinen Insulink-Zugangsdaten an.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFinish)}>
              <FormField
                control={form.control}
                name="name"
                rules={{ required: "Benutzername fehlt" }}
                render={({ field }) => (
                  <FormItem className="mb-5">
                    <FormLabel>Benutzername</FormLabel>
                    <FormControl>
                      <input
                        id="name"
                        placeholder="Benutzername"
                        className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-transparent focus:border-primary focus:outline-none transition-colors"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                rules={{ required: "Passwort fehlt" }}
                render={({ field }) => (
                  <FormItem className="mb-5">
                    <FormLabel>Passwort</FormLabel>
                    <FormControl>
                      <input
                        id="password"
                        type="password"
                        placeholder="Passwort"
                        className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-transparent focus:border-primary focus:outline-none transition-colors"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center mb-10">
                <input
                  id="remember-check"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 mr-3 border border-gray-600 rounded-sm bg-transparent"
                />
                <label htmlFor="remember-check" className="select-none">
                  Angemeldet bleiben
                </label>
              </div>

              <button
                type="submit"
                id="login"
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition inline-flex items-center justify-center disabled:opacity-60"
                disabled={loading}
              >
                Anmelden
                {loading && <Spinner className="ml-3" />}
              </button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
