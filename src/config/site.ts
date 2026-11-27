/**
 * Contact links shown in the "Say hi" popover. Replace the placeholder
 * handles and addresses below with your real ones.
 */
export interface SocialLink {
  label: string
  handle: string
  href: string
}

export const socials: SocialLink[] = [
  { label: 'Email', handle: 'hello@hellogon.com', href: 'mailto:hello@hellogon.com' },
  { label: 'GitHub', handle: '@hellogon', href: 'https://github.com/hellogon' },
  { label: 'X / Twitter', handle: '@hellogon', href: 'https://x.com/hellogon' },
  { label: 'LinkedIn', handle: 'in/hellogon', href: 'https://www.linkedin.com/in/hellogon' },
]
