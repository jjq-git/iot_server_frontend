<!-- .tpl prevents Live Server from injecting reload scripts into fetched partials. -->
<!-- Handoff: request GET /api/v1/files in the current company scope. Upload uses POST /api/v1/files/upload; write actions require a writable company and an authorized role. -->
<div class="company-panel__heading">
  <div><h3>文件资料</h3><p>管理本公司的共享文档、证书和图片。</p></div>
  <input type="file" data-company-file-input accept=".pdf,.txt,.md,.csv,.json,.xml,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.png,.jpg,.jpeg,.webp" hidden>
  <button class="button button--secondary button--icon-only" type="button" data-action="upload-company-file" data-file-write-action aria-label="上传文件" title="上传文件">
    <svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-upload"></use></svg>
  </button>
</div>

<section class="content-card company-files-card" aria-label="公司文件资料列表">
  <form class="filter-bar" action="#" data-company-file-filter>
    <label class="search-field">
      <span class="sr-only">搜索文件资料</span>
      <svg class="app-icon app-icon--fill" aria-hidden="true"><use href="icons.svg#icon-search"></use></svg>
      <input type="search" placeholder="搜索文件名称" data-company-file-search>
    </label>
    <label class="select-field">
      <span class="sr-only">文件类型</span>
      <select data-company-file-type><option value="">全部类型</option><option value="document">文档</option><option value="certificate">证书</option><option value="image">图片</option><option value="archive">压缩包</option></select>
      <svg class="app-icon app-icon--fill select-field__icon" aria-hidden="true"><use href="icons.svg#icon-chevron-down"></use></svg>
    </label>
  </form>

  <div class="table-scroll company-files-table" role="region" aria-label="文件资料列表，可横向滚动" tabindex="0">
    <table data-sortable-table>
      <thead><tr><th scope="col" aria-sort="none"><button class="table-sort" type="button" aria-label="按文件名称排序"><span>文件名称</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th><th scope="col" aria-sort="none"><button class="table-sort" type="button" aria-label="按类型排序"><span>类型</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th><th scope="col">格式</th><th scope="col" aria-sort="none"><button class="table-sort" type="button" data-sort-type="number" aria-label="按文件大小排序"><span>大小</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th><th scope="col" aria-sort="none"><button class="table-sort" type="button" data-sort-type="date" aria-label="按上传时间排序"><span>上传时间</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th><th scope="col" class="table-actions">操作</th></tr></thead>
      <tbody>
        <tr data-company-file-row data-search="产品使用手册 2026 pdf" data-file-type="document"><td><span class="company-file-name"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-box-seam"></use></svg><strong>产品使用手册 2026.pdf</strong></span></td><td>文档</td><td>PDF</td><td data-sort-value="4823449">4.6 MB</td><td>2026-08-28 14:32</td><td class="table-actions"><button class="icon-button table-action-button" type="button" data-action="view-company-file" data-file-name="产品使用手册 2026.pdf" aria-label="查看产品使用手册 2026" title="查看"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-eye"></use></svg></button><button class="icon-button table-action-button" type="button" data-action="delete-company-file" data-file-write-action data-file-name="产品使用手册 2026.pdf" aria-label="删除产品使用手册 2026" title="删除"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-trash"></use></svg></button></td></tr>
        <tr data-company-file-row data-search="企业资质证书 certificate pdf" data-file-type="certificate"><td><span class="company-file-name"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-box-seam"></use></svg><strong>企业资质证书.pdf</strong></span></td><td>证书</td><td>PDF</td><td data-sort-value="1866465">1.8 MB</td><td>2026-07-16 09:18</td><td class="table-actions"><button class="icon-button table-action-button" type="button" data-action="view-company-file" data-file-name="企业资质证书.pdf" aria-label="查看企业资质证书" title="查看"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-eye"></use></svg></button><button class="icon-button table-action-button" type="button" data-action="delete-company-file" data-file-write-action data-file-name="企业资质证书.pdf" aria-label="删除企业资质证书" title="删除"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-trash"></use></svg></button></td></tr>
        <tr data-company-file-row data-search="公司品牌图片 brand image png" data-file-type="image"><td><span class="company-file-name"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-box-seam"></use></svg><strong>公司品牌图片.png</strong></span></td><td>图片</td><td>PNG</td><td data-sort-value="829440">810 KB</td><td>2026-06-05 11:46</td><td class="table-actions"><button class="icon-button table-action-button" type="button" data-action="view-company-file" data-file-name="公司品牌图片.png" aria-label="查看公司品牌图片" title="查看"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-eye"></use></svg></button><button class="icon-button table-action-button" type="button" data-action="delete-company-file" data-file-write-action data-file-name="公司品牌图片.png" aria-label="删除公司品牌图片" title="删除"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-trash"></use></svg></button></td></tr>
        <tr data-company-file-row data-search="技术资料归档 archive zip" data-file-type="archive"><td><span class="company-file-name"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-box-seam"></use></svg><strong>技术资料归档.zip</strong></span></td><td>压缩包</td><td>ZIP</td><td data-sort-value="12897485">12.3 MB</td><td>2026-04-22 16:05</td><td class="table-actions"><button class="icon-button table-action-button" type="button" data-action="view-company-file" data-file-name="技术资料归档.zip" aria-label="查看技术资料归档" title="查看"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-eye"></use></svg></button><button class="icon-button table-action-button" type="button" data-action="delete-company-file" data-file-write-action data-file-name="技术资料归档.zip" aria-label="删除技术资料归档" title="删除"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-trash"></use></svg></button></td></tr>
        <tr class="company-files-empty" data-company-files-empty data-sort-ignore hidden><td colspan="6">没有符合条件的文件资料</td></tr>
      </tbody>
    </table>
  </div>
  <footer class="content-card__footer"><span data-company-file-count>第 1–4 条，共 4 条</span><nav class="pagination" aria-label="文件资料分页"><button type="button" disabled aria-label="上一页"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-chevron-left"></use></svg></button><button class="is-current" type="button" aria-current="page">1</button><button type="button" disabled aria-label="下一页"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-chevron-right"></use></svg></button></nav></footer>
</section>
