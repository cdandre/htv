export default function HTVLogo({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* HTV Text Logo */}
      <g className="fill-black dark:fill-white">
        {/* H */}
        <path d="M10 10V30H14V22H26V30H30V10H26V18H14V10H10Z" />
        
        {/* T */}
        <path d="M38 10V14H46V30H50V14H58V10H38Z" />
        
        {/* V */}
        <path d="M66 10L74 30H78L86 10H81.5L76 25L70.5 10H66Z" />
      </g>
      
      {/* Subtle accent line */}
      <rect x="94" y="18" width="16" height="4" className="fill-black dark:fill-white" />
    </svg>
  )
}