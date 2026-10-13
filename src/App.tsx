import {
  AppWindow,
  Download,
  Layers,
  Grid2x2,
  LayoutGrid,
  Moon,
  PanelLeft,
  PanelRight,
  Pencil,
  Plus,
  Redo2,
  Rows3,
  Scaling,
  Spline,
  Sun,
  Undo2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Segmented, ToolButton } from './components/rows'
import { ICONS, blankIcon } from './data/icons'
import { ICON_COMPOSER, buildIconLayers, buildIconSvg, downloadSvg } from './exportSvg'
import { DEFAULT_GROUP, type IconGroup } from './group'
import { commit, redo, start, undo, type Timeline } from './history'
import {
  DEFAULT_LABEL,
  DEFAULT_METRICS,
  LABEL_PLACEHOLDER,
  LABEL_RANGE,
  SIZE_PRESETS,
  defaultFinish,
  nextLabelId,
  zoomFor,
  type Appearance,
  type IconDef,
  type Label,
  type Metrics,
  type Mode,
} from './model'
import { movePathPoint } from './path'
import { artworkFileFor, hydrate, readLibrary, writeLibrary } from './library'
import { parseArtwork } from './svg'
import { ComposerCanvas, ComposerInspector, ComposerSidebar } from './views/Composer'
import { Design } from './views/Design'
import { DesignInspector, type DesignTab } from './views/DesignInspector'
import { Library } from './views/Library'
import { LibraryInspector } from './views/LibraryInspector'

type Section = 'library' | 'design'
type Workspace = 'studio' | 'composer'
/** One step of history: the icons and the deck they are arranged in, as they were together. */
type Snapshot = { icons: IconDef[]; group: IconGroup }

/** An edit must be still for this long before it is written and becomes a step back. */
const SETTLE = 400

const START_GROUP: IconGroup = {
  ...DEFAULT_GROUP,
  layers: [ICONS[3].id, ICONS[4].id, ICONS[1].id, ICONS[0].id],
}

