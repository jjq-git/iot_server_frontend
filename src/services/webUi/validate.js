const Ajv2020Module = require('ajv/dist/2020')
const schema = require('./contracts/web-ui-document.v1.schema.json')
const capabilities = require('./contracts/capabilities.v1.json')

const Ajv2020 = Ajv2020Module.default || Ajv2020Module
const schemaValidator = new Ajv2020({ allErrors: true, strict: true }).compile(schema)
const encoder = new TextEncoder()
const comparisonOperators = new Set(['eq', 'not_eq', 'gt', 'ge', 'lt', 'le'])
const widgetTypes = new Set(Object.keys(capabilities.widgets))
const styleProperties = new Set(capabilities.styleProperties)
const flags = new Set(capabilities.flags)
const states = new Set(capabilities.states)
const events = new Set(capabilities.events)
const subjectTypes = new Set(capabilities.subjectTypes)
const actionIds = new Set(Object.keys(capabilities.actions))
const sha256Pattern = /^[0-9a-f]{64}$/

function pointerToPath (pointer) {
  if (!pointer) return '(root)'
  return pointer
    .split('/')
    .slice(1)
    .map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'))
    .reduce((path, part) => /^\d+$/.test(part) ? `${path}[${part}]` : path ? `${path}.${part}` : part, '')
}

function schemaIssuePath (error) {
  let path = pointerToPath(error.instancePath)
  if (error.keyword === 'required' && error.params.missingProperty) {
    path = path === '(root)' ? error.params.missingProperty : `${path}.${error.params.missingProperty}`
  }
  if (error.keyword === 'additionalProperties' && error.params.additionalProperty) {
    path = path === '(root)' ? error.params.additionalProperty : `${path}.${error.params.additionalProperty}`
  }
  return path
}

function issue (path, code, message) {
  return { path, code, message }
}

function canonicalValue (value, ancestors) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('canonical JSON only accepts finite numbers')
    return value
  }
  if (typeof value !== 'object') throw new TypeError(`canonical JSON does not accept ${typeof value}`)
  if (ancestors.has(value)) throw new TypeError('canonical JSON does not accept circular values')

  ancestors.add(value)
  let result
  if (Array.isArray(value)) {
    result = value.map(item => canonicalValue(item, ancestors))
  } else {
    result = {}
    Object.keys(value).sort().forEach(key => {
      if (value[key] === undefined) throw new TypeError('canonical JSON does not accept undefined')
      result[key] = canonicalValue(value[key], ancestors)
    })
  }
  ancestors.delete(value)
  return result
}

function canonicalJson (value) {
  return JSON.stringify(canonicalValue(value, new Set()))
}

function mediaTypeFor (kind, fileName) {
  const extension = String(fileName).toLowerCase().split('.').pop() || ''
  const known = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    gif: 'image/gif',
    bmp: 'image/bmp',
    json: 'application/json',
    ttf: 'font/ttf',
    otf: 'font/otf',
    woff: 'font/woff',
    woff2: 'font/woff2'
  }
  return known[extension] || 'application/octet-stream'
}

function expectedAssetManifest (project) {
  const groups = [
    ['font', project.assets.fonts],
    ['image', project.assets.images],
    ['icon', project.assets.icons]
  ]
  return groups.flatMap(([kind, assets]) => assets.map(asset => ({
    assetId: asset.id,
    kind,
    fileName: asset.file.fileName,
    mediaType: mediaTypeFor(kind, asset.file.fileName),
    sha256: asset.file.sha256,
    byteSize: asset.file.byteSize
  }))).sort((left, right) => {
    const a = `${left.kind}\0${left.assetId}`
    const b = `${right.kind}\0${right.assetId}`
    return a < b ? -1 : a > b ? 1 : 0
  })
}

function validateStyleProps (props, path, errors) {
  Object.keys(props).forEach(key => {
    if (!styleProperties.has(key)) {
      errors.push(issue(`${path}.${key}`, 'unsupported_style_property', `Unsupported style property "${key}"`))
    }
  })
}

function scanDocument (value, path, errors) {
  if (typeof value === 'string') {
    if (encoder.encode(value).byteLength > capabilities.limits.maxStringBytes) {
      errors.push(issue(path || '(root)', 'string_too_large', 'String exceeds the WebUiDocumentV1 limit'))
    }
    if (/<\s*(script|iframe|object|embed)\b/i.test(value) || /javascript\s*:/i.test(value)) {
      errors.push(issue(path || '(root)', 'dangerous_content', 'Executable content is forbidden'))
    }
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanDocument(item, `${path}[${index}]`, errors))
  } else if (value !== null && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => scanDocument(item, path ? `${path}.${key}` : key, errors))
  }
}

