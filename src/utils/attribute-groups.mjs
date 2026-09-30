export const buildAttributeGroups = (items, searchQuery = '', ungroupedLabel = '') => {
  const query = String(searchQuery || '').trim().toLowerCase()
  const groups = new Map()

  items.forEach(item => {
    const category = String(item.category || '').trim()
    const groupName = String(item.group_name || '').trim()
    const key = category || groupName || '__ungrouped__'

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        category,
        name: groupName || category || ungroupedLabel,
        items: []
      })
    }
    groups.get(key).items.push(item)
  })

  return Array.from(groups.values()).reduce((result, group) => {
    const groupMatches = query && `${group.name} ${group.category}`.toLowerCase().includes(query)
    const matchedItems = !query || groupMatches
      ? group.items
      : group.items.filter(item => [
        item.co_index,
        item.co_sub_index,
        item.attr_name,
        item.attr_code
      ].some(value => String(value || '').toLowerCase().includes(query)))

    if (matchedItems.length) result.push({ ...group, items: matchedItems })
    return result
  }, [])
}
