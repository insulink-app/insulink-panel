import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PanelPage from "@/layouts/panel";
import { pageSections, SectionPanel } from "./sections";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { view } = useParams();
  const sections = pageSections();
  const section = sections.find((entry) => entry.id === view) ?? sections[0];

  return (
    <PanelPage title={t("settings.section_" + section.id)}>
      <div className="py-6">
        <SectionPanel section={section} />
      </div>
    </PanelPage>
  );
}