function semanticIssues (document) {
  const errors = []
  const project = document.uiProject
  const limits = capabilities.limits

  if (document.source.projectId !== project.meta.id) {
    errors.push(issue('source.projectId', 'source_mismatch', 'source.projectId must match uiProject.meta.id'))
  }
  if (document.source.revision !== project.meta.revision) {
    errors.push(issue('source.revision', 'source_mismatch', 'source.revision must match uiProject.meta.revision'))
  }
  const displayRef = `${document.displayProfile.id}@${document.displayProfile.revision}`
  if (project.designDisplayRef !== displayRef) {
    errors.push(issue('displayProfile', 'display_profile_mismatch', 'Display profile does not match designDisplayRef'))
  }

  const subjectIds = new Set()
  project.subjects.forEach((subject, index) => {
    if (subjectIds.has(subject.id)) errors.push(issue(`uiProject.subjects[${index}].id`, 'duplicate_id', 'Duplicate subject id'))
    subjectIds.add(subject.id)
    if (!subjectTypes.has(subject.type)) errors.push(issue(`uiProject.subjects[${index}].type`, 'unsupported_subject', 'Unsupported subject type'))
  })

  const projectStyleIds = new Set()
  project.styles.forEach((style, index) => {
    if (projectStyleIds.has(style.id)) errors.push(issue(`uiProject.styles[${index}].id`, 'duplicate_id', 'Duplicate style id'))
    projectStyleIds.add(style.id)
    validateStyleProps(style.props, `uiProject.styles[${index}].props`, errors)
  })

  const referencedActions = new Set()
  const nodeIds = new Set()
  let nodeCount = 0

  function walkNode (node, path, depth, availableStyleIds) {
    nodeCount += 1
    if (nodeIds.has(node.id)) errors.push(issue(`${path}.id`, 'duplicate_id', 'Duplicate node id'))
    nodeIds.add(node.id)
    if (!widgetTypes.has(node.type)) {
      errors.push(issue(`${path}.type`, 'unsupported_widget', `Unsupported widget "${node.type}"`))
    }
    if (depth > limits.maxDepth) errors.push(issue(path, 'max_depth_exceeded', 'Widget tree is too deep'))
    if (node.children.length > limits.maxChildrenPerNode) {
      errors.push(issue(`${path}.children`, 'max_children_exceeded', 'Widget has too many children'))
    }

    const widget = capabilities.widgets[node.type]
    if (widget) {
      const allowedProps = new Set(widget.props)
      Object.keys(node.props).forEach(key => {
        if (!allowedProps.has(key)) {
          errors.push(issue(`${path}.props.${key}`, 'unsupported_widget_property', `Widget "${node.type}" does not support "${key}"`))
        }
      })
      if (!widget.acceptsWidgetChildren && node.children.length > 0) {
        errors.push(issue(`${path}.children`, 'unsupported_widget_children', `Widget "${node.type}" cannot contain widgets`))
      }
    }

    Object.keys(node.flags || {}).forEach(key => {
      if (!flags.has(key)) errors.push(issue(`${path}.flags.${key}`, 'unsupported_flag', `Unsupported flag "${key}"`))
    })
    Object.keys(node.states || {}).forEach(key => {
      if (!states.has(key)) errors.push(issue(`${path}.states.${key}`, 'unsupported_state', `Unsupported state "${key}"`))
    })
    node.styleRefs.forEach((styleRef, index) => {
      if (!availableStyleIds.has(styleRef.styleId)) {
        errors.push(issue(`${path}.styleRefs[${index}].styleId`, 'style_missing', `Unknown style "${styleRef.styleId}"`))
      }
    })
    node.styles.forEach((style, index) => validateStyleProps(style.props, `${path}.styles[${index}].props`, errors))

    node.bindings.forEach((binding, index) => {
      const bindingPath = `${path}.bindings[${index}]`
      if (!subjectIds.has(binding.subject)) errors.push(issue(`${bindingPath}.subject`, 'subject_missing', 'Unknown binding subject'))
      if (binding.kind === 'prop' && widget && !widget.bindableProps.includes(binding.prop)) {
        errors.push(issue(`${bindingPath}.prop`, 'unsupported_binding_property', `Unsupported binding property "${binding.prop}"`))
      }
      if (binding.kind === 'flag') {
        if (!flags.has(binding.flag)) errors.push(issue(`${bindingPath}.flag`, 'unsupported_flag', 'Unsupported binding flag'))
        if (!comparisonOperators.has(binding.op)) errors.push(issue(`${bindingPath}.op`, 'unsupported_comparison', 'Unsupported binding comparison'))
      }
      if (binding.kind === 'state') {
        if (!states.has(binding.state)) errors.push(issue(`${bindingPath}.state`, 'unsupported_state', 'Unsupported binding state'))
        if (!comparisonOperators.has(binding.op)) errors.push(issue(`${bindingPath}.op`, 'unsupported_comparison', 'Unsupported binding comparison'))
      }
      if (binding.kind === 'style' && !availableStyleIds.has(binding.styleId)) {
        errors.push(issue(`${bindingPath}.styleId`, 'style_missing', 'Unknown binding style'))
      }
    })

    node.events.forEach((event, index) => {
      const eventPath = `${path}.events[${index}]`
      referencedActions.add(event.action)
      if (!events.has(event.on)) errors.push(issue(`${eventPath}.on`, 'unsupported_event', `Unsupported event "${event.on}"`))
      if (!actionIds.has(event.action)) errors.push(issue(`${eventPath}.action`, 'unsupported_action', `Unsupported action "${event.action}"`))
    })
    node.children.forEach((child, index) => walkNode(child, `${path}.children[${index}]`, depth + 1, availableStyleIds))
  }

  const screenIds = new Set()
  project.screens.forEach((screen, screenIndex) => {
    const screenPath = `uiProject.screens[${screenIndex}]`
    if (screenIds.has(screen.id)) errors.push(issue(`${screenPath}.id`, 'duplicate_id', 'Duplicate screen id'))
    screenIds.add(screen.id)
    const screenStyleIds = new Set(projectStyleIds)
    screen.styles.forEach((style, styleIndex) => {
      if (screenStyleIds.has(style.id)) errors.push(issue(`${screenPath}.styles[${styleIndex}].id`, 'duplicate_id', 'Duplicate style id'))
      screenStyleIds.add(style.id)
      validateStyleProps(style.props, `${screenPath}.styles[${styleIndex}].props`, errors)
    })
    if (screen.root.type !== 'obj') errors.push(issue(`${screenPath}.root.type`, 'invalid_screen_root', 'Screen root must be obj'))
    walkNode(screen.root, `${screenPath}.root`, 1, screenStyleIds)
  })

  if (nodeCount > limits.maxNodes) errors.push(issue('uiProject', 'max_nodes_exceeded', 'Document has too many widgets'))
  if (project.screens.length > limits.maxScreens) errors.push(issue('uiProject.screens', 'max_screens_exceeded', 'Document has too many screens'))
  if (project.components.length > 0) errors.push(issue('uiProject.components', 'unsupported_component', 'Custom components are not supported in V1'))

  referencedActions.forEach(id => {
    if (!document.actionRegistry[id]) errors.push(issue('actionRegistry', 'action_missing', `Missing referenced action "${id}"`))
  })
  Object.entries(document.actionRegistry).forEach(([id, action]) => {
    if (!referencedActions.has(id)) errors.push(issue(`actionRegistry.${id}`, 'action_not_referenced', `Action "${id}" is not referenced`))
    if (!actionIds.has(id)) errors.push(issue(`actionRegistry.${id}`, 'unsupported_action', `Unsupported action "${id}"`))
    else if (canonicalJson(action) !== canonicalJson(capabilities.actions[id])) {
      errors.push(issue(`actionRegistry.${id}`, 'action_contract_mismatch', `Action "${id}" differs from the frozen contract`))
    }
  })
  if (Object.keys(document.actionRegistry).length > limits.maxActions) {
    errors.push(issue('actionRegistry', 'max_actions_exceeded', 'Document has too many actions'))
  }

  const expectedAssets = expectedAssetManifest(project)
  if (canonicalJson(expectedAssets) !== canonicalJson(document.assetManifest)) {
    errors.push(issue('assetManifest', 'asset_manifest_mismatch', 'Asset manifest does not match uiProject.assets'))
  }
  const assetKeys = new Set()
  let totalAssetBytes = 0
  document.assetManifest.forEach((asset, index) => {
    const path = `assetManifest[${index}]`
    const key = `${asset.kind}:${asset.assetId}`
    if (assetKeys.has(key)) errors.push(issue(path, 'duplicate_asset', `Duplicate asset "${key}"`))
    assetKeys.add(key)
    if (!sha256Pattern.test(asset.sha256)) errors.push(issue(`${path}.sha256`, 'asset_hash_invalid', 'Invalid asset SHA-256'))
    if (asset.fileName.includes('/') || asset.fileName.includes('\\') || asset.fileName === '.' || asset.fileName === '..') {
      errors.push(issue(`${path}.fileName`, 'asset_filename_invalid', 'Asset fileName must be a basename'))
    }
    if (asset.byteSize > limits.maxAssetBytes) errors.push(issue(`${path}.byteSize`, 'asset_too_large', 'Asset exceeds the size limit'))
    totalAssetBytes += asset.byteSize
  })
  if (document.assetManifest.length > limits.maxAssets) errors.push(issue('assetManifest', 'max_assets_exceeded', 'Too many assets'))
  if (totalAssetBytes > limits.maxTotalAssetBytes) errors.push(issue('assetManifest', 'total_assets_too_large', 'Assets exceed the total size limit'))

  scanDocument(document, '', errors)
  if (encoder.encode(canonicalJson(document)).byteLength > limits.maxJsonBytes) {
    errors.push(issue('(root)', 'document_too_large', 'Document exceeds the canonical JSON size limit'))
  }
  return errors
}

function validateWebUiDocument (raw) {
  if (!schemaValidator(raw)) {
    return {
      valid: false,
      errors: schemaValidator.errors.map(error => issue(schemaIssuePath(error), 'schema_invalid', error.message || 'Schema validation failed')),
      warnings: []
    }
  }
  const errors = semanticIssues(raw)
  return { valid: errors.length === 0, errors, warnings: [] }
}

module.exports = {
  WEB_UI_CAPABILITIES_V1: capabilities,
  canonicalJson,
  validateWebUiDocument
}
