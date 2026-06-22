import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
  type SchemaDefinition,
} from "mongoose"

/** Supported delivery formats for an event. */
export const EVENT_MODES = ["online", "offline", "hybrid"] as const

export type EventMode = (typeof EVENT_MODES)[number]

/** Full persisted shape of an event document. */
export interface IEvent {
  title: string
  slug: string
  description: string
  overview: string
  image: string
  venue: string
  location: string
  date: string
  time: string
  mode: EventMode
  audience: string
  agenda: string[]
  organizer: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

/** Fields declared on the schema (timestamps are added by Mongoose). */
type EventSchemaFields = Omit<IEvent, "createdAt" | "updatedAt">

const REQUIRED_STRING_FIELDS = [
  "title",
  "description",
  "overview",
  "image",
  "venue",
  "location",
  "date",
  "time",
  "mode",
  "audience",
  "organizer",
] as const satisfies readonly (keyof EventSchemaFields)[]

/** Converts a title into a URL-safe slug. */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

/** Parses and normalizes a date string to ISO 8601 date format (YYYY-MM-DD). */
function normalizeDateToISO(dateValue: string): string {
  const trimmed = dateValue.trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(`${trimmed}T00:00:00.000Z`)

    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Invalid date: ${dateValue}`)
    }

    return trimmed
  }

  const parsed = new Date(trimmed)

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${dateValue}`)
  }

  return parsed.toISOString().slice(0, 10)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => isNonEmptyString(item))
  )
}

const eventSchemaDefinition = {
  title: {
    type: String,
    required: [true, "Title is required"],
    trim: true,
  },
  slug: {
    type: String,
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    required: [true, "Description is required"],
    trim: true,
  },
  overview: {
    type: String,
    required: [true, "Overview is required"],
    trim: true,
  },
  image: {
    type: String,
    required: [true, "Image is required"],
    trim: true,
  },
  venue: {
    type: String,
    required: [true, "Venue is required"],
    trim: true,
  },
  location: {
    type: String,
    required: [true, "Location is required"],
    trim: true,
  },
  date: {
    type: String,
    required: [true, "Date is required"],
    trim: true,
  },
  time: {
    type: String,
    required: [true, "Time is required"],
    trim: true,
  },
  mode: {
    type: String,
    required: [true, "Mode is required"],
    enum: {
      values: EVENT_MODES,
      message: "{VALUE} is not a valid event mode",
    },
  },
  audience: {
    type: String,
    required: [true, "Audience is required"],
    trim: true,
  },
  agenda: {
    type: [String],
    required: [true, "Agenda is required"],
    validate: {
      validator: (value: string[]) => isNonEmptyStringArray(value),
      message: "Agenda must contain at least one non-empty item",
    },
  },
  organizer: {
    type: String,
    required: [true, "Organizer is required"],
    trim: true,
  },
  tags: {
    type: [String],
    required: [true, "Tags are required"],
    validate: {
      validator: (value: string[]) => isNonEmptyStringArray(value),
      message: "Tags must contain at least one non-empty item",
    },
  },
} satisfies SchemaDefinition<EventSchemaFields>

const eventSchema = new Schema<IEvent>(eventSchemaDefinition, {
  timestamps: true,
})

eventSchema.pre("save", async function (this: EventDocument) {
  // Regenerate slug only when the title changes.
  if (this.isModified("title")) {
    this.slug = slugify(this.title)
  }

  // Keep stored dates consistent in ISO 8601 date format.
  if (this.isModified("date")) {
    this.date = normalizeDateToISO(this.date)
  }

  // Guard against empty strings slipping past client-side validation.
  for (const field of REQUIRED_STRING_FIELDS) {
    const value = this.get(field)

    if (!isNonEmptyString(value)) {
      throw new Error(`${field} is required and cannot be empty`)
    }
  }

  if (!isNonEmptyStringArray(this.agenda)) {
    throw new Error("agenda is required and cannot be empty")
  }

  if (!isNonEmptyStringArray(this.tags)) {
    throw new Error("tags are required and cannot be empty")
  }
})

export type EventDocument = HydratedDocument<IEvent>

const EventModel =
  (models.Event as Model<IEvent> | undefined) ??
  model<IEvent>("Event", eventSchema)

export { EventModel as Event }
