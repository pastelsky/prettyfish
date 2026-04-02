import { useState, useRef, useEffect } from 'react'
import {
  CaretUpDown,
  PencilSimple,
  TrashSimple,
  Plus,
  FolderSimple,
  FolderPlus,
  CaretRight,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { DiagramPage, DiagramFolder } from '../types'
import { detectDiagramType } from '@/lib/detectDiagram'
import { DiagramIcon } from './DiagramIcon'

interface PagesDropdownProps {
  pages: DiagramPage[]
  folders: DiagramFolder[]
  activePageId: string
  onSelectPage: (id: string) => void
  onAddPage: () => string
  onRenamePage: (id: string, name: string) => void
  onDeletePage: (id: string) => void
  onReorderPages: (from: number, to: number) => void
  onAddFolder: (name: string) => string
  onDeleteFolder: (id: string) => void
  onRenameFolder: (id: string, name: string) => void
  onToggleFolderCollapsed: (id: string) => void
  onMovePageToFolder: (pageId: string, folderId: string | null) => void
  isDark: boolean
}

export function PagesDropdown({
  pages,
  folders,
  activePageId,
  onSelectPage,
  onAddPage,
  onRenamePage,
  onDeletePage,
  onAddFolder,
  onDeleteFolder,
  onRenameFolder,
  onToggleFolderCollapsed,
  isDark,
}: PagesDropdownProps) {
  const [open, setOpen] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const activePage = pages.find(p => p.id === activePageId)
  const ungroupedPages = pages.filter(p => !p.folderId)

  const startRename = (id: string, currentName: string) => {
    setRenamingId(id)
    setRenameValue(currentName)
    setTimeout(() => renameInputRef.current?.select(), 0)
  }

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      if (folders.some(f => f.id === renamingId)) {
        onRenameFolder(renamingId, renameValue.trim())
      } else {
        onRenamePage(renamingId, renameValue.trim())
      }
    }
    setRenamingId(null)
    setRenameValue('')
  }

  const handleAddPage = () => {
    onAddPage()
    setOpen(false)
  }

  const handleAddFolder = () => {
    setCreatingFolder(true)
    setNewFolderName('')
    setTimeout(() => folderInputRef.current?.focus(), 0)
  }

  const commitAddFolder = () => {
    if (newFolderName.trim()) {
      onAddFolder(newFolderName.trim())
    }
    setCreatingFolder(false)
    setNewFolderName('')
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative flex items-center">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 h-6 px-2.5 rounded-lg text-xs cursor-pointer transition-colors border',
          isDark
            ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/15 text-zinc-200'
            : 'bg-black/4 border-black/10 hover:bg-black/7 hover:border-black/15 text-zinc-700',
          open && (isDark ? 'bg-white/10 border-white/15' : 'bg-black/7 border-black/15'),
        )}
      >
        <DiagramIcon type={detectDiagramType(activePage?.code ?? '')} className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="font-medium truncate text-sm">{activePage?.name ?? 'Untitled'}</span>
        <CaretUpDown className="w-3 h-3 text-muted-foreground shrink-0" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className={cn(
          'absolute left-0 top-full mt-1.5 z-50 rounded-lg border overflow-hidden animate-fade-up',
          isDark
            ? 'bg-[oklch(0.17_0.018_260)] border-white/12'
            : 'bg-white border-black/10',
        )}
        style={{ boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)', minWidth: '240px', maxWidth: '320px' }}>
          <div className="max-h-80 overflow-y-auto custom-scrollbar py-1">
            {/* Ungrouped pages at top */}
            {ungroupedPages.length > 0 && (
              <>
                {ungroupedPages.map((page) => {
                  const isActive = page.id === activePageId
                  const isRenaming = renamingId === page.id
                  const isConfirmDelete = confirmDeleteId === page.id
                  
                  return (
                    <div
                      key={page.id}
                      className={cn(
                        'group flex items-center gap-2 px-3 py-2 text-[13px] transition-colors select-none',
                        isRenaming || isConfirmDelete ? 'cursor-default' : 'cursor-pointer',
                        isActive
                          ? cn('font-medium', isDark ? 'bg-white/10 text-white' : 'bg-primary/8 text-foreground')
                          : cn(isDark ? 'text-zinc-200 hover:bg-white/6 hover:text-white' : 'text-zinc-700 hover:bg-black/4 hover:text-foreground'),
                      )}
                      onClick={() => {
                        if (!isRenaming && !isConfirmDelete) {
                          onSelectPage(page.id)
                          setOpen(false)
                        }
                      }}
                    >
                      <DiagramIcon type={detectDiagramType(page.code)} className={cn('w-3.5 h-3.5 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />

                      {isConfirmDelete ? (
                        <>
                          <span className={cn('flex-1 text-xs', isDark ? 'text-red-300' : 'text-red-600')}>Delete "{page.name}"?</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeletePage(page.id); setConfirmDeleteId(null) }}
                            className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors', isDark ? 'bg-red-500/20 hover:bg-red-500/35 text-red-300' : 'bg-red-100 hover:bg-red-200 text-red-600')}
                          >Yes</button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null) }}
                            className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer transition-colors', isDark ? 'hover:bg-white/8 text-zinc-400' : 'hover:bg-black/5 text-zinc-500')}
                          >No</button>
                        </>
                      ) : isRenaming ? (
                        <input
                          ref={renameInputRef}
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename()
                            if (e.key === 'Escape') setRenamingId(null)
                          }}
                          className="flex-1 bg-transparent outline-none border-b border-primary text-xs text-foreground"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="flex-1 truncate">{page.name}</span>
                      )}

                      {!isRenaming && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); startRename(page.id, page.name) }}
                            className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="Rename"
                          >
                            <PencilSimple className="w-3.5 h-3.5" />
                          </button>
                          {pages.length > 1 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(page.id) }}
                              className="p-0.5 rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive"
                              title="Delete"
                            >
                              <TrashSimple className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            )}

            {/* Folders with their pages */}
            {folders.map((folder) => {
              const folderPages = pages.filter(p => p.folderId === folder.id)
              const isRenamingFolder = renamingId === folder.id
              const isConfirmDeleteFolder = confirmDeleteId === folder.id
              
              return (
                <div key={folder.id}>
                  {/* Folder header */}
                  <div
                    className={cn(
                      'group flex items-center gap-2 px-3 py-2 text-[13px] transition-colors select-none',
                      isRenamingFolder || isConfirmDeleteFolder ? 'cursor-default' : 'cursor-pointer',
                      isDark ? 'text-zinc-200 hover:bg-white/6 hover:text-white' : 'text-zinc-700 hover:bg-black/4 hover:text-foreground',
                    )}
                  >
                    <button
                      onClick={() => onToggleFolderCollapsed(folder.id)}
                      className="p-0 hover:bg-transparent"
                    >
                      <CaretRight className={cn('w-3.5 h-3.5 shrink-0 transition-transform', folder.collapsed ? '' : 'rotate-90')} />
                    </button>
                    <FolderSimple className="w-3.5 h-3.5 shrink-0" />

                    {isConfirmDeleteFolder ? (
                      <>
                        <span className={cn('flex-1 text-xs', isDark ? 'text-red-300' : 'text-red-600')}>Delete "{folder.name}"?</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder.id); setConfirmDeleteId(null) }}
                          className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors', isDark ? 'bg-red-500/20 hover:bg-red-500/35 text-red-300' : 'bg-red-100 hover:bg-red-200 text-red-600')}
                        >Yes</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null) }}
                          className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer transition-colors', isDark ? 'hover:bg-white/8 text-zinc-400' : 'hover:bg-black/5 text-zinc-500')}
                        >No</button>
                      </>
                    ) : isRenamingFolder ? (
                      <input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename()
                          if (e.key === 'Escape') setRenamingId(null)
                        }}
                        className="flex-1 bg-transparent outline-none border-b border-primary text-xs text-foreground"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="flex-1 truncate font-medium">{folder.name}</span>
                    )}

                    {!isRenamingFolder && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); startRename(folder.id, folder.name) }}
                          className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Rename"
                        >
                          <PencilSimple className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(folder.id) }}
                          className="p-0.5 rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive"
                          title="Delete"
                        >
                          <TrashSimple className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Folder contents */}
                  {!folder.collapsed && folderPages.map((page) => {
                    const isActive = page.id === activePageId
                    const isRenaming = renamingId === page.id
                    const isConfirmDelete = confirmDeleteId === page.id
                    
                    return (
                      <div
                        key={page.id}
                        className={cn(
                          'group flex items-center gap-2 pl-8 pr-3 py-2 text-[13px] transition-colors select-none',
                          isRenaming || isConfirmDelete ? 'cursor-default' : 'cursor-pointer',
                          'border-l border-l-transparent',
                          isDark ? 'hover:border-l-white/20' : 'hover:border-l-black/10',
                          isActive
                            ? cn('font-medium', isDark ? 'bg-white/10 text-white' : 'bg-primary/8 text-foreground')
                            : cn(isDark ? 'text-zinc-200 hover:bg-white/6 hover:text-white' : 'text-zinc-700 hover:bg-black/4 hover:text-foreground'),
                        )}
                        onClick={() => {
                          if (!isRenaming && !isConfirmDelete) {
                            onSelectPage(page.id)
                            setOpen(false)
                          }
                        }}
                      >
                        <DiagramIcon type={detectDiagramType(page.code)} className={cn('w-3 h-3 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />

                        {isConfirmDelete ? (
                          <>
                            <span className={cn('flex-1 text-xs', isDark ? 'text-red-300' : 'text-red-600')}>Delete "{page.name}"?</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); onDeletePage(page.id); setConfirmDeleteId(null) }}
                              className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors', isDark ? 'bg-red-500/20 hover:bg-red-500/35 text-red-300' : 'bg-red-100 hover:bg-red-200 text-red-600')}
                            >Yes</button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null) }}
                              className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer transition-colors', isDark ? 'hover:bg-white/8 text-zinc-400' : 'hover:bg-black/5 text-zinc-500')}
                            >No</button>
                          </>
                        ) : isRenaming ? (
                          <input
                            ref={renameInputRef}
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitRename()
                              if (e.key === 'Escape') setRenamingId(null)
                            }}
                            className="flex-1 bg-transparent outline-none border-b border-primary text-xs text-foreground"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="flex-1 truncate">{page.name}</span>
                        )}

                        {!isRenaming && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); startRename(page.id, page.name) }}
                              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                              title="Rename"
                            >
                              <PencilSimple className="w-3.5 h-3.5" />
                            </button>
                            {pages.length > 1 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(page.id) }}
                                className="p-0.5 rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive"
                                title="Delete"
                              >
                                <TrashSimple className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Footer with new diagram and new folder buttons */}
          <div className="border-t border-border/40 px-1 py-1 flex gap-1">
            <button
              onClick={handleAddPage}
              className={cn(
                'flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition-colors',
                isDark ? 'text-zinc-400 hover:bg-white/5 hover:text-white' : 'text-zinc-500 hover:bg-black/3 hover:text-foreground',
              )}
            >
              <Plus className="w-3 h-3" />
              <span>New diagram</span>
            </button>
            {!creatingFolder && (
              <button
                onClick={handleAddFolder}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition-colors',
                  isDark ? 'text-zinc-400 hover:bg-white/5 hover:text-white' : 'text-zinc-500 hover:bg-black/3 hover:text-foreground',
                )}
                title="New folder"
              >
                <FolderPlus className="w-3 h-3" />
              </button>
            )}
            {creatingFolder && (
              <input
                ref={folderInputRef}
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onBlur={commitAddFolder}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitAddFolder()
                  if (e.key === 'Escape') {
                    setCreatingFolder(false)
                    setNewFolderName('')
                  }
                }}
                placeholder="Folder name..."
                className={cn(
                  'flex-1 px-2 py-1.5 rounded-md text-xs outline-none border',
                  isDark
                    ? 'bg-white/5 border-white/10 text-white placeholder:text-zinc-500'
                    : 'bg-black/3 border-black/10 text-foreground placeholder:text-zinc-400',
                )}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
