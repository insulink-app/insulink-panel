import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import PanelPage from "@/layouts/panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import userService from "@/api/services/user-service";
import { useUserActions, useUserInformation } from "@/store/user-store";

export default function AccountPage() {
  const info = useUserInformation();
  const { setUserInformation } = useUserActions();

  const [name, setName] = useState(info?.name ?? "");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");

  const nameMutation = useMutation({
    mutationFn: (n: string) => userService.changeName(n),
    onSuccess: (res) => {
      if (res.success) {
        setUserInformation({ name });
        toast.success("Name geändert.");
      } else {
        toast.error("Name konnte nicht geändert werden.");
      }
    },
    onError: () => toast.error("Name konnte nicht geändert werden."),
  });

  const passwordMutation = useMutation({
    mutationFn: () => userService.changePassword(current, next),
    onSuccess: (res) => {
      if (res.success) {
        setCurrent("");
        setNext("");
        toast.success("Passwort geändert.");
      } else {
        toast.error("Passwort konnte nicht geändert werden.");
      }
    },
    onError: () => toast.error("Passwort konnte nicht geändert werden."),
  });

  return (
    <PanelPage title="Account">
      <div className="py-6 flex flex-col gap-6 max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>Benutzername</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button
              className="self-start"
              disabled={nameMutation.isPending || !name || name === info?.name}
              onClick={() => nameMutation.mutate(name)}
            >
              Speichern
              {nameMutation.isPending && <Spinner className="ml-2" />}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Passwort ändern</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Aktuelles Passwort</Label>
              <Input
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Neues Passwort</Label>
              <Input
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            </div>
            <Button
              className="self-start"
              disabled={passwordMutation.isPending || !current || !next}
              onClick={() => passwordMutation.mutate()}
            >
              Passwort ändern
              {passwordMutation.isPending && <Spinner className="ml-2" />}
            </Button>
          </CardContent>
        </Card>
      </div>
    </PanelPage>
  );
}
