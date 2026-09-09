"use client";

import { useState } from "react";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Heading, Stack, Text } from "@astryxdesign/core";
import type { MapPayload, UserRole } from "@/types";
import { PropertyList } from "./property-list";
import { MapTab } from "./map";

export function PropertiesTabs(props: {
  properties: React.ComponentProps<typeof PropertyList>["properties"];
  owners: React.ComponentProps<typeof PropertyList>["owners"];
  userRole: UserRole;
  canManage: boolean;
  mapPayload: MapPayload;
}) {
  const [active, setActive] = useState("properties");

  return (
    <Stack gap={5}>
      <Stack>
        <Heading level={1}>Properties</Heading>
        <Text type="body">Manage your property portfolio</Text>
      </Stack>
      <TabList value={active} onChange={setActive} hasDivider>
        <Tab value="properties" label="Properties" />
        <Tab value="maps" label="Maps" />
      </TabList>
      {active === "properties" ? (
        <PropertyList
          properties={props.properties}
          owners={props.owners}
          userRole={props.userRole}
          canManage={props.canManage}
        />
      ) : (
        <MapTab payload={props.mapPayload} />
      )}
    </Stack>
  );
}
