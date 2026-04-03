import { useState, useRef, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core'
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  CaretUpDown,
  PencilSimple,
  TrashSimple,
  Plus,
  FolderSimple,
  FolderPlus,
  CaretRight,
  DotsSixVertical,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { DiagramPage, DiagramFolder } from '../types'
import { detectDiagramType } from '@/lib/detectDiagram'
import { DiagramIcon } from './DiagramIcon'

interface PagesDropdownProps {
  pages: DiagramPage[]
  folders: DiagramFolder[]
  activePageId: string
  isDark: boolean
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
}

// ─── Sortable Page Row ────────────────────────────────────────────────────────

interface PageRowProps {
  page: DiagramPage
  isActive: boolean
  isDark: boolean
  isRenaming: boolean
  renameValue: string
  renameInputRef: React.RefObject<HTMLInputElement | null>
  canDelete: boolean
  onSelect: () => void
  onStartRename: () => void
  onDelete: () => void
  onRenameChange: (v: string) => void
  onRenameCommit: () => void
  onRenameCancel: () => void
  indent?: boolean
  overlay?: boolean
}

function PageRow({
  page, isActive, isDark, isRenaming, renameValue, renameInputRef,
  canDelete, onSelect, onStartRename, onDelete,
  onRenameChange, onRenameCommit, onRenameCancel,
  indent = false, overlay = false,
}: PageRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id, disabled: isRenaming })

  const style = overlay ? {} : {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-1.5 text-[13px] transition-colors select-none',
        indent ? 'pl-8 pr-3 py-1.5' : 'px-2.5 py-1.5',
        isRenaming ? 'cursor-default' : 'cursor-pointer',
        !overlay && isActive
          ? cn('font-medium', isDark ? 'bg-white/10 text-white' : 'bg-primary/8 text-foreground')
          : cn(isDark ? 'text-zinc-200 hover:bg-white/6 hover:text-white' : 'text-zinc-700 hover:bg-black/4 hover:text-foreground'),
        overlay && 'rounded-lg opacity-95 shadow-lg',
        overlay && (isDark ? 'bg-[oklch(0.22_0.018_260)] border border-white/15' : 'bg-white border border-black/10'),
      )}
      onClick={() => { if (!isRenaming) onSelect() }}
    >
      {/* Drag handle */}
      {!overlay && (
        <span
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing shrink-0 text-muted-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <DotsSixVertical className="w-3 h-3" />
        </span>
      )}

      <DiagramIcon
        type={detectDiagramType(page.code)}
        className={cn('w-3.5 h-3.5 shrink-0', isActive && !overlay ? 'text-primary' : 'text-muted-foreground')}
      />

      {isRenaming ? (
        <input
          ref={renameInputRef}
          value={renameValue}
          onChange={(e) => onRenameChange(e.target.value)}
          onBlur={onRenameCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onRenameCommit()
            if (e.key === 'Escape') onRenameCancel()
          }}
          className="flex-1 bg-transparent outline-none border-b border-primary text-xs text-foreground"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 truncate">{page.name}</span>
      )}

      {!isRenaming && !overlay && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onStartRename() }}
            className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Rename"
          >
            <PencilSimple className="w-3.5 h-3.5" />
          </button>
          {canDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
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
}

// ─── Droppable Folder Zone ────────────────────────────────────────────────────

