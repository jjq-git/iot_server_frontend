function cloneRuntime (runtime) {
  return {
    activeScreenId: runtime.activeScreenId,
    history: [...runtime.history],
    subjects: { ...runtime.subjects }
  }
}

function createWebUiRuntime (ir) {
  return {
    activeScreenId: ir.homeScreenId,
    history: [],
    subjects: { ...ir.initialSubjects }
  }
}

function coerceSubjectValue (definition, value) {
  if (definition.type === 'string' || definition.type === 'color') return String(value)
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return definition.initial
  const bounded = Math.max(definition.min ?? numeric, Math.min(definition.max ?? numeric, numeric))
  return definition.type === 'int' ? Math.trunc(bounded) : bounded
}

function openScreen (ir, runtime, screenId) {
  if (!ir.screenIndex[screenId]) return runtime
  const next = cloneRuntime(runtime)
  if (next.activeScreenId !== screenId) next.history.push(next.activeScreenId)
  next.activeScreenId = screenId
  return next
}

function executeWebUiAction (ir, runtime, actionId, args = {}) {
  if (!ir.actionRegistry[actionId]) return runtime
  if (actionId === 'screen.open' || actionId === 'screen.create') return openScreen(ir, runtime, args.screen)
  if (actionId === 'screen.back') {
    if (runtime.history.length === 0) return runtime
    const next = cloneRuntime(runtime)
    next.activeScreenId = next.history.pop()
    return next
  }

  const definition = ir.subjectIndex[args.subject]
  if (!definition) return runtime
  const next = cloneRuntime(runtime)
  const current = next.subjects[definition.id]

  if (actionId === 'subject.set') {
    next.subjects[definition.id] = coerceSubjectValue(definition, args.value)
  } else if (actionId === 'subject.toggle') {
    next.subjects[definition.id] = definition.type === 'string' || definition.type === 'color'
      ? current
      : coerceSubjectValue(definition, Number(current) === 0 ? 1 : 0)
  } else if (actionId === 'subject.increment') {
    const step = Number.isFinite(Number(args.step)) ? Number(args.step) : 1
    const minimum = Number.isFinite(Number(args.min)) ? Number(args.min) : definition.min
    const maximum = Number.isFinite(Number(args.max)) ? Number(args.max) : definition.max
    let value = Number(current) + step
    if (args.rollover === true && Number.isFinite(minimum) && Number.isFinite(maximum)) {
      if (value > maximum) value = minimum
      else if (value < minimum) value = maximum
    }
    next.subjects[definition.id] = coerceSubjectValue({ ...definition, min: minimum, max: maximum }, value)
  }
  return next
}

module.exports = {
  createWebUiRuntime,
  executeWebUiAction
}
