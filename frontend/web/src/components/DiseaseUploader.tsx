import React, { useState } from 'react'

export function DiseaseUploader() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    setLoading(true)
    try {
      const resp = await fetch('http://localhost:8000/predict', { method: 'POST', body: fd })
      const json = await resp.json()
      setResult(json)
    } catch (err) {
      setResult({ error: String(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button type="submit" disabled={!file || loading}>{loading ? 'Sending…' : 'Analyze Image'}</button>
      </form>
      {result && (
        <div style={{ marginTop: 12 }}>
          <strong>Result:</strong>
          <pre style={{ whiteSpace: 'pre-wrap', background: 'var(--panel)', padding: 8, borderRadius: 6 }}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
