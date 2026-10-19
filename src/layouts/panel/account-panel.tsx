import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmDelete } from "@/components/confirm-delete";
import { apiErrorCode } from "@/api/api-error";
import userService from "@/api/services/user-service";
import { rewrapDataKey } from "@/lib/data-key";
import { useRouter } from "@/routes/hooks";
import { useUserActions, useUserInformation } from "@/store/user-store";

/** The api's minimum for a new password (`User.MINIMUM_PASSWORD_LENGTH`). */
const MINIMUM_PASSWORD_LENGTH = 10;

/** Thrown when the current password does not open the account's data key. */
class WrongPasswordError extends Error {}

/** The account's wrapped data key, null when it has none (the api's 1000). */
async function accountKey(): Promise<string | null> {
  try {
    return (await userService.findKey()).key ?? null;
  } catch (failure) {
    if (apiErrorCode(failure) === 1000) {
      return null;
    }
    throw failure;
  }
}

/**
 * Changes the password and sends the data key re-wrapped for the new one, so
 * a reinstalled app can still open the pod key (`@/lib/data-key`). A key the
 * current password does not open stops the change before it is sent.
 */
async function changePasswordKeepingKey(current: string, next: string) {
  const envelope = await accountKey();
  const rewrapped = envelope ? await rewrapDataKey(envelope, current, next) : null;
  if (envelope && !rewrapped) {
    throw new WrongPasswordError();
  }
  return userService.changePassword(current, next, rewrapped ?? undefined);
}

function passwordErrorKey(failure: unknown) {
  if (failure instanceof WrongPasswordError || apiErrorCode(failure) === 1000) {
    return "account.password_wrong";
  }
  if (apiErrorCode(failure) === 1005) {
    return "account.password_too_short";
  }
  return "account.password_change_failed";
}

export function AccountPanel() {
  return (
    <div className="flex flex-col gap-6">
      <NameSection />
      <div className="border-t" />
      <PasswordSection />
      <div className="border-t" />
      <DeleteSection />
    </div>
  );
}

function NameSection() {
  const { t } = useTranslation();
  const info = useUserInformation();
  const { setUserInformation } = useUserActions();
  const [name, setName] = useState(info?.name ?? "");

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

  return (
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
  );
}

function PasswordSection() {
  const { t } = useTranslation();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const tooShort = next.length > 0 && next.length < MINIMUM_PASSWORD_LENGTH;

  const passwordMutation = useMutation({
    mutationFn: () => changePasswordKeepingKey(current, next),
    onSuccess: (res) => {
      if (res.success) {
        setCurrent("");
        setNext("");
        toast.success(t("account.password_changed"));
      } else {
        toast.error(t(passwordErrorKey(res)));
      }
    },
    onError: (failure) => toast.error(t(passwordErrorKey(failure))),
  });

  return (
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
      {tooShort && (
        <p className="text-sm text-muted-foreground">
          {t("account.password_too_short")}
        </p>
      )}
      <Button
        className="self-start mt-2"
        disabled={passwordMutation.isPending || !current || !next || tooShort}
        onClick={() => passwordMutation.mutate()}
      >
        {t("account.change_password")}
        {passwordMutation.isPending && <Spinner className="ml-2" />}
      </Button>
    </div>
  );
}

/**
 * Deletes the account with all of its data. Needs the password on top of the
 * session, so a panel left open or a stolen session cannot wipe an account.
 */
function DeleteSection() {
  const { t } = useTranslation();
  const { clearUserToken, clearUserInformation } = useUserActions();
  const { replace } = useRouter();
  const [password, setPassword] = useState("");

  const deleteMutation = useMutation({
    mutationFn: () => userService.deleteAccount(password),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(t("account.delete_failed"));
        return;
      }
      clearUserToken();
      clearUserInformation();
      replace("/login/");
    },
    onError: () => toast.error(t("account.delete_failed")),
  });

  return (
    <div className="flex flex-col gap-2">
      <Label>{t("account.delete")}</Label>
      <p className="text-sm text-muted-foreground max-w-md">
        {t("account.delete_description")}
      </p>
      <Input
        type="password"
        className="w-64"
        placeholder={t("account.current_password")}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <ConfirmDelete
        title={t("account.delete_title")}
        description={t("account.delete_description")}
        onConfirm={() => deleteMutation.mutate()}
      >
        <Button
          variant="destructive"
          className="self-start mt-2"
          disabled={deleteMutation.isPending || !password}
        >
          {t("account.delete")}
          {deleteMutation.isPending && <Spinner className="ml-2" />}
        </Button>
      </ConfirmDelete>
    </div>
  );
}