function FolderDropZone({
  folder,
  children,
  isDraggingOver,
  isDark,
}: {
  folder: DiagramFolder
  children: React.ReactNode
  isDraggingOver: boolean
  isDark: boolean
}) {
  const { setNodeRef } = useDroppable({ id: `folder-${folder.id}` })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-md transition-colors',
        isDraggingOver && (isDark ? 'bg-white/5 ring-1 ring-white/10' : 'bg-primary/4 ring-1 ring-primary/20'),
      )}
    >
      {children}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PagesDropdown({
  pages, folders, activePageId, isDark,
  onSelectPage, onAddPage, onRenamePage, onDeletePage, onReorderPages,
  onAddFolder, onDeleteFolder, onRenameFolder, onToggleFolderCollapsed, onMovePageToFolder,
}: PagesDropdownProps) {
  const [open, setOpen] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  const ref = useRef<HTMLDivElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const activePage = pages.find(p => p.id === activePageId)
  const ungroupedPages = pages.filter(p => !p.folderId)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

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

  // dnd-kit handlers
  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveDragId(String(active.id))
  }

  const handleDragOver = ({ over }: DragOverEvent) => {
    if (!over) { setDragOverFolder(null); return }
    const overId = String(over.id)
    if (overId.startsWith('folder-')) {
      setDragOverFolder(overId.replace('folder-', ''))
    } else {
      setDragOverFolder(null)
    }
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveDragId(null)
    setDragOverFolder(null)
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    // Dropped on a folder zone → move page to that folder
    if (overId.startsWith('folder-')) {
      const folderId = overId.replace('folder-', '')
      const draggedPage = pages.find(p => p.id === activeId)
      if (draggedPage && draggedPage.folderId !== folderId) {
        onMovePageToFolder(activeId, folderId)
      }
      return
    }

    // Dropped on another page → reorder
    if (activeId !== overId) {
      const oldIndex = pages.findIndex(p => p.id === activeId)
      const newIndex = pages.findIndex(p => p.id === overId)
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorderPages(oldIndex, newIndex)
      }
    }
  }

  const activeDragPage = pages.find(p => p.id === activeDragId)

  const rowProps = (page: DiagramPage, indent = false) => ({
    page,
    isActive: page.id === activePageId,
    isDark,
    isRenaming: renamingId === page.id,
    renameValue,
    renameInputRef,
    canDelete: pages.length > 1,
    onSelect: () => { onSelectPage(page.id); setOpen(false) },
    onStartRename: () => startRename(page.id, page.name),
    onDelete: () => onDeletePage(page.id),
    onRenameChange: (v: string) => setRenameValue(v),
    onRenameCommit: commitRename,
    onRenameCancel: () => setRenamingId(null),
    indent,
  })

  return (
    <div ref={ref} className="relative flex items-center">
      <button
        data-testid="pages-dropdown-trigger"
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

      {open && (
        <div
          className={cn(
            'absolute left-0 top-full mt-1.5 z-50 rounded-lg border overflow-hidden animate-fade-up',
            isDark
              ? 'bg-[oklch(0.17_0.018_260)] border-white/12'
              : 'bg-white border-black/10',
          )}
          style={{
            boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)',
            minWidth: '240px',
            maxWidth: '320px',
          }}
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="max-h-80 overflow-y-auto custom-scrollbar py-1" data-testid="pages-dropdown-list">

              {/* Ungrouped pages */}
              <SortableContext
                items={ungroupedPages.map(p => p.id)}
                strategy={verticalListSortingStrategy}
              >
                {ungroupedPages.map(page => (
                  <PageRow key={page.id} {...rowProps(page)} />
                ))}
              </SortableContext>

              {/* Folders */}
              {folders.map(folder => {
                const folderPages = pages.filter(p => p.folderId === folder.id)
                const isRenamingFolder = renamingId === folder.id

                return (
                  <FolderDropZone
                    key={folder.id}
                    folder={folder}
                    isDraggingOver={dragOverFolder === folder.id}
                    isDark={isDark}
                  >
                    {/* Folder header */}
                    <div
                      className={cn(
                        'group flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] transition-colors select-none cursor-pointer',
                        isDark ? 'text-zinc-200 hover:bg-white/6 hover:text-white' : 'text-zinc-700 hover:bg-black/4 hover:text-foreground',
                      )}
                    >
                      <button
                        onClick={() => onToggleFolderCollapsed(folder.id)}
                        className="p-0 hover:bg-transparent shrink-0"
                      >
                        <CaretRight className={cn('w-3 h-3 text-muted-foreground transition-transform', folder.collapsed ? '' : 'rotate-90')} />
                      </button>
                      <FolderSimple className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />

                      {isRenamingFolder ? (
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
                        <span
                          className="flex-1 truncate font-medium text-xs"
                          onClick={() => onToggleFolderCollapsed(folder.id)}
                        >
                          {folder.name}
                          <span className={cn('ml-1 text-[11px]', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                            {folderPages.length}
                          </span>
                        </span>
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
                            onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder.id) }}
                            className="p-0.5 rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive"
                            title="Delete folder"
                          >
                            <TrashSimple className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Folder pages */}
                    {!folder.collapsed && (
                      <SortableContext
                        items={folderPages.map(p => p.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {folderPages.map(page => (
                          <PageRow key={page.id} {...rowProps(page, true)} />
                        ))}
                        {folderPages.length === 0 && (
                          <div className={cn(
                            'pl-9 pr-3 py-1.5 text-[11px] italic',
                            isDark ? 'text-zinc-600' : 'text-zinc-400',
                          )}>
                            Drag diagrams here
                          </div>
                        )}
                      </SortableContext>
                    )}
                  </FolderDropZone>
                )
              })}
            </div>

            {/* Drag overlay */}
            <DragOverlay>
              {activeDragPage && (
                <PageRow {...rowProps(activeDragPage)} overlay />
              )}
            </DragOverlay>
          </DndContext>

          {/* Footer */}
          <div className={cn('border-t px-1.5 py-1 flex items-center gap-1', isDark ? 'border-white/8' : 'border-black/6')}>
            <button
              data-testid="pages-new-diagram"
              onClick={handleAddPage}
              className={cn(
                'flex-1 flex items-center gap-1.5 px-2 h-6 rounded-md text-xs cursor-pointer transition-colors',
                isDark ? 'text-zinc-400 hover:bg-white/5 hover:text-white' : 'text-zinc-500 hover:bg-black/3 hover:text-foreground',
              )}
            >
              <Plus className="w-3 h-3 shrink-0" />
              <span>New diagram</span>
            </button>

            {!creatingFolder ? (
              <button
                onClick={handleAddFolder}
                className={cn(
                  'flex items-center gap-1.5 px-2 h-6 rounded-md text-xs cursor-pointer transition-colors shrink-0',
                  isDark ? 'text-zinc-400 hover:bg-white/5 hover:text-white' : 'text-zinc-500 hover:bg-black/3 hover:text-foreground',
                )}
                title="New folder"
              >
                <FolderPlus className="w-3 h-3" />
              </button>
            ) : (
              <input
                ref={folderInputRef}
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onBlur={commitAddFolder}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitAddFolder()
                  if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName('') }
                }}
                placeholder="Folder name"
                className={cn(
                  'flex-1 h-6 px-2 rounded-md text-xs outline-none border',
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
