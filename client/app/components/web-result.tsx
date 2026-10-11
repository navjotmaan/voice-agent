import type { WebSearchResponse } from "./voice-agent"

export default function WebSearchResult(result: WebSearchResponse[]) {
  return (
    <ul style={{ listStyleType: 'none', padding: 0 }}>
      {result.map((job) => (
        <li 
          key={job.id} 
          style={{ 
            padding: '12px', 
            borderBottom: '1px solid #eee', 
            marginBottom: '8px' 
          }}
        >
          <a 
            href={job.url} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#d8b4fe', textDecoration: 'none', fontWeight: 'bold' }}
          >
            {job.title}
          </a>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            {job.url}
          </div>
        </li>
      ))}
    </ul>
  )
}