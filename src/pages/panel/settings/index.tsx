import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PanelPage from "@/layouts/panel";
import { SETTINGS_SECTIONS, SectionPanel } from "./sections";

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
      <div className="py-6">
        <SectionPanel section={section} />
      </div>
    </PanelPage>
  );
}
