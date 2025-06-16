export const memoStyles = `
  .memo-content {
    line-height: 1.8;
    color: #374151;
  }

  .memo-content h1 {
    font-size: 2.25rem;
    font-weight: 800;
    color: #111827;
    margin-bottom: 1rem;
    letter-spacing: -0.025em;
  }

  .memo-content h2 {
    font-size: 1.875rem;
    font-weight: 700;
    color: #1f2937;
    margin-top: 3rem;
    margin-bottom: 1.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #e5e7eb;
  }

  .memo-content h3 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #374151;
    margin-top: 2rem;
    margin-bottom: 1rem;
  }

  .memo-content p {
    margin-bottom: 1.5rem;
    text-align: justify;
  }

  .memo-content strong {
    font-weight: 600;
    color: #111827;
  }

  .memo-content ul, .memo-content ol {
    margin-bottom: 1.5rem;
    padding-left: 2rem;
  }

  .memo-content li {
    margin-bottom: 0.75rem;
    line-height: 1.75;
  }

  .memo-content hr {
    margin: 3rem 0;
    border: none;
    border-top: 2px solid #e5e7eb;
  }

  .memo-content sup {
    font-size: 0.75rem;
    color: #3b82f6;
    font-weight: 600;
  }

  .memo-content blockquote {
    margin: 1.5rem 0;
    padding-left: 1.5rem;
    border-left: 4px solid #3b82f6;
    font-style: italic;
    color: #4b5563;
  }

  .memo-content code {
    background-color: #f3f4f6;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
  }

  .memo-content pre {
    background-color: #f3f4f6;
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    margin-bottom: 1.5rem;
  }

  /* Section-specific styling */
  .memo-content h2:first-of-type {
    margin-top: 0;
  }

  /* Highlight key metrics */
  .memo-content strong:has-text("$") {
    color: #059669;
  }

  .memo-content strong:has-text("%") {
    color: #7c3aed;
  }

  /* Executive summary styling */
  .memo-content h2:has-text("Executive Summary") + p {
    font-size: 1.125rem;
    line-height: 1.875;
  }

  /* Recommendation section styling */
  .memo-content h2:has-text("Recommendation") {
    color: #dc2626;
    border-bottom-color: #dc2626;
  }

  .memo-content h2:has-text("Recommendation") + p strong:first-child {
    font-size: 1.25rem;
    color: #dc2626;
  }

  /* Print styles */
  @media print {
    .memo-content {
      font-size: 11pt;
      line-height: 1.6;
    }
    
    .memo-content h2 {
      page-break-before: auto;
      page-break-after: avoid;
    }
    
    .memo-content p, .memo-content li {
      page-break-inside: avoid;
    }
  }
`

export function MemoStyles() {
  return <style dangerouslySetInnerHTML={{ __html: memoStyles }} />
}