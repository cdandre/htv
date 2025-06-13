import Image from 'next/image'

export default function HTVLogo({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <div className={className}>
      <Image
        src="/htv-logo.png"
        alt="HTV Logo"
        width={120}
        height={40}
        className="h-full w-auto"
        priority
      />
    </div>
  )
}