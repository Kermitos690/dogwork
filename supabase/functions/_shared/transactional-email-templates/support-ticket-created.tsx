/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { LOGO_URL, SITE_URL, styles as s } from './_dogwork-styles.ts'

interface Props {
  name?: string
  ticketId?: string
  ticketSubject?: string
}

const SupportTicketCreatedEmail = ({ name, ticketId, ticketSubject }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre demande de support a été enregistrée — DogWork</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.logoSection}>
          <Img src={LOGO_URL} width="160" height="auto" alt="DogWork" style={s.logo} />
        </Section>

        <Heading style={s.h1}>Votre demande est enregistrée</Heading>
        <Text style={s.text}>
          {name ? `Bonjour ${name},` : 'Bonjour,'} nous avons bien reçu votre
          demande de support. Un membre de l'équipe DogWork la prend en charge.
        </Text>

        <Section style={s.card}>
          {ticketId && (
            <Text style={{ ...s.text, margin: '0 0 6px' }}>
              <strong>Référence :</strong> #{ticketId}
            </Text>
          )}
          {ticketSubject && (
            <Text style={{ ...s.text, margin: 0 }}>
              <strong>Sujet :</strong> {ticketSubject}
            </Text>
          )}
        </Section>

        <Section style={s.buttonSection}>
          <Button style={s.button} href={`${SITE_URL}/support`}>Suivre mes demandes</Button>
        </Section>

        <Text style={s.textSmall}>
          Vous recevrez un email dès que notre équipe vous répondra.
        </Text>
        <Text style={s.footerBrand}>© DogWork — L'écosystème canin premium</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SupportTicketCreatedEmail,
  subject: ({ ticketId }: any) =>
    ticketId ? `Demande #${ticketId} reçue — DogWork` : 'Demande de support reçue — DogWork',
  displayName: 'Ticket support créé',
  previewData: { name: 'Marie', ticketId: '1042', ticketSubject: 'Problème de connexion' },
} satisfies TemplateEntry
