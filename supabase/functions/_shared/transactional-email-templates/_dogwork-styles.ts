// Styles partagés pour les emails transactionnels DogWork.
// Charte alignée avec les templates auth (palette navy + bleu DogWork).

export const LOGO_URL = 'https://www.dogwork-at-home.com/logo-dogwork.png'
export const SITE_URL = 'https://www.dogwork-at-home.com'
export const SITE_NAME = 'DogWork'

export const styles = {
  main: {
    backgroundColor: '#ffffff',
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  },
  container: {
    padding: '40px 30px',
    maxWidth: '560px',
    margin: '0 auto',
  },
  logoSection: { textAlign: 'center' as const, marginBottom: '30px' },
  logo: { margin: '0 auto' },
  h1: {
    fontSize: '24px',
    fontWeight: '700' as const,
    color: '#1a1a2e',
    margin: '0 0 16px',
    lineHeight: '1.3',
  },
  h2: {
    fontSize: '20px',
    fontWeight: '600' as const,
    color: '#1a1a2e',
    margin: '0 0 14px',
    lineHeight: '1.3',
  },
  h3: {
    fontSize: '16px',
    fontWeight: '600' as const,
    color: '#1a1a2e',
    margin: '24px 0 10px',
    lineHeight: '1.3',
  },
  text: {
    fontSize: '15px',
    color: '#4a4a5a',
    lineHeight: '1.6',
    margin: '0 0 20px',
  },
  textSmall: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: '1.55',
    margin: '0 0 16px',
  },
  link: { color: '#3b82f6', textDecoration: 'underline' },
  buttonSection: { textAlign: 'center' as const, margin: '8px 0 24px' },
  button: {
    backgroundColor: '#1a1a2e',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '600' as const,
    borderRadius: '10px',
    padding: '14px 28px',
    textDecoration: 'none',
    display: 'inline-block',
  },
  buttonSecondary: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600' as const,
    borderRadius: '10px',
    padding: '12px 24px',
    textDecoration: 'none',
    display: 'inline-block',
  },
  card: {
    backgroundColor: '#f4f4f8',
    borderRadius: '12px',
    padding: '20px 24px',
    margin: '0 0 24px',
  },
  cardAccent: {
    backgroundColor: '#eef4ff',
    borderLeft: '4px solid #3b82f6',
    borderRadius: '8px',
    padding: '16px 20px',
    margin: '0 0 24px',
  },
  divider: { borderColor: '#e8e8ee', margin: '28px 0' },
  footer: {
    fontSize: '12px',
    color: '#9ca3af',
    lineHeight: '1.5',
    margin: '0 0 6px',
  },
  footerBrand: {
    fontSize: '12px',
    color: '#b0b0c0',
    margin: '20px 0 0',
    textAlign: 'center' as const,
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '999px',
    backgroundColor: '#eef4ff',
    color: '#1a1a2e',
    fontSize: '12px',
    fontWeight: '600' as const,
  },
}
