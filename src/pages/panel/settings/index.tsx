import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PanelPage from "@/layouts/panel";
import { PageHeader } from "@/components/page-header";
import { CardSkeleton } from "@/components/card-skeleton";
import { cn } from "@/lib/utils";
import { BasalSettings } from "./basal/basal-settings";
import { SettingsNav } from "./section-nav";
import { SETTINGS_SECTIONS, type Section } from "./sections";
import { SettingsCard, SettingsCardHeader } from "./settings-card";
import { useSettingsForm } from "./use-settings-form";

/**
 * Settings: the tabs as a list on the left, the form in the middle and a card
 * on the right that shows what the values mean. Basal swaps the form for its
 * profile list and editor.
 */
export default function SettingsPage() {
  const { t } = useTranslation();
  const { view } = useParams();
  const section = SETTINGS_SECTIONS.find((entry) => entry.id === view) ?? SETTINGS_SECTIONS[0];
  return (
    <PanelPage title={t("settings.section_" + section.id)} parents={[{ title: t("nav.settings") }]}>
      <PageHeader title={t("nav.settings")} />
      <div
        className={cn(
          "grid items-stretch gap-6 lg:grid-cols-[220px_minmax(0,1fr)]",
          section.id === "basal"
            ? "xl:grid-cols-[260px_minmax(0,1fr)_minmax(0,1.5fr)]"
            : "xl:grid-cols-[260px_minmax(0,1.1fr)_minmax(0,1fr)]",
        )}
      >
        <div className="lg:row-span-2 xl:row-span-1">
          <SettingsNav current={section.id} />
        </div>
        {section.Form ? <SectionForm key={section.id} section={section} /> : <BasalSettings />}
      </div>
    </PanelPage>
  );
}

function SectionForm({ section }: { section: Section }) {
  const { t } = useTranslation();
  const { api, loaded, dirty, saving, savedAt, reset, submit } = useSettingsForm();
  const { Form, Context } = section;
  if (!loaded || !Form || !Context) {
    return <CardSkeleton />;
  }
  return (
    <>
      <SettingsCard
        header={<SettingsCardHeader icon={section.icon} title={t("settings.section_" + section.id)} description={t("settings.desc_" + section.id)} />}
        dirty={dirty}
        saving={saving}
        savedAt={savedAt}
        onReset={reset}
        onSave={submit}
      >
        <Form api={api} />
      </SettingsCard>
      <Context api={api} />
    </>
  );
}
