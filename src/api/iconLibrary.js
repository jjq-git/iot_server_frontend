import http from './http'

export const getIconLibrary = () => http.get('/icon-library')

export const getIconLibraryAvailability = () => http.get('/icon-library/availability')

export const createIcon = payload => http.post('/icon-library', payload)

export const updateIcon = (name, payload) => http.put(`/icon-library/${name}`, payload)

export const deleteIcon = name => http.delete(`/icon-library/${name}`, {
  headers: { 'X-Confirm-Delete': name }
})

export const generateIconLibrary = () => http.post('/icon-library/generate')
