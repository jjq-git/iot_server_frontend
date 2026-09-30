import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const boundaries = [
  {
    view: 'src/views/HnModels.vue',
    workspace: 'src/mixins/hnModelListWorkspace.js',
    components: ['src/components/hn-model/HnModelListSection.vue']
  },
  {
    view: 'src/views/FileManager.vue',
    workspace: 'src/mixins/fileManagerListWorkspace.js',
    components: [
      'src/components/file/FileStatsOverview.vue',
      'src/components/file/FileListSection.vue'
    ]
  },
  {
    view: 'src/views/PodModels.vue',
    workspace: 'src/mixins/podModelListWorkspace.js',
    components: ['src/components/pod-model/PodModelListSection.vue']
  }
]

test('large views keep orchestration, business sections and page styles in separate files', () => {
  boundaries.forEach(({ view, workspace, components }) => {
    const viewSource = fs.readFileSync(path.join(root, view), 'utf8')
    const workspaceSource = fs.readFileSync(path.join(root, workspace), 'utf8')
    const workspaceName = path.basename(workspace, '.js')

    assert.match(viewSource, /from ['"]@\/api(?:\/|['"])/, `${view} must keep resource orchestration explicit`)
    assert.match(viewSource, new RegExp(`import\\s+${workspaceName}\\s+from`), `${view} must import ${workspaceName}`)
    assert.match(viewSource, new RegExp(`mixins\\s*:\\s*\\[[^\\]]*${workspaceName}`), `${view} must register ${workspaceName}`)
    assert.match(viewSource, /<style\b[^>]*\bsrc=/, `${view} must load its page style from a dedicated file`)
    assert.doesNotMatch(viewSource, /<style\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/style>/, `${view} must not grow another inline style block`)
    assert.match(workspaceSource, /from ['"]@\/api(?:\/|['"])/, `${workspace} must own its list API dependency`)
    assert.match(workspaceSource, /\bquery\s*:/, `${workspace} must own query state`)
    assert.match(workspaceSource, /async fetchData\s*\(/, `${workspace} must own list loading`)

    components.forEach(component => {
      const componentName = path.basename(component, '.vue')
      const componentSource = fs.readFileSync(path.join(root, component), 'utf8')
      assert.match(viewSource, new RegExp(`import\\s+${componentName}\\s+from`), `${view} must import ${componentName}`)
      assert.doesNotMatch(componentSource, /from ['"]@\/api\//, `${component} must receive business data through props`)
      assert.match(componentSource, /\bprops\s*:/, `${component} must declare its input contract`)
    })
  })
})
