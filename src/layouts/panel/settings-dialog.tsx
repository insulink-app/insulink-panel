import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import {
  UserRound,
  SunMoon,
  MonitorCog,
  Moon,
  Sun,
  Languages,
  type LucideIcon,
} from "@/components/icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import pkg from "@/../package.json";
import userService from "@/api/services/user-service";
import { useUserActions, useUserInformation } from "@/store/user-store";

const APPEARANCE = "appearance";
const LANGUAGE = "language";
const ACCOUNT = "account";

export function SettingsDialog({
  open,
  onOpenChange,
  initialCategory,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCategory?: string;
}) {
  const { t } = useTranslation();
  const [active, setActive] = useState(initialCategory ?? ACCOUNT);
  // Adopt the requested category each time the dialog is (re)opened.
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setActive(initialCategory ?? ACCOUNT);
  }
  if (!open && wasOpen) {
    setWasOpen(false);
  }

  const navItems = [
    { id: ACCOUNT, icon: UserRound },
    { id: APPEARANCE, icon: SunMoon },
    { id: LANGUAGE, icon: Languages },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[800px] p-0 gap-0 overflow-hidden">
        <div className="flex h-[520px] w-full">
          <div className="flex w-[210px] shrink-0 flex-col space-y-1 overflow-y-auto rounded-l-md bg-secondary/30 p-3">
            {navItems.map((item) => (
              <SidebarItem
                key={item.id}
                icon={item.icon}
                title={t(`settings.${item.id}`)}
                isActive={active === item.id}
                onClick={() => setActive(item.id)}
              />
            ))}
            <div className="mt-auto pt-2 text-center text-xs text-muted-foreground">
              Version: {pkg.version}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            <DialogHeader className="border-b-2 border-secondary">
              <DialogTitle className="pb-2">{t(`settings.${active}`)}</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {active === APPEARANCE ? (
                <AppearancePanel />
              ) : active === LANGUAGE ? (
                <LanguagePanel />
              ) : (
                <AccountPanel />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SidebarItem({
  icon: Icon,
  title,
  isActive,
  onClick,
}: {
  icon?: LucideIcon;
  title: string;
  isActive?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant={isActive ? "secondary" : "ghost"}
      className="w-full justify-start"
      onClick={onClick}
    >
      {Icon && <Icon className="mr-2 size-4" />}
      <span>{title}</span>
    </Button>
  );
}

// Device-local prefs (not part of the settings blob): theme via next-themes,
// language via i18next — same options as the dropdown selectors.
function AppearancePanel() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  return (
    <RadioGroup
      value={theme ?? "system"}
      onValueChange={setTheme}
      className="grid grid-cols-3 gap-4"
    >
      <OptionCard id="theme-system" value="system" selected={theme === "system"} icon={MonitorCog} label={t("panel.sidebar.theme.system")} />
      <OptionCard id="theme-light" value="light" selected={theme === "light"} icon={Sun} label={t("panel.sidebar.theme.light")} />
      <OptionCard id="theme-dark" value="dark" selected={theme === "dark"} icon={Moon} label={t("panel.sidebar.theme.dark")} />
    </RadioGroup>
  );
}

function LanguagePanel() {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? "en_US";
  return (
    <RadioGroup
      value={language}
      onValueChange={i18n.changeLanguage}
      className="grid grid-cols-2 gap-4"
    >
      <OptionCard id="lang-en" value="en_US" selected={language === "en_US"} flag="🇺🇸" label="English" />
      <OptionCard id="lang-de" value="de_DE" selected={language === "de_DE"} flag="🇩🇪" label="Deutsch" />
    </RadioGroup>
  );
}

// A selectable card (PodDeck-style): big icon or flag over a label, ringed when
// selected. The RadioGroupItem is visually hidden — the whole card is the label.
function OptionCard({
  id,
  value,
  selected,
  label,
  icon: Icon,
  flag,
}: {
  id: string;
  value: string;
  selected: boolean;
  label: string;
  icon?: LucideIcon;
  flag?: string;
}) {
  return (
    <Label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border p-6 transition-all hover:border-primary",
        selected && "border-primary ring-2 ring-primary/30",
      )}
    >
      <RadioGroupItem value={value} id={id} className="sr-only" />
      {flag ? (
        <span className="text-5xl leading-none">{flag}</span>
      ) : (
        Icon && <Icon className="size-12" />
      )}
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </Label>
  );
}

function AccountPanel() {
  const { t } = useTranslation();
  const info = useUserInformation();
  const { setUserInformation } = useUserActions();

  const [name, setName] = useState(info?.name ?? "");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");

  const nameMutation = useMutation({
    mutationFn: (updated: string) => userService.changeName(updated),
    onSuccess: (res) => {
      if (res.success) {
        setUserInformation({ name });
        toast.success(t("account.name_changed"));
      } else {
        toast.error(t("account.name_change_failed"));
      }
    },
    onError: () => toast.error(t("account.name_change_failed")),
  });

  const passwordMutation = useMutation({
    mutationFn: () => userService.changePassword(current, next),
    onSuccess: (res) => {
      if (res.success) {
        setCurrent("");
        setNext("");
        toast.success(t("account.password_changed"));
      } else {
        toast.error(t("account.password_change_failed"));
      }
    },
    onError: () => toast.error(t("account.password_change_failed")),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label>{t("account.name")}</Label>
        <Input
          className="w-64"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Button
          className="self-start"
          disabled={nameMutation.isPending || !name || name === info?.name}
          onClick={() => nameMutation.mutate(name)}
        >
          {t("common.save")}
          {nameMutation.isPending && <Spinner className="ml-2" />}
        </Button>
      </div>

      <div className="border-t" />

      <div className="flex flex-col gap-2">
        <Label>{t("account.current_password")}</Label>
        <Input
          type="password"
          className="w-64"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
        />
        <Label className="mt-2">{t("account.new_password")}</Label>
        <Input
          type="password"
          className="w-64"
          value={next}
          onChange={(event) => setNext(event.target.value)}
        />
        <Button
          className="self-start mt-2"
          disabled={passwordMutation.isPending || !current || !next}
          onClick={() => passwordMutation.mutate()}
        >
          {t("account.change_password")}
          {passwordMutation.isPending && <Spinner className="ml-2" />}
        </Button>
      </div>
    </div>
  );
}
