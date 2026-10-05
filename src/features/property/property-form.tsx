"use client";

import {
  Dialog,
  DialogHeader,
  FormLayout,
  Layout,
  LayoutContent,
  LayoutFooter,
  LayoutHeader,
  Text,
  TextArea,
  Stack,
  Button,
} from "@astryxdesign/core";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Selector } from "@astryxdesign/core/Selector";
import type { SelectorOptionType } from "@astryxdesign/core/Selector";
import { TextInput } from "@astryxdesign/core/TextInput";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { listingPurposeFilter } from "@/lib/constants";
import {
  FileField,
  FormWizard,
  NumberField,
  SelectField,
  TextField,
} from "@/components/ui";
import { createPropertyAction, updatePropertyAction } from "./actions";
import { propertySchema } from "./validations";
import type { PropertyFormValues } from "./validations";
import type { PropertyDetail } from "@/types";
import type { GeoTree } from "@/features/geo/db-queries";

type Props = {
  editing?: PropertyDetail | null;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  owners: Array<{ id: string; name: string }>;
  geo: GeoTree;
  propertyList: PropertyDetail[];
};

type FeatureRow = { key: string; feature: string; value: string };
type OwnerRow = {
  key: string;
  mode: "existing" | "new";
  ownerId: string;
  name: string;
  email: string;
  phone: string;
  percentage: string;
};

const defaults: PropertyFormValues = {
  title: "",
  description: "",
  listingPurpose: "sale",
  price: 0,
  monthlyRent: undefined,
  bedrooms: undefined,
  bathrooms: undefined,
  yearBuilt: undefined,
  isBalloted: false,
  fbrValuation: undefined,
  dcRate: undefined,
  parcelNumber: "",
  cityId: "",
  unitId: "",
  images: [],
  documents: [],
};

function rowKey(): string {
  return Math.random().toString(36).slice(2);
}

