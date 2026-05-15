import { useState, useRef, useEffect } from 'react'
import type { MediaEntry } from '../types'

interface MediaDropdownProps {
  mediaList: MediaEntry[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onAdd: () => void
  onRemove: (id: string) => void
}

export default function MediaDropdown({
  mediaList,
  selectedId,
  onSelect,
  onAdd,
  onRemove
}: MediaDropdownProps): React.ReactElement {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedEntry = mediaList.find((e) => e.id === selectedId)
  const displayText = selectedEntry ? selectedEntry.originalName : '없음'

  function handleSelect(id: string | null): void {
    onSelect(id)
    setOpen(false)
  }

  function handleRemove(e: React.MouseEvent, id: string): void {
    e.stopPropagation()
    onRemove(id)
  }

  return (
    <div className="media-dropdown-container" ref={containerRef}>
      <button
        type="button"
        className="media-dropdown-trigger"
        onClick={() => setOpen(!open)}
      >
        <span className="media-dropdown-text">{displayText}</span>
        <span className="media-dropdown-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="media-dropdown-menu">
          <div
            className={`media-dropdown-item ${selectedId === null ? 'selected' : ''}`}
            onClick={() => handleSelect(null)}
          >
            <span className="media-dropdown-item-name">없음</span>
          </div>

          {mediaList.map((entry) => (
            <div
              key={entry.id}
              className={`media-dropdown-item ${selectedId === entry.id ? 'selected' : ''}`}
              onClick={() => handleSelect(entry.id)}
            >
              <span className="media-dropdown-item-name">{entry.originalName}</span>
              <button
                type="button"
                className="media-dropdown-item-remove"
                onClick={(e) => handleRemove(e, entry.id)}
                title="삭제"
              >
                &times;
              </button>
            </div>
          ))}

          <div className="media-dropdown-item media-dropdown-add" onClick={onAdd}>
            <span className="media-dropdown-item-name">+ 미디어 추가</span>
          </div>
        </div>
      )}
    </div>
  )
}
