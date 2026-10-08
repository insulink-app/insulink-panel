import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PanelPage from "@/layouts/panel";
import { PageHeader } from "@/components/page-header";
import { SETTINGS_SECTIONS, SectionPanel } from "./sections";
import { SettingsNav } from "./section-nav";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { view } = useParams();
  const section =
    SETTINGS_SECTIONS.find((entry) => entry.id === view) ?? SETTINGS_SECTIONS[0];

  return (
    <PanelPage
      title={t("settings.section_" + section.id)}
      parents={[{ title: t("nav.settings") }]}
    >
      <PageHeader title={t("nav.settings")} />
      <SettingsNav current={section.id} />
      <SectionPanel section={section} />
    </PanelPage>
  );
}