export default function App() {
  const [icons, setIcons] = useState(ICONS)
  const [group, setGroup] = useState(START_GROUP)
  const [written, setWritten] = useState<Snapshot>(() => ({ icons: ICONS, group: START_GROUP }))
  const [timeline, setTimeline] = useState<Timeline<Snapshot>>(() => start({ icons: ICONS, group: START_GROUP }))
  const [selectedId, setSelectedId] = useState(ICONS[0].id)
  const [section, setSection] = useState<Section>('library')
  const [workspace, setWorkspace] = useState<Workspace>('studio')
  const [mode, setMode] = useState<Mode>('light')
  const [tab, setTab] = useState<DesignTab>('size')
  const [composerTab, setComposerTab] = useState<'layout' | 'animation'>('layout')
  const [designLayout, setDesignLayout] = useState<'hero' | 'grid'>('hero')
  const [presetId, setPresetId] = useState(SIZE_PRESETS[0].id)
  const [size, setSize] = useState(SIZE_PRESETS[0].defaultSize)
  const [zoom, setZoom] = useState(1)
  const [designZoom, setDesignZoom] = useState(5)
  const [groupZoom, setGroupZoom] = useState(1.2)
  const [showSidebar, setShowSidebar] = useState(true)
  const [editPoints, setEditPoints] = useState(false)
  const [showInspector, setShowInspector] = useState(true)

  const dark = mode === 'dark'
  const preset = SIZE_PRESETS.find((entry) => entry.id === presetId) ?? SIZE_PRESETS[0]
  const selected = icons.find((icon) => icon.id === selectedId)
  // What is on screen, against the folder and against the last step of history.
  const saving = icons !== written.icons || group !== written.group
  const edited = icons !== timeline.present.icons || group !== timeline.present.group
  const canUndo = edited || timeline.past.length > 0
  const canRedo = !edited && timeline.future.length > 0

  // The icons folder is the catalogue; the bundled set is only what a fresh clone starts from.
  useEffect(() => {
    let cancelled = false
    readLibrary().then((payload) => {
      if (cancelled || !payload) return
      const loaded = hydrate(payload)
      setIcons(loaded)
      setWritten((prev) => ({ ...prev, icons: loaded }))
      setTimeline((prev) => start({ icons: loaded, group: prev.present.group }))
      setSelectedId((current) => (loaded.some((icon) => icon.id === current) ? current : loaded[0]?.id ?? ''))
    })
    return () => {
      cancelled = true
    }
  }, [])

  /**
   * An edit writes itself once it stops: a drag on a slider or a component lands as one save
   * rather than one per frame, and the settled edit is one step back.
   */
  useEffect(() => {
    if (!edited && !saving) return
    const snapshot: Snapshot = { icons, group }
    const timer = setTimeout(async () => {
      if (edited) setTimeline((prev) => commit(prev, snapshot))
      if (saving) {
        const stored = await writeLibrary(snapshot.icons, snapshot.group)
        if (stored) setWritten(snapshot)
        else console.warn('Super Icon Studio: could not save the icon set')
      }
    }, SETTLE)
    return () => clearTimeout(timer)
  }, [icons, group, edited, saving])

  /** A step back: an edit that has not settled yet is the step it takes first. */
  const undoEdit = () => {
    const next = undo(edited ? commit(timeline, { icons, group }) : timeline)
    if (!next) return
    setTimeline(next)
    setIcons(next.present.icons)
    setGroup(next.present.group)
    // A state that comes back can be missing the icon that was selected when it went.
    setSelectedId((current) =>
      next.present.icons.some((icon) => icon.id === current) ? current : next.present.icons[0]?.id ?? '',
    )
  }

  const redoEdit = () => {
    const next = redo(edited ? commit(timeline, { icons, group }) : timeline)
    if (!next) return
    setTimeline(next)
    setIcons(next.present.icons)
    setGroup(next.present.group)
  }

  const patchIcon = (patch: Partial<IconDef>) =>
    setIcons((prev) => prev.map((icon) => (icon.id === selectedId ? { ...icon, ...patch } : icon)))

  const patchAppearance = (patch: Partial<Appearance>) =>
    setIcons((prev) =>
      prev.map((icon) => {
        if (icon.id !== selectedId) return icon
        const next = { ...icon[mode], ...patch }
        return mode === 'light' ? { ...icon, light: next } : { ...icon, dark: next }
      }),
    )

  const patchGroup = (patch: Partial<IconGroup>) => setGroup((prev) => ({ ...prev, ...patch }))

  const changePreset = (id: string) => {
    const next = SIZE_PRESETS.find((entry) => entry.id === id)
    if (!next) return
    setPresetId(id)
    setSize(next.defaultSize)
    setDesignZoom((current) => zoomFor(next.defaultSize, current))
  }

  const changeSize = (value: number) => {
    setSize(value)
    setDesignZoom((current) => zoomFor(value, current))
  }

  const resetDesign = () => {
    if (!selected) return
    patchIcon({ metrics: { ...DEFAULT_METRICS } })
    patchAppearance(defaultFinish(mode))
  }

  const addIcon = () => {
    const next = blankIcon(icons.length)
    setIcons((prev) => [...prev, next])
    setSelectedId(next.id)
    setWorkspace('studio')
    setSection('library')
  }

  const deleteIcon = () => {
    const index = icons.findIndex((icon) => icon.id === selectedId)
    const next = icons.filter((icon) => icon.id !== selectedId)
    setIcons(next)
    setSelectedId(next[Math.max(0, index - 1)]?.id ?? '')
  }

  const editArtworkPoint = (pathIndex: number, pointIndex: number, x: number, y: number) => {
    if (!selected?.artwork) return
    const artwork = {
      ...selected.artwork,
      paths: selected.artwork.paths.map((path, index) =>
        index === pathIndex ? { ...path, d: movePathPoint(path.d, pointIndex, x, y) } : path,
      ),
    }
    patchIcon({ artwork })
  }

  const editMetrics = (patch: Partial<Metrics>) => {
    if (!selected) return
    patchIcon({ metrics: { ...selected.metrics, ...patch } })
  }

  /**
   * A new component lands in both appearances at once: light and dark keep their own colours,
   * but they draw the same set of components.
   */
  const addLabel = () => {
    if (!selected) return
    const label = { ...DEFAULT_LABEL, id: nextLabelId(selected), text: LABEL_PLACEHOLDER }
    const add = (appearance: Appearance) => ({ ...appearance, labels: [...appearance.labels, { ...label }] })
    patchIcon({ light: add(selected.light), dark: add(selected.dark) })
    setTab(`label:${label.id}`)
  }

  const patchLabel = (id: string, patch: Partial<Label>) => {
    if (!selected) return
    patchAppearance({
      labels: selected[mode].labels.map((label) => (label.id === id ? { ...label, ...patch } : label)),
    })
  }

  /** A drag on the card reports the offsets the inspector's sliders hold, kept in their range. */
  const moveLabel = (id: string, x: number, y: number) => {
    const keep = (value: number) => Math.min(Math.max(value, -LABEL_RANGE), LABEL_RANGE)
    patchLabel(id, { x: keep(x), y: keep(y) })
  }

  const removeLabel = (id: string) => {
    if (!selected) return
    const drop = (list: Label[]) => list.filter((label) => label.id !== id)
    patchIcon({
      light: { ...selected.light, labels: drop(selected.light.labels) },
      dark: { ...selected.dark, labels: drop(selected.dark.labels) },
    })
    setTab('card')
  }

  const replaceSvg = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/svg+xml,.svg'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const taken = new Set(icons.map((icon) => icon.artwork?.file).filter(Boolean) as string[])
      const name = selected?.artwork?.file ?? artworkFileFor(selected?.identifier ?? file.name, taken)
      const artwork = parseArtwork(await file.text(), name, { trim: true })
      if (artwork) patchIcon({ artwork })
    }
    input.click()
  }

  const exportSvg = (forIconComposer = false) => {
    if (!selected) return
    const markup = forIconComposer
      ? buildIconSvg(selected, mode, ICON_COMPOSER.card, ICON_COMPOSER)
      : buildIconSvg(selected, mode, size)
    const suffix = forIconComposer ? `-${ICON_COMPOSER.size}` : ''
    if (markup) downloadSvg(`${selected.identifier || selected.name}-${mode}${suffix}.svg`, markup)
  }

  const exportSvgLayers = () => {
    if (!selected) return
    const { card, glyph, components } = buildIconLayers(selected, mode)
    const base = `${selected.identifier || selected.name}-${mode}`
    if (card) downloadSvg(`${base}-card.svg`, card)
    if (glyph) downloadSvg(`${base}-glyph.svg`, glyph)
    for (const component of components) {
      if (component.markup) downloadSvg(`${base}-${component.id}.svg`, component.markup)
    }
  }

  const nav: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: 'library', label: 'Library', icon: <LayoutGrid size={15} /> },
    { id: 'design', label: 'Design', icon: <Pencil size={15} /> },
  ]

  const studio = workspace === 'studio'
  const isLibrary = studio && section === 'library'
  const zoomValue = studio ? (isLibrary ? zoom : designZoom) : groupZoom
  const zoomRange = studio ? (isLibrary ? { min: 0.5, max: 2, step: 0.05 } : { min: 0.2, max: 10, step: 0.1 }) : { min: 0.6, max: 2.4, step: 0.1 }
  const zoomFill = ((zoomValue - zoomRange.min) / (zoomRange.max - zoomRange.min)) * 100

  const setZoomValue = (value: number) => {
    if (!studio) setGroupZoom(value)
    else if (isLibrary) setZoom(value)
    else setDesignZoom(value)
  }

  return (
    <div className={`app h-full w-full dark:text-neutral-100 ${dark ? 'dark' : ''}`}>
      <div className="flex h-full w-full overflow-hidden bg-[#f7f7f8] dark:bg-[#232325]">
            <div className={`flex shrink-0 flex-col ${showSidebar ? 'w-[228px]' : 'w-0'}`}>
              {showSidebar ? (
                <>
                  <div className="flex h-11 shrink-0 items-center px-4">
                    <ToolButton title="Hide sidebar" onClick={() => setShowSidebar(false)}>
                      <PanelLeft size={15} />
                    </ToolButton>
                  </div>

                  {studio ? (
                    <nav className="flex flex-col gap-0.5 px-2 pt-2">
                      {nav.map((item) => {
                        const active = item.id === section
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSection(item.id)}
                            className={`flex h-[30px] items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors ${
                              active
                                ? 'bg-[#007aff]/10 font-medium text-[#007aff] dark:bg-[#0a84ff]/20 dark:text-[#409cff]'
                                : 'text-neutral-700 hover:bg-black/[0.05] dark:text-neutral-300 dark:hover:bg-white/[0.06]'
                            }`}
                          >
                            {item.icon}
                            {item.label}
                            {saving ? (
                              <span className="ml-auto rounded-[5px] bg-[#007aff]/12 px-1.5 py-px text-[10px] font-medium text-[#007aff] dark:bg-[#0a84ff]/20 dark:text-[#409cff]">
                                Saving
                              </span>
                            ) : null}
                          </button>
                        )
                      })}
                    </nav>
                  ) : (
                    <ComposerSidebar group={group} icons={icons} onPatch={patchGroup} />
                  )}
                </>
              ) : null}
            </div>

            <main className="relative min-w-0 flex-1 border-x border-black/[0.07] bg-white dark:border-white/[0.06] dark:bg-[#1c1c1e]">
              <div
                className={`absolute inset-0 pt-11 ${isLibrary ? 'overflow-y-auto' : 'overflow-hidden'}`}
              >
                {!studio ? (
                  <ComposerCanvas
                    group={group}
                    icons={icons}
                    mode={mode}
                    zoom={groupZoom}
                    onZoom={setGroupZoom}
                  />
                ) : isLibrary ? (
                  <Library
                    icons={icons}
                    selectedId={selectedId}
                    mode={mode}
                    zoom={zoom}
                    onSelect={setSelectedId}
                  />
                ) : (
                  <Design
                    icon={selected}
                    mode={mode}
                    sizes={preset.sizes}
                    size={size}
                    zoom={designZoom}
                    layout={designLayout}
                    editing={editPoints}
                    onEditPoint={editArtworkPoint}
                    onEditMetrics={editMetrics}
                    onMoveLabel={moveLabel}
                    onSizeChange={changeSize}
                  />
                )}
              </div>

              <header className="absolute inset-x-0 top-0 grid h-11 grid-cols-[1fr_auto_1fr] items-center gap-2 overflow-x-auto bg-white/60 px-3 backdrop-blur-xl dark:bg-[#1c1c1e]/60">
                <div className="flex items-center gap-2">
                  {!showSidebar ? (
                    <ToolButton title="Show sidebar" onClick={() => setShowSidebar(true)}>
                      <PanelLeft size={15} />
                    </ToolButton>
                  ) : null}
                  <div className="flex items-center gap-0.5">
                    <ToolButton title="Undo" disabled={!canUndo} onClick={undoEdit}>
                      <Undo2 size={15} />
                    </ToolButton>
                    <ToolButton title="Redo" disabled={!canRedo} onClick={redoEdit}>
                      <Redo2 size={15} />
                    </ToolButton>
                  </div>
                  <Segmented
                    tone="neutral"
                    value={mode}
                    onChange={setMode}
                    options={[
                      { value: 'light', icon: <Sun size={14} />, title: 'Light appearance' },
                      { value: 'dark', icon: <Moon size={14} />, title: 'Dark appearance' },
                    ]}
                  />
                </div>
                {/* Equal side columns keep the switcher centred; the header scrolls when it no longer fits. */}
                <Segmented
                  tone="neutral"
                  value={workspace}
                  onChange={setWorkspace}
                  options={[
                    { value: 'studio', label: 'Studio' },
                    { value: 'composer', label: 'Composer' },
                  ]}
                />
                <div className="flex items-center justify-end gap-0.5">
                  {studio ? (
                    isLibrary ? (
                      <ToolButton title="Add icon" onClick={addIcon}>
                        <Plus size={15} />
                      </ToolButton>
                    ) : (
                      <>
                        {selected?.artwork ? (
                          <ToolButton
                            title={editPoints ? 'Stop editing the artwork points' : 'Edit the artwork points'}
                            active={editPoints}
                            onClick={() => setEditPoints((value) => !value)}
                          >
                            <Spline size={15} />
                          </ToolButton>
                        ) : null}
                        <ToolButton
                          title="Hero preview"
                          active={designLayout === 'hero'}
                          onClick={() => setDesignLayout('hero')}
                        >
                          <Rows3 size={15} />
                        </ToolButton>
                        <ToolButton
                          title="All sizes"
                          active={designLayout === 'grid'}
                          onClick={() => setDesignLayout('grid')}
                        >
                          <Grid2x2 size={15} />
                        </ToolButton>
                      </>
                    )
                  ) : null}
                  {studio ? (
                    <>
                      <ToolButton
                        title={`Export ${selected?.identifier ?? 'icon'} (${mode} mode) as SVG`}
                        onClick={() => exportSvg()}
                      >
                        <Download size={15} />
                      </ToolButton>
                      <ToolButton
                        title={`Export ${selected?.identifier ?? 'icon'} for Icon Composer (${ICON_COMPOSER.size} × ${ICON_COMPOSER.size})`}
                        onClick={() => exportSvg(true)}
                      >
                        <AppWindow size={15} />
                      </ToolButton>
                    </>
                  ) : null}
                  {studio ? (
                    <ToolButton
                      title={`Export ${selected?.identifier ?? 'icon'} as layers (card, glyph and a file per component)`}
                      onClick={exportSvgLayers}
                    >
                      <Layers size={15} />
                    </ToolButton>
                  ) : null}
                  <ToolButton
                    title="Toggle inspector"
                    active={showInspector}
                    onClick={() => setShowInspector((value) => !value)}
                  >
                    <PanelRight size={15} />
                  </ToolButton>
                </div>
              </header>

              {studio ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                  <div className="pointer-events-auto flex w-[240px] items-center gap-2 rounded-full bg-white/70 px-3 py-2 shadow-[0_2px_10px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.06] backdrop-blur-xl dark:bg-white/[0.12] dark:ring-white/10">
                    <input
                      type="range"
                      className="slider w-full"
                      min={zoomRange.min}
                      max={zoomRange.max}
                      step={zoomRange.step}
                      value={zoomValue}
                      style={{ '--fill': `${zoomFill}%` } as React.CSSProperties}
                      onChange={(event) => setZoomValue(Number(event.target.value))}
                    />
                  </div>
                  <button
                    type="button"
                    title="Fit"
                    aria-label="Fit"
                    onClick={() => (isLibrary ? setZoom(1) : setDesignZoom(zoomFor(size, 5)))}
                    className="pointer-events-auto grid size-[32px] place-items-center rounded-full bg-white/70 text-neutral-600 shadow-[0_2px_10px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.06] backdrop-blur-xl dark:bg-white/[0.12] dark:text-neutral-200 dark:ring-white/10"
                  >
                    <Scaling size={14} />
                  </button>
                </div>
              ) : null}
            </main>

            {showInspector ? (
              <aside className="flex w-[264px] shrink-0 flex-col bg-[#f7f7f8] dark:bg-[#232325]">
                {!studio ? (
                  <ComposerInspector
                    group={group}
                    tab={composerTab}
                    onTab={setComposerTab}
                    onPatch={patchGroup}
                  />
                ) : isLibrary ? (
                  <LibraryInspector
                    icon={selected}
                    mode={mode}
                    onPatch={patchIcon}
                    onReplaceSvg={replaceSvg}
                    onDelete={deleteIcon}
                  />
                ) : (
                  <DesignInspector
                    icon={selected}
                    mode={mode}
                    tab={tab}
                    presetId={presetId}
                    onTabChange={setTab}
                    onPresetChange={changePreset}
                    onPatch={patchIcon}
                    onPatchAppearance={patchAppearance}
                    onAddLabel={addLabel}
                    onPatchLabel={patchLabel}
                    onRemoveLabel={removeLabel}
                    onReset={resetDesign}
                  />
                )}
              </aside>
            ) : null}
      </div>
    </div>
  )
}
