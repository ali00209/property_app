import { z } from "zod";

export const maintenancePriorities = ["low", "medium", "high", "urgent"] as const;

export const maintenanceStatuses = [
  "new",
  "assigned",
  "in_progress",
  "waiting_parts",
  "completed",
  "closed",
] as const;

export const maintenancePriorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const maintenanceStatusOptions = [
  { value: "new", label: "New" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_parts", label: "Waiting Parts" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
];

const costField = (field: string) =>
  z
    .string()
    .refine(
      (value) => value === "" || (!Number.isNaN(Number(value)) && Number(value) >= 0),
      `${field} must be a non-negative number.`,
    );

export const maintenanceSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(255),
  description: z.string().trim().max(5000).optional(),
  priority: z.enum(maintenancePriorities).default("medium"),
  status: z.enum(maintenanceStatuses).default("new"),
  propertyId: z.string().min(1, "Property is required."),
  assignedTo: z.string().optional(),
  estimatedCost: costField("Estimated cost").optional(),
  actualCost: costField("Actual cost").optional(),
  completedDate: z.string().optional(),
});

export type MaintenanceFormValues = z.infer<typeof maintenanceSchema>;

export const maintenanceDefaults: MaintenanceFormValues = {
  title: "",
  description: "",
  priority: "medium",
  status: "new",
  propertyId: "",
  assignedTo: "",
  estimatedCost: "",
  actualCost: "",
  completedDate: "",
}