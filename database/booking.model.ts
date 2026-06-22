import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
  type SchemaDefinition,
  type Types,
} from "mongoose"

import { Event } from "./event.model"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Full persisted shape of a booking document. */
export interface IBooking {
  eventId: Types.ObjectId
  email: string
  createdAt: Date
  updatedAt: Date
}

/** Fields declared on the schema (timestamps are added by Mongoose). */
type BookingSchemaFields = Omit<IBooking, "createdAt" | "updatedAt">

function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim())
}

const bookingSchemaDefinition = {
  eventId: {
    type: Schema.Types.ObjectId,
    ref: "Event",
    required: [true, "Event ID is required"],
    index: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    trim: true,
    lowercase: true,
    validate: {
      validator: (value: string) => isValidEmail(value),
      message: "Email must be a valid email address",
    },
  },
} satisfies SchemaDefinition<BookingSchemaFields>

const bookingSchema = new Schema<IBooking>(bookingSchemaDefinition, {
  timestamps: true,
})

// Speed up lookups when fetching bookings for a specific event.
bookingSchema.index({ eventId: 1 })

bookingSchema.pre("save", async function (this: BookingDocument) {
  if (!isValidEmail(this.email)) {
    throw new Error("Email must be a valid email address")
  }

  // Ensure the booking references a real event before persisting.
  const existingEvent = await Event.exists({ _id: this.eventId })

  if (!existingEvent) {
    throw new Error("Referenced event does not exist")
  }
})

export type BookingDocument = HydratedDocument<IBooking>

const BookingModel =
  (models.Booking as Model<IBooking> | undefined) ??
  model<IBooking>("Booking", bookingSchema)

export { BookingModel as Booking }
