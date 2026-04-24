/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as welcome } from './welcome.tsx'
import { template as contactConfirmation } from './contact-confirmation.tsx'
import { template as supportTicketCreated } from './support-ticket-created.tsx'
import { template as supportTicketReplied } from './support-ticket-replied.tsx'
import { template as subscriptionActivated } from './subscription-activated.tsx'
import { template as subscriptionCanceled } from './subscription-canceled.tsx'
import { template as paymentFailed } from './payment-failed.tsx'
import { template as creditsPurchased } from './credits-purchased.tsx'
import { template as courseBookingConfirmed } from './course-booking-confirmed.tsx'
import { template as appointmentReminder } from './appointment-reminder.tsx'
import { template as newMessage } from './new-message.tsx'
import { template as adoptionCheckinDue } from './adoption-checkin-due.tsx'
import { template as employeeCredentials } from './employee-credentials.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'welcome': welcome,
  'contact-confirmation': contactConfirmation,
  'support-ticket-created': supportTicketCreated,
  'support-ticket-replied': supportTicketReplied,
  'subscription-activated': subscriptionActivated,
  'subscription-canceled': subscriptionCanceled,
  'payment-failed': paymentFailed,
  'credits-purchased': creditsPurchased,
  'course-booking-confirmed': courseBookingConfirmed,
  'appointment-reminder': appointmentReminder,
  'new-message': newMessage,
  'adoption-checkin-due': adoptionCheckinDue,
  'employee-credentials': employeeCredentials,
}
