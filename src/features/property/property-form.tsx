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
} from "@astryxdesign/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import {
  countryFilter,
  propertyTypeFilter,
  stateFilter,
} from "@/lib/constants";
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

type Props = {
  editing?: PropertyDetail | null
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  owners: Array<{ id: string; name: string }>
  propertyList: PropertyDetail[]
}

const defaults: PropertyFormValues = {
  title: "",
  description: "",
  type: "residential",
  price: 0,
  monthlyRent: undefined,
  area: 0,
  country: countryFilter[0].value,
  state: stateFilter[0].value,
  city: "",
  street: "",
  zipCode: "",
  locality: "",
  latitude: "",
  longitude: "",
  formattedAddress: "",
  bedrooms: undefined,
  bathrooms: undefined,
  yearBuilt: undefined,
  parcelNumber: "",
  ownerId: "",
  coverImage: null,
  documents: [],
}

export function PropertyForm({ editing, isOpen, setIsOpen, owners, propertyList }: Props) {
  const [step, setStep] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema) as Resolver<PropertyFormValues>,
    defaultValues: defaults,
    mode: "onBlur",
  })

  useEffect(() => {
    if (!isOpen) return
    setStep(0)
    setErrorMessage(null)
    if (editing) {
      form.reset({
        ...defaults,
        title: editing.title,
        description: editing.description ?? "",
        type: editing.type,
        price: Number(editing.price),
        monthlyRent: editing.monthlyRent ? Number(editing.monthlyRent) : undefined,
        area: editing.area,
        bedrooms: editing.bedrooms ?? undefined,
        bathrooms: editing.bathrooms ?? undefined,
        yearBuilt: editing.yearBuilt ?? undefined,
        parcelNumber: editing.parcelNumber ?? "",
        ownerId: editing.owner?.ownerId ?? "",
        coverImage: null,
        documents: [],
        country: editing.address?.country ?? defaults.country,
        state: editing.address?.state ?? defaults.state,
        city: editing.address?.city ?? "",
        street: editing.address?.street ?? "",
        zipCode: editing.address?.zipCode ?? "",
        locality: editing.address?.area ?? "",
        latitude: editing.address?.latitude ?? "",
        longitude: editing.address?.longitude ?? "",
      })
    } else {
      form.reset(defaults)
    }
  }, [editing, form, isOpen])

  const normalizedAddress = [
    form.watch("street"),
    form.watch("city"),
    form.watch("state"),
    form.watch("zipCode"),
  ]
    .map((value) => value?.trim().toLowerCase())
    .filter(Boolean)
    .join("|")

  const duplicateAddress = propertyList.find(
    (candidate) =>
      candidate.id !== editing?.id &&
      candidate.address &&
      [
        candidate.address.street,
        candidate.address.city,
        candidate.address.state,
        candidate.address.zipCode,
      ]
        .map((value) => value?.trim().toLowerCase())
        .filter(Boolean)
        .join("|") === normalizedAddress &&
      normalizedAddress.length > 0,
  )

  function toFormData(values: PropertyFormValues): FormData {
    const data = new FormData()
    data.set("title", values.title)
    if (values.description) data.set("description", values.description)
    data.set("type", values.type)
    data.set("price", String(values.price))
    if (values.monthlyRent !== undefined)
      data.set("monthlyRent", String(values.monthlyRent))
    data.set("area", String(values.area))
    if (values.bedrooms !== undefined) data.set("bedrooms", String(values.bedrooms))
    if (values.bathrooms !== undefined)
      data.set("bathrooms", String(values.bathrooms))
    if (values.yearBuilt !== undefined)
      data.set("yearBuilt", String(values.yearBuilt))
    if (values.parcelNumber) data.set("parcelNumber", values.parcelNumber)
    if (values.ownerId) data.set("ownerId", values.ownerId)
    data.set("country", values.country)
    data.set("state", values.state)
    data.set("city", values.city)
    data.set("street", values.street)
    data.set("zipCode", values.zipCode)
    if (values.locality) data.set("locality", values.locality)
    if (values.latitude) data.set("latitude", values.latitude)
    if (values.longitude) data.set("longitude", values.longitude)
    if (values.formattedAddress) data.set("formattedAddress", values.formattedAddress)
    if (values.coverImage) data.set("coverImage", values.coverImage)
    for (const file of values.documents ?? []) data.append("documents", file)
    return data
  }

  const submit = form.handleSubmit(async (values) => {
    setErrorMessage(null)
    const raw = toFormData(values)
    const result = editing
      ? await updatePropertyAction(editing.id, raw)
      : await createPropertyAction(raw)
    if (!result.ok) {
      setErrorMessage(result.error.message)
      return
    }
    setIsOpen(false)
  })

  const next = async () => {
    const fields: Array<Array<keyof PropertyFormValues>> = [
      ["title", "price", "monthlyRent", "area"],
      ["country", "state", "city", "street", "zipCode"],
      [],
    ]
    const valid = await form.trigger(fields[step])
    if (valid) setStep((value) => value + 1)
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={setIsOpen} purpose="form" width="60%">
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
            {errorMessage ? (
              <Text color="accent">{errorMessage}</Text>
            ) : null}
            {step === 0 ? (
              <FormLayout>
                <TextField form={form} name="title" label="Title" isRequired />
                <TextArea
                  label="Description"
                  value={form.watch("description") ?? ""}
                  onChange={(value) => form.setValue("description", value)}
                  isOptional
                />
                <SelectField
                  form={form}
                  name="type"
                  label="Type"
                  options={propertyTypeFilter}
                  isRequired
                />
                <FormLayout direction="horizontal">
                  <NumberField form={form} name="price" label="Price" isRequired />
                  <NumberField
                    form={form}
                    name="monthlyRent"
                    label="Monthly rent"
                    isOptional
                  />
                  <NumberField form={form} name="area" label="Area" isRequired />
                </FormLayout>
                <FormLayout direction="horizontal">
                  <NumberField form={form} name="bedrooms" label="Bedrooms" isOptional />
                  <NumberField
                    form={form}
                    name="bathrooms"
                    label="Bathrooms"
                    isOptional
                  />
                  <NumberField
                    form={form}
                    name="yearBuilt"
                    label="Year built"
                    isOptional
                  />
                </FormLayout>
              </FormLayout>
            ) : null}
            {step === 1 ? (
              <FormLayout>
                <FormLayout direction="horizontal">
                  <SelectField
                    form={form}
                    name="country"
                    label="Country"
                    options={countryFilter}
                    isRequired
                  />
                  <SelectField
                    form={form}
                    name="state"
                    label="State"
                    options={stateFilter}
                    isRequired
                  />
                </FormLayout>
                <FormLayout direction="horizontal">
                  <TextField form={form} name="city" label="City" isRequired />
                  <TextField form={form} name="zipCode" label="ZIP code" isRequired />
                </FormLayout>
                <FormLayout direction="horizontal">
                  <TextField
                    form={form}
                    name="street"
                    label="Street"
                    isRequired
                  />
                  <TextField
                    form={form}
                    name="locality"
                    label="Area / locality"
                    isOptional
                    placeholder="e.g. DHA Phase 5"
                  />
                </FormLayout>
                {duplicateAddress ? (
                  <Text color="secondary">
                    Another property may already use this address:{" "}
                    {duplicateAddress.title}.
                  </Text>
                ) : null}
                <Text color="secondary">
                  Coordinates are optional. The server geocodes this address when
                  omitted.
                </Text>
                <FormLayout direction="horizontal">
                  <TextField
                    form={form}
                    name="latitude"
                    label="Latitude"
                    isOptional
                  />
                  <TextField
                    form={form}
                    name="longitude"
                    label="Longitude"
                    isOptional
                  />
                </FormLayout>
              </FormLayout>
            ) : null}
            {step === 2 ? (
              <FormLayout>
                <SelectField
                  form={form}
                  name="ownerId"
                  label="Primary owner"
                  options={[
                    { label: "No owner", value: "" },
                    ...owners.map((owner) => ({
                      label: owner.name,
                      value: owner.id,
                    })),
                  ]}
                  isOptional
                />
                <TextField
                  form={form}
                  name="parcelNumber"
                  label="Parcel / reference number"
                  isOptional
                />
                <FileField
                  form={form}
                  name="coverImage"
                  label="Cover image"
                  accept="image/*"
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
              steps={["Basics", "Address", "Details"]}
              onBack={() => setStep((value) => value - 1)}
              onNext={next}
              onSubmit={submit}
              canSubmit={step === 2}
            />
          </LayoutFooter>
        }
      />
    </Dialog>
  )
}