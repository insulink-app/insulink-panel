import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { GlucoseHero } from "@/components/glucose-hero";
import { GlucoseLineChart } from "@/components/glucose-line-chart";
import { DEFAULT_TARGET_HIGH, DEFAULT_TARGET_LOW } from "@/lib/glucose";
import shareService from "@/api/services/share-service";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The public page a share link opens: the owner's current glucose and their
 * last 24 h, nothing else, refreshed every minute. No sign-in: the link's id is
 * the credential. Coloured against the fixed 70 to 180 range, because the link
 * carries none of the owner's settings. Greets the link's holder by its name. Installable as a PWA (`useShareManifest`).
 */
export default function SharedGlucosePage() {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  useShareManifest(t("share.app_title"));
  useShareWorker();
  const { data, isLoading } = useQuery({
    queryKey: ["shared-glucose", id],
    queryFn: () => shareService.shared(id),
    refetchInterval: 60_000,
  });
  const entries = data?.entries ?? [];
  const latest = entries[entries.length - 1];
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      {data?.success && <ShareGreeting name={data.name} owner={data.owner} />}
      {data && !data.success ? (
        <p className="text-muted-foreground">{t("share.gone")}</p>
      ) : (
        <>
          <GlucoseHero entries={entries} low={DEFAULT_TARGET_LOW} high={DEFAULT_TARGET_HIGH} size={80} isLoading={isLoading} />
          <Card className="p-6">
            {latest ? (
              <GlucoseLineChart
                rows={entries.map((entry) => ({ time: entry.time, value: entry.value }))}
                low={DEFAULT_TARGET_LOW}
                high={DEFAULT_TARGET_HIGH}
                start={latest.time - DAY_MS}
                end={latest.time}
                nowTime={latest.time}
                height={300}
              />
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">{t("common.no_data")}</p>
            )}
          </Card>
        </>
      )}
    </main>
  );
}

/** "Hello Mum" over "Lukas's glucose": whom the link is for, and whose values it shows. */
function ShareGreeting({ name, owner }: { name?: string; owner?: string }) {
  const { t } = useTranslation();
  return (
    <header>
      <h1 className="text-2xl font-extrabold">{t("share.greeting", { name })}</h1>
      <p className="text-muted-foreground">{t("share.owner_glucose", { owner })}</p>
    </header>
  );
}

/**
 * Links the share manifest while the page is open and names the tab. The
 * manifest has no `start_url`, so an installed copy opens the very link it was
 * installed from, token included.
 */
function useShareManifest(title: string) {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = `${import.meta.env.BASE_URL}share.webmanifest`;
    document.head.appendChild(link);
    const previousTitle = document.title;
    document.title = title;
    return () => {
      link.remove();
      document.title = previousTitle;
    };
  }, [title]);
}

/**
 * Registers the offline worker (vite.config.ts) for the share pages only, so
 * the signed-in panel never runs from a cache. Production builds only: the dev
 * server has no `sw.js`.
 */
function useShareWorker() {
  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) {
      return;
    }
    const base = import.meta.env.BASE_URL;
    navigator.serviceWorker.register(`${base}sw.js`, { scope: `${base}share/` }).catch(() => undefined);
  }, []);
}
