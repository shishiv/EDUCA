import Image from 'next/image'

export function BrandLogo({ priority = false }: { priority?: boolean }) {
  return (
    <Image
      src="/brand/educa-logo.png"
      alt="EDUCA"
      width={180}
      height={52}
      priority={priority}
      className="brand-logo"
    />
  )
}
