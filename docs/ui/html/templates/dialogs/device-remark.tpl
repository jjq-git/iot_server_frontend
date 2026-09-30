<!-- .tpl prevents Live Server from injecting reload scripts into fetched partials. -->
<!-- Handoff: 编辑设备备注——hosts.remark / nodes.remark 自由文本。PUT /api/v1/hosts|nodes/{id} 只改 remark。主机、节点共用此弹窗。 -->
<dialog class="modal modal--wide" id="device-remark-dialog" aria-labelledby="device-remark-title">
  <form method="dialog" data-remark-form>
    <header class="modal__header">
      <div><h2 id="device-remark-title">编辑备注</h2><p data-remark-title>—</p></div>
      <button class="icon-button modal__close" value="cancel" formnovalidate aria-label="关闭" title="关闭"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-x"></use></svg></button>
    </header>
    <div class="modal__body form-grid">
      <label class="form-field form-field--full"><span>备注（remark）</span><textarea name="remark" class="form-textarea" data-remark-input rows="4" placeholder="设备备注（选填）"></textarea></label>
    </div>
    <footer class="modal__footer"><button class="button button--secondary" value="cancel" formnovalidate>取消</button><button class="button button--primary" value="confirm">保存</button></footer>
  </form>
</dialog>
