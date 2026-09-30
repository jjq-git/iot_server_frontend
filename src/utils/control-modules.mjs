export function expandControlModules (modules = []) {
  const cards = []

  for (const module of Array.isArray(modules) ? modules : []) {
    const moduleKey = module.device_model_uuid || String(module.device_model_id || 'module')
    const instances = Array.isArray(module.instances) ? module.instances : []

    instances.forEach((instance, index) => {
      cards.push({
        key: `${moduleKey}:${instance.device_uuid || index}`,
        module,
        instance,
        bound: true
      })
    })

    const expectedQuantity = Math.max(Number(module.quantity) || 0, instances.length ? 0 : 1)
    const missingQuantity = Math.max(0, expectedQuantity - instances.length)
    for (let index = 0; index < missingQuantity; index += 1) {
      cards.push({
        key: `${moduleKey}:unbound:${index}`,
        module: { ...module, bound: false, instances: [] },
        instance: null,
        bound: false
      })
    }
  }

  return cards
}