export function PropertyForm({
  editing,
  isOpen,
  setIsOpen,
  owners: ownerOptions,
  geo,
  propertyList,
}: Props) {
  const [step, setStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cityId, setCityId] = useState("");
  const [societyId, setSocietyId] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [featureRows, setFeatureRows] = useState<FeatureRow[]>([]);
  const [ownerRows, setOwnerRows] = useState<OwnerRow[]>([]);
  const isResettingRef = useRef(false);
  const initialCityIdRef = useRef("");

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema) as Resolver<PropertyFormValues>,
    defaultValues: defaults,
    mode: "onBlur",
  });

  const formCityId = form.watch("cityId");
  const unitId = form.watch("unitId");

  useEffect(() => {
    if (!isOpen) return;
    setStep(0);
    setErrorMessage(null);
    initialCityIdRef.current =
      editing?.cityId ?? editing?.address?.cityId ?? "";
    setCityId(initialCityIdRef.current);
    setSocietyId(editing?.societyId ?? "");
    setSectorId(editing?.sectorId ?? "");
    setFeatureRows(
      editing?.features.map((feature) => ({
        key: rowKey(),
        feature: feature.feature,
        value: feature.value,
      })) ?? [],
    );
    setOwnerRows(
      editing?.owners.map((owner) => ({
        key: rowKey(),
        mode: owner.ownerId ? "existing" : "new",
        ownerId: owner.ownerId ?? "",
        name: owner.user?.name ?? "",
        email: owner.user?.email ?? "",
        phone: owner.user?.phone ?? "",
        percentage:
          owner.ownershipPercentage != null
            ? String(owner.ownershipPercentage)
            : "",
      })) ?? [],
    );
    form.reset({
      ...defaults,
      title: editing?.title ?? "",
      description: editing?.description ?? "",
      listingPurpose: editing?.listingPurpose ?? "sale",
      price: editing ? Number(editing.price) : 0,
      monthlyRent: editing?.monthlyRent
        ? Number(editing.monthlyRent)
        : undefined,
      bedrooms: editing?.bedrooms ?? undefined,
      bathrooms: editing?.bathrooms ?? undefined,
      yearBuilt: editing?.yearBuilt ?? undefined,
      isBalloted: editing?.isBalloted ?? false,
      fbrValuation: editing?.fbrValuation
        ? Number(editing.fbrValuation)
        : undefined,
      dcRate: editing?.dcRate ? Number(editing.dcRate) : undefined,
      parcelNumber: editing?.parcelNumber ?? "",
      cityId: editing?.cityId ?? editing?.address?.cityId ?? "",
      unitId: editing?.unitId ?? "",
    });
    isResettingRef.current = true;
  }, [editing, form, isOpen]);

  useEffect(() => {
    if (isResettingRef.current) {
      isResettingRef.current = false;
      return;
    }
    setCityId(formCityId);
    if (formCityId !== initialCityIdRef.current) {
      setSocietyId("");
      setSectorId("");
      form.setValue("unitId", "", { shouldValidate: true });
    }
  }, [formCityId, form]);

  useEffect(() => {
    if (isResettingRef.current) return;
    setSectorId("");
    form.setValue("unitId", "", { shouldValidate: true });
  }, [societyId, form]);

  useEffect(() => {
    if (isResettingRef.current) return;
    form.setValue("unitId", "", { shouldValidate: true });
  }, [sectorId, form]);

  const societyOptions = geo.societies.filter((s) => s.cityId === cityId);
  const sectorOptions = geo.sectors.filter((s) => s.societyId === societyId);
  const unitOptions = geo.units.filter((u) => u.sectorId === sectorId);

  const duplicateUnit = unitId
    ? propertyList.find(
        (candidate) =>
          candidate.id !== editing?.id &&
          candidate.status !== "archived" &&
          candidate.unitId === unitId,
      )
    : undefined;

  function toFormData(values: PropertyFormValues): FormData {
    const data = new FormData();
    data.set("title", values.title);
    if (values.description) data.set("description", values.description);
    data.set("listingPurpose", values.listingPurpose);
    data.set("price", String(values.price));
    if (values.monthlyRent !== undefined)
      data.set("monthlyRent", String(values.monthlyRent));
    if (values.bedrooms !== undefined)
      data.set("bedrooms", String(values.bedrooms));
    if (values.bathrooms !== undefined)
      data.set("bathrooms", String(values.bathrooms));
    if (values.yearBuilt !== undefined)
      data.set("yearBuilt", String(values.yearBuilt));
    if (values.parcelNumber) data.set("parcelNumber", values.parcelNumber);
    if (values.isBalloted) data.set("isBalloted", "true");
    if (values.fbrValuation !== undefined)
      data.set("fbrValuation", String(values.fbrValuation));
    if (values.dcRate !== undefined) data.set("dcRate", String(values.dcRate));
    data.set("cityId", values.cityId);
    data.set("unitId", values.unitId);
    data.set("features", JSON.stringify(featureRows));
    data.set("owners", JSON.stringify(ownerToPayload()));
    for (const file of values.images ?? []) data.append("images", file);
    for (const file of values.documents ?? []) data.append("documents", file);
    return data;
  }

  function ownerToPayload() {
    return ownerRows.map((row) => ({
      mode: row.mode,
      ownerId: row.mode === "existing" ? row.ownerId || undefined : undefined,
      name: row.mode === "new" ? row.name.trim() : undefined,
      email: row.mode === "new" ? row.email.trim() || undefined : undefined,
      phone: row.mode === "new" ? row.phone.trim() || undefined : undefined,
      ownershipPercentage: Number(row.percentage),
    }));
  }

  function validateOwnerRows(): string | null {
    if (ownerRows.length === 0) return null;
    let sum = 0;
    let index = 0;
    for (const row of ownerRows) {
      const percentage = Number(row.percentage);
      if (!Number.isInteger(percentage) || percentage < 1 || percentage > 100) {
        return `Owner ${index + 1}: enter a percentage between 1 and 100.`;
      }
      if (row.mode === "existing" && !row.ownerId) {
        return `Owner ${index + 1}: select an owner.`;
      }
      if (row.mode === "new") {
        if (!row.name.trim()) return `Owner ${index + 1}: name is required.`;
        if (!row.email.trim() && !row.phone.trim())
          return `Owner ${index + 1}: provide an email or phone.`;
      }
      sum += percentage;
      index += 1;
    }
    if (sum !== 100) return "Ownership percentages must add up to 100.";
    return null;
  }

  const submit = form.handleSubmit(async (values) => {
    setErrorMessage(null);
    if (featureRows.some((row) => !row.feature.trim())) {
      setErrorMessage("Every feature row needs a name.");
      return;
    }
    const ownersError = validateOwnerRows();
    if (ownersError) {
      setErrorMessage(ownersError);
      return;
    }
    const raw = toFormData(values);
    const result = editing
      ? await updatePropertyAction(editing.id, raw)
      : await createPropertyAction(raw);
    if (!result.ok) {
      setErrorMessage(result.error.message);
      return;
    }
    setIsOpen(false);
  });

  const next = async () => {
    const fields: Array<Array<keyof PropertyFormValues>> = [
      ["title", "price", "monthlyRent"],
      ["cityId", "unitId"],
      [],
    ];
    const valid = await form.trigger(fields[step]);
    if (valid) setStep((value) => value + 1);
  };

  const cityOptions: SelectorOptionType[] = [
    { value: "", label: "Select a city" },
    ...geo.cities.map((c) => ({
      value: c.id,
      label: c.province ? `${c.name} (${c.province})` : c.name,
    })),
  ];

  return (
    <Dialog isOpen={isOpen} onOpenChange={setIsOpen} purpose="form" width="40%">
      <Layout
        header={
          <LayoutHeader>
            <DialogHeader
              title={editing ? "Update Property" : "Add New Property"}
              subtitle="Complete all three steps before saving"
            />
          </LayoutHeader>
        }
        content={
          <LayoutContent>
            {errorMessage ? <Text color="accent">{errorMessage}</Text> : null}
            {step === 0 ? (
              <FormLayout>
                <TextField form={form} name="title" label="Title" isRequired />
                <TextArea
                  label="Description"
                  value={form.watch("description") ?? ""}
                  onChange={(value) => form.setValue("description", value)}
                  isOptional
                />
                <FormLayout direction="horizontal">
                  <SelectField
                    form={form}
                    name="listingPurpose"
                    label="Listing purpose"
                    options={listingPurposeFilter}
                    isRequired
                  />
                  <NumberField
                    form={form}
                    name="price"
                    label="Price"
                    isRequired
                  />
                </FormLayout>
                <FormLayout direction="horizontal">
                  <NumberField
                    form={form}
                    name="monthlyRent"
                    label="Monthly rent"
                    isOptional
                  />
                  <NumberField
                    form={form}
                    name="yearBuilt"
                    label="Year built"
                    isOptional
                  />
                </FormLayout>
                <FormLayout direction="horizontal">
                  <NumberField
                    form={form}
                    name="fbrValuation"
                    label="FBR Valuation"
                    isOptional
                  />
                  <NumberField
                    form={form}
                    name="dcRate"
                    label="DC Rate"
                    isOptional
                  />
                </FormLayout>
                <FormLayout direction="horizontal">
                  <NumberField
                    form={form}
                    name="bedrooms"
                    label="Bedrooms"
                    isOptional
                  />
                  <NumberField
                    form={form}
                    name="bathrooms"
                    label="Bathrooms"
                    isOptional
                  />
                </FormLayout>
              </FormLayout>
            ) : null}
            {step === 1 ? (
              <FormLayout>
                <SelectField
                  form={form}
                  name="cityId"
                  label="City"
                  options={cityOptions}
                  isRequired
                />
                <FormLayout direction="horizontal">
                  <Selector
                    label="Society"
                    isOptional
                    options={[
                      {
                        value: "",
                        label: cityId
                          ? "Select a society"
                          : "Select a city first",
                      },
                      ...societyOptions.map((s) => ({
                        value: s.id,
                        label: s.name,
                      })),
                    ]}
                    value={societyId}
                    onChange={setSocietyId}
                  />
                  <Selector
                    label="Sector"
                    isOptional
                    options={[
                      {
                        value: "",
                        label: societyId
                          ? "Select a sector"
                          : "Select a society first",
                      },
                      ...sectorOptions.map((s) => ({
                        value: s.id,
                        label: s.name,
                      })),
                    ]}
                    value={sectorId}
                    onChange={setSectorId}
                  />
                </FormLayout>
                <FormLayout direction="horizontal">
                  <SelectField
                    form={form}
                    name="unitId"
                    label="Unit"
                    options={[
                      {
                        value: "",
                        label: sectorId
                          ? "Select a unit"
                          : "Select a sector first",
                      },
                      ...unitOptions.map((u) => ({
                        value: u.id,
                        label: `Unit ${u.unitNumber}`,
                      })),
                    ]}
                    isRequired
                  />
                </FormLayout>
                {duplicateUnit ? (
                  <Text color="secondary">
                    This unit is already used by &quot;{duplicateUnit.title}
                    &quot;. You can still list multiple properties on the same
                    unit.
                  </Text>
                ) : null}
              </FormLayout>
            ) : null}
            {step === 2 ? (
              <FormLayout>
                <TextField
                  form={form}
                  name="parcelNumber"
                  label="Parcel / reference number"
                  isOptional
                />
                <Stack gap={3}>
                  <Text type="body" color="secondary">
                    Features
                  </Text>
                  {featureRows.map((row, index) => (
                    <Stack
                      key={row.key}
                      direction="horizontal"
                      gap={2}
                      vAlign="center"
                    >
                      <TextInput
                        label="Name"
                        value={row.feature}
                        onChange={(value) =>
                          setFeatureRows((rows) =>
                            rows.map((r) =>
                              r.key === row.key ? { ...r, feature: value } : r,
                            ),
                          )
                        }
                        placeholder="e.g. Corner plot"
                      />
                      <TextInput
                        label="Value"
                        isOptional
                        value={row.value}
                        onChange={(value) =>
                          setFeatureRows((rows) =>
                            rows.map((r) =>
                              r.key === row.key ? { ...r, value } : r,
                            ),
                          )
                        }
                        placeholder="e.g. 10 marla"
                      />
                      <Button
                        label="Remove"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setFeatureRows((rows) =>
                            rows.filter((r) => r.key !== row.key),
                          )
                        }
                      />
                      <Text type="body" color="secondary">
                        {index + 1}
                      </Text>
                    </Stack>
                  ))}
                  <Stack direction="horizontal" gap={2} vAlign="center">
                    <Button
                      label="Add feature"
                      size="sm"
                      variant="secondary"
                      isDisabled={featureRows.length >= 20}
                      onClick={() =>
                        setFeatureRows((rows) => [
                          ...rows,
                          { key: rowKey(), feature: "", value: "" },
                        ])
                      }
                    />
                    <Text type="body" color="secondary">
                      {featureRows.length}/20
                    </Text>
                  </Stack>
                </Stack>
                <Stack gap={3}>
                  <Text type="body" color="secondary">
                    Owners
                  </Text>
                  {ownerRows.map((row, index) => (
                    <Stack key={row.key} gap={2}>
                      <Stack direction="horizontal" gap={2} vAlign="center">
                        <Selector
                          label="Owner"
                          options={[
                            { value: "existing", label: "Select existing" },
                            { value: "new", label: "Create new" },
                          ]}
                          value={row.mode}
                          onChange={(value) =>
                            setOwnerRows((rows) =>
                              rows.map((r) =>
                                r.key === row.key
                                  ? { ...r, mode: value as "existing" | "new" }
                                  : r,
                              ),
                            )
                          }
                        />
                        <Text type="body" color="secondary">
                          Owner {index + 1}
                        </Text>
                        <Button
                          label="Remove"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setOwnerRows((rows) =>
                              rows.filter((r) => r.key !== row.key),
                            )
                          }
                        />
                      </Stack>
                      {row.mode === "existing" ? (
                        <Stack direction="horizontal" gap={2} vAlign="center">
                          <Selector
                            label="Select owner"
                            options={[
                              { value: "", label: "Select an owner" },
                              ...ownerOptions.map((o) => ({
                                value: o.id,
                                label: o.name,
                              })),
                            ]}
                            value={row.ownerId}
                            onChange={(value) =>
                              setOwnerRows((rows) =>
                                rows.map((r) =>
                                  r.key === row.key
                                    ? { ...r, ownerId: value }
                                    : r,
                                ),
                              )
                            }
                          />
                          <NumberInput
                            label="Ownership %"
                            value={
                              row.percentage === ""
                                ? null
                                : Number(row.percentage)
                            }
                            onChange={(value) =>
                              setOwnerRows((rows) =>
                                rows.map((r) =>
                                  r.key === row.key
                                    ? {
                                        ...r,
                                        percentage:
                                          value == null ? "" : String(value),
                                      }
                                    : r,
                                ),
                              )
                            }
                          />
                        </Stack>
                      ) : (
                        <Stack direction="horizontal" gap={2} vAlign="center">
                          <TextInput
                            label="Name"
                            value={row.name}
                            onChange={(value) =>
                              setOwnerRows((rows) =>
                                rows.map((r) =>
                                  r.key === row.key ? { ...r, name: value } : r,
                                ),
                              )
                            }
                          />
                          <TextInput
                            label="Email"
                            type="email"
                            isOptional
                            value={row.email}
                            onChange={(value) =>
                              setOwnerRows((rows) =>
                                rows.map((r) =>
                                  r.key === row.key
                                    ? { ...r, email: value }
                                    : r,
                                ),
                              )
                            }
                          />
                          <TextInput
                            label="Phone"
                            isOptional
                            value={row.phone}
                            onChange={(value) =>
                              setOwnerRows((rows) =>
                                rows.map((r) =>
                                  r.key === row.key
                                    ? { ...r, phone: value }
                                    : r,
                                ),
                              )
                            }
                          />
                          <NumberInput
                            label="Ownership %"
                            value={
                              row.percentage === ""
                                ? null
                                : Number(row.percentage)
                            }
                            onChange={(value) =>
                              setOwnerRows((rows) =>
                                rows.map((r) =>
                                  r.key === row.key
                                    ? {
                                        ...r,
                                        percentage:
                                          value == null ? "" : String(value),
                                      }
                                    : r,
                                ),
                              )
                            }
                          />
                        </Stack>
                      )}
                    </Stack>
                  ))}
                  <Stack direction="horizontal" gap={2} vAlign="center">
                    <Button
                      label="Add owner"
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setOwnerRows((rows) => [
                          ...rows,
                          {
                            key: rowKey(),
                            mode: "existing",
                            ownerId: "",
                            name: "",
                            email: "",
                            phone: "",
                            percentage: "",
                          },
                        ])
                      }
                    />
                  </Stack>
                </Stack>
                <FileField
                  form={form}
                  name="images"
                  label="Images (first image is the cover)"
                  accept="image/*"
                  isMultiple
                  maxFiles={10}
                  isOptional
                  mode="dropzone"
                />
                <FileField
                  form={form}
                  name="documents"
                  label="Property documents"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png"
                  isMultiple
                  maxFiles={20}
                  isOptional
                  mode="dropzone"
                />
              </FormLayout>
            ) : null}
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <FormWizard
              step={step}
              steps={["Basics", "Location", "Details"]}
              onBack={() => setStep((value) => value - 1)}
              onNext={next}
              onSubmit={submit}
              canSubmit={step === 2}
            />
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
