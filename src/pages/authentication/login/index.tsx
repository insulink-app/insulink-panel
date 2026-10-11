import type { LoginRequest } from "@/api/services/user-service";
import { Eye, EyeOff } from "@/components/icons";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const navigate = useNavigate();

  const login = useLogin();
  const token = useUserToken();

  const form = useForm<LoginRequest>();
  const { setFocus } = form;

  const [loading, setLoading] = useState(false);
  const [passwordShown, setPasswordShown] = useState(false);
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
            ? t("login.invalid_credentials")
            : t("login.failed"),
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
    <div className="relative min-h-screen flex items-center justify-start flex-col px-4 pt-[20vh] pb-16 overflow-hidden bg-background">

      <div className="relative flex flex-col items-center mb-10 text-center">
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
          <span className="font-extrabold text-3xl tracking-tight">
            Insulink
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight max-w-[14ch]">
          {t("login.tagline")}
        </h1>
      </div>

      <Card className="relative w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-lg font-extrabold">
            {t("login.welcome")}
          </CardTitle>
          <CardDescription>{t("login.subtitle")}</CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFinish)}>
              <FormField
                control={form.control}
                name="name"
                rules={{ required: t("login.username_missing") }}
                render={({ field }) => (
                  <FormItem className="mb-5">
                    <FormLabel>{t("login.username")}</FormLabel>
                    <FormControl>
                      <input
                        id="name"
                        placeholder={t("login.username")}
                        className="w-full px-4 py-2.5 h-12 rounded-2xl bg-ground border-[1.5px] border-transparent placeholder:text-placeholder focus:border-primary focus:outline-none transition-colors"
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
                rules={{ required: t("login.password_missing") }}
                render={({ field }) => (
                  <FormItem className="mb-5">
                    <FormLabel>{t("login.password")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <input
                          id="password"
                          type={passwordShown ? "text" : "password"}
                          placeholder={t("login.password")}
                          className="w-full pl-4 pr-12 py-2.5 h-12 rounded-2xl bg-ground border-[1.5px] border-transparent placeholder:text-placeholder focus:border-primary focus:outline-none transition-colors"
                          {...field}
                        />
                        {/* type="button" — inside a form, the default would submit it. */}
                        <button
                          type="button"
                          onClick={() => setPasswordShown((shown) => !shown)}
                          aria-label={t(
                            passwordShown
                              ? "login.hide_password"
                              : "login.show_password",
                          )}
                          className="absolute inset-y-0 right-0 px-4 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {passwordShown ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </div>
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
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 mr-3 rounded-sm border-divider bg-ground text-primary"
                />
                <label htmlFor="remember-check" className="select-none">
                  {t("login.remember")}
                </label>
              </div>

              <button
                type="submit"
                id="login"
                className="w-full h-12 rounded-full bg-primary text-primary-foreground font-extrabold hover:brightness-110 transition inline-flex items-center justify-center disabled:opacity-60"
                disabled={loading}
              >
                {t("login.submit")}
                {loading && <Spinner className="ml-3" />}
              </button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
